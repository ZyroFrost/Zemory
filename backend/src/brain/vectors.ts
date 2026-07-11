// Vector lane for hybrid recall (docs/plan/05_rag.md, Giai đoạn B). Stores one
// embedding per message in a sqlite-vec `vec0` table INSIDE global_memory.db —
// same file, derived index (rebuildable). FTS stays the baseline; this only adds
// a semantic stream that the RRF fuser in search.ts blends in.
//
// Notes from probing sqlite-vec 0.1.9: rowid MUST be bound as BigInt (a plain JS
// number binds as REAL and is rejected); embedding binds as a Float32 BLOB; KNN
// is `... WHERE embedding MATCH ? ORDER BY distance LIMIT ?`.
//
// Embedding is a SEPARATE incremental pass (`embedPending` / `zemory brain
// embed`), NOT part of the Stop-hook capture — capture stays fast and offline.

import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { currentBrainDb } from "./db.js";
import { embed, embedBatch } from "./embed.js";

type Conn = Database.Database;

/** A brain connection with the sqlite-vec extension loaded. */
function vecConnect(dbPath: string): Conn {
  const db = new Database(dbPath);
  db.pragma("busy_timeout = 5000");
  sqliteVec.load(db);
  return db;
}

function tableExists(db: Conn): boolean {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vec_chunks'").get();
}

// Tool CALLS (tool_name set — a command + its args) carry almost no semantic
// value but are long and numerous (~1/3 of daily volume), so by default they are
// NOT embedded — FTS keyword search still covers them fully, and skipping them
// cuts the daily embed workload by a third. ZEMORY_EMBED_TOOLS=1 re-includes.
function embedToolCalls(): boolean {
  return process.env.ZEMORY_EMBED_TOOLS === "1";
}
const EMBEDDABLE = (): string => (embedToolCalls() ? "" : " AND tool_name IS NULL");

// DEDUP at the DERIVED layer (~21% of daily messages are exact repeats — injected
// rules/recall cards, re-read files). Identical content ⇒ the model would produce
// the IDENTICAL vector, so instead of re-running the model we COPY the vector from
// the first occurrence. Zero quality change; source messages are never touched.
// `vec_hash` (content-sha1 → canonical rowid) is derived + rebuildable: it fills
// lazily from now on (no heavy backfill), converging within days.
function ensureHashTable(db: Conn): void {
  db.exec("CREATE TABLE IF NOT EXISTS vec_hash (hash TEXT PRIMARY KEY, rowid INTEGER NOT NULL)");
}

const contentKey = (text: string): string => createHash("sha1").update(text).digest("hex");

/** The stored vector for a message id, or null (e.g. canonical row was forgotten). */
function vectorOf(db: Conn, id: number): Buffer | null {
  try {
    const row = db.prepare("SELECT embedding FROM vec_chunks WHERE rowid = ?").get(BigInt(id)) as
      | { embedding: Buffer }
      | undefined;
    return row?.embedding ?? null;
  } catch {
    return null;
  }
}

/** Create the vec0 table sized to `dims` (once). Records dims for mismatch checks. */
function ensureVecTable(db: Conn, dims: number): void {
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[${dims}])`);
  db.exec("CREATE TABLE IF NOT EXISTS vec_config (dims INTEGER NOT NULL)");
  if (!db.prepare("SELECT dims FROM vec_config LIMIT 1").get()) {
    db.prepare("INSERT INTO vec_config(dims) VALUES (?)").run(dims);
  }
}

const toBlob = (v: number[]): Buffer => Buffer.from(new Float32Array(v).buffer);

function isVecPrimaryKeyConflict(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "SqliteError" &&
    error.message.includes("UNIQUE constraint failed on vec_chunks primary key")
  );
}

function writeVectorRaw(db: Conn, id: number, embedding: Buffer): void {
  const rowid = BigInt(id);
  try {
    db.prepare("INSERT INTO vec_chunks(rowid, embedding) VALUES (?, ?)").run(rowid, embedding);
  } catch (error) {
    if (!isVecPrimaryKeyConflict(error)) throw error;
    // vec0 does not support a conflict-aware REPLACE path here; repair by updating
    // the existing row so backfill can resume if another writer already filled it.
    db.prepare("UPDATE vec_chunks SET embedding = ? WHERE rowid = ?").run(embedding, rowid);
  }
}

function writeVector(db: Conn, id: number, vec: number[]): void {
  writeVectorRaw(db, id, toBlob(vec));
}

export interface EmbedPendingResult {
  embedded: number; // vectors written this pass
  /** Of `embedded`, how many were COPIED from an identical earlier message (no model call). */
  deduped: number;
  remaining: number; // messages still without a vector
  dims: number | null;
}

export interface EmbedProgress {
  done: number;
  total: number;
  embedded: number;
  currentId: number;
}

/**
 * Embed messages that have no vector yet (incremental backfill). Run repeatedly
 * to catch up the whole corpus; cheap once caught up (only new messages).
 * Fail-open: a message whose embedding fails is skipped, not fatal.
 */
export async function embedPending(
  opts: { dbPath?: string; limit?: number; batchSize?: number; onProgress?: (progress: EmbedProgress) => void } = {},
): Promise<EmbedPendingResult> {
  const dbPath = opts.dbPath ?? currentBrainDb();
  const limit = opts.limit ?? 500;
  const batchSize = Math.max(1, opts.batchSize ?? 16);
  const db = vecConnect(dbPath);
  try {
    const has = tableExists(db);
    const rows = db
      .prepare(
        `SELECT id, content FROM messages
         WHERE content IS NOT NULL AND content != ''${EMBEDDABLE()}
           ${has ? "AND NOT EXISTS (SELECT 1 FROM vec_chunks WHERE vec_chunks.rowid = messages.id)" : ""}
         ORDER BY length(content) ASC, id ASC LIMIT ?`,
      )
      .all(limit) as { id: number; content: string }[];

    let dims: number | null = null;
    let embedded = 0;
    let deduped = 0;
    const ins = (id: number, vec: number[]): void => {
      if (dims === null) {
        dims = vec.length;
        ensureVecTable(db, dims);
      }
      writeVector(db, id, vec);
      embedded++;
    };
    let done = 0;
    const tick = (id: number): void => {
      done++;
      opts.onProgress?.({ done, total: rows.length, embedded, currentId: id });
    };

    // Split candidates: content already embedded before (or earlier in this run)
    // gets its vector COPIED (identical text ⇒ identical vector, no model call);
    // only genuinely novel content goes through the model.
    ensureHashTable(db);
    const hashGet = db.prepare("SELECT rowid FROM vec_hash WHERE hash = ?");
    const hashPut = db.prepare("INSERT OR REPLACE INTO vec_hash(hash, rowid) VALUES (?, ?)");
    const seenThisRun = new Map<string, number>(); // hash → canonical id embedded this run
    const queued = new Set<string>();
    const pending: { id: number; text: string; key: string }[] = [];
    const dupsOfQueued: { id: number; key: string }[] = [];
    for (const r of rows) {
      const text = r.content.slice(0, 6000); // cap long content (hash the SAME slice)
      const key = contentKey(text);
      const canonical = (hashGet.get(key) as { rowid: number } | undefined)?.rowid;
      const blob = canonical != null && tableExists(db) ? vectorOf(db, canonical) : null;
      if (blob) {
        writeVectorRaw(db, r.id, blob);
        embedded++;
        deduped++;
        tick(r.id);
      } else if (queued.has(key)) {
        dupsOfQueued.push({ id: r.id, key }); // twin is in this run's model queue
      } else {
        queued.add(key);
        pending.push({ id: r.id, text, key });
      }
    }
    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize);
      const vectors = await embedBatch(batch.map((r) => r.text));
      for (let j = 0; j < batch.length; j++) {
        const r = batch[j];
        const v = vectors[j];
        if (v) {
          ins(r.id, v);
          hashPut.run(r.key, r.id);
          seenThisRun.set(r.key, r.id);
        }
        tick(r.id);
      }
    }
    // In-run twins of the rows above: copy now that their canonical is embedded.
    for (const d of dupsOfQueued) {
      const cid = seenThisRun.get(d.key);
      const blob = cid != null ? vectorOf(db, cid) : null;
      if (blob) {
        writeVectorRaw(db, d.id, blob);
        embedded++;
        deduped++;
      } // else: canonical failed (fail-open) — the twin stays pending for the next pass
      tick(d.id);
    }

    let remaining = 0;
    if (tableExists(db)) {
      remaining = (
        db
          .prepare(
            `SELECT count(*) c FROM messages WHERE content IS NOT NULL AND content!=''${EMBEDDABLE()} AND NOT EXISTS (SELECT 1 FROM vec_chunks WHERE vec_chunks.rowid = messages.id)`,
          )
          .get() as { c: number }
      ).c;
    } else {
      remaining = (db.prepare(`SELECT count(*) c FROM messages WHERE content IS NOT NULL AND content!=''${EMBEDDABLE()}`).get() as { c: number }).c;
    }
    return { embedded, deduped, remaining, dims };
  } finally {
    db.close();
  }
}

export interface VecRank {
  rowid: number;
  rank: number;
}

/**
 * KNN over the vector index → message ids ranked by similarity, shaped for RRF
 * fusion (same {rowid, rank} contract as the FTS streams). Returns [] when the
 * query can't be embedded or no vectors exist (fail-open → FTS-only).
 */
export async function vectorRanks(query: string, opts: { dbPath?: string; pool?: number } = {}): Promise<VecRank[]> {
  // Fully fail-open: embed failure, missing sqlite-vec, or no table → [] (FTS-only).
  try {
    const dbPath = opts.dbPath ?? currentBrainDb();
    const probe = vecConnect(dbPath);
    try {
      if (!tableExists(probe)) return [];
    } finally {
      probe.close();
    }
    const qv = await embed(query);
    if (!qv) return [];
    const db = vecConnect(dbPath);
    try {
      if (!tableExists(db)) return [];
      const rows = db
        .prepare("SELECT rowid FROM vec_chunks WHERE embedding MATCH ? ORDER BY distance LIMIT ?")
        .all(toBlob(qv), opts.pool ?? 60) as { rowid: number }[];
      return rows.map((r, i) => ({ rowid: r.rowid, rank: i }));
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

/** How many message vectors are stored. */
export function vectorCount(dbPath: string = currentBrainDb()): number {
  const db = vecConnect(dbPath);
  try {
    if (!tableExists(db)) return 0;
    return (db.prepare("SELECT count(*) c FROM vec_chunks").get() as { c: number }).c;
  } finally {
    db.close();
  }
}

/** How many non-empty EMBEDDABLE messages still need an embedding. */
export function vectorRemaining(dbPath: string = currentBrainDb()): number {
  const db = vecConnect(dbPath);
  try {
    if (!tableExists(db)) {
      return (db.prepare(`SELECT count(*) c FROM messages WHERE content IS NOT NULL AND content!=''${EMBEDDABLE()}`).get() as { c: number }).c;
    }
    return (
      db
        .prepare(`SELECT count(*) c FROM messages WHERE content IS NOT NULL AND content!=''${EMBEDDABLE()} AND id NOT IN (SELECT rowid FROM vec_chunks)`)
        .get() as { c: number }
    ).c;
  } finally {
    db.close();
  }
}
