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

import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { BRAIN_DB } from "./db.js";
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

function writeVector(db: Conn, id: number, vec: number[]): void {
  const rowid = BigInt(id);
  const embedding = toBlob(vec);
  try {
    db.prepare("INSERT INTO vec_chunks(rowid, embedding) VALUES (?, ?)").run(rowid, embedding);
  } catch (error) {
    if (!isVecPrimaryKeyConflict(error)) throw error;
    // vec0 does not support a conflict-aware REPLACE path here; repair by updating
    // the existing row so backfill can resume if another writer already filled it.
    db.prepare("UPDATE vec_chunks SET embedding = ? WHERE rowid = ?").run(embedding, rowid);
  }
}

export interface EmbedPendingResult {
  embedded: number; // vectors written this pass
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
  const dbPath = opts.dbPath ?? BRAIN_DB;
  const limit = opts.limit ?? 500;
  const batchSize = Math.max(1, opts.batchSize ?? 4);
  const db = vecConnect(dbPath);
  try {
    const has = tableExists(db);
    const rows = db
      .prepare(
        `SELECT id, content FROM messages
         WHERE content IS NOT NULL AND content != ''
           ${has ? "AND NOT EXISTS (SELECT 1 FROM vec_chunks WHERE vec_chunks.rowid = messages.id)" : ""}
         ORDER BY length(content) ASC, id ASC LIMIT ?`,
      )
      .all(limit) as { id: number; content: string }[];

    let dims: number | null = null;
    let embedded = 0;
    const ins = (id: number, vec: number[]): void => {
      if (dims === null) {
        dims = vec.length;
        ensureVecTable(db, dims);
      }
      writeVector(db, id, vec);
      embedded++;
    };
    let done = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const vectors = await embedBatch(batch.map((r) => r.content.slice(0, 6000))); // cap long tool output
      for (let j = 0; j < batch.length; j++) {
        const r = batch[j];
        const v = vectors[j];
        if (v) ins(r.id, v);
        done++;
        opts.onProgress?.({ done, total: rows.length, embedded, currentId: r.id });
      }
    }

    let remaining = 0;
    if (tableExists(db)) {
      remaining = (
        db
          .prepare(
            "SELECT count(*) c FROM messages WHERE content IS NOT NULL AND content!='' AND NOT EXISTS (SELECT 1 FROM vec_chunks WHERE vec_chunks.rowid = messages.id)",
          )
          .get() as { c: number }
      ).c;
    } else {
      remaining = (db.prepare("SELECT count(*) c FROM messages WHERE content IS NOT NULL AND content!=''").get() as { c: number }).c;
    }
    return { embedded, remaining, dims };
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
    const dbPath = opts.dbPath ?? BRAIN_DB;
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
export function vectorCount(dbPath: string = BRAIN_DB): number {
  const db = vecConnect(dbPath);
  try {
    if (!tableExists(db)) return 0;
    return (db.prepare("SELECT count(*) c FROM vec_chunks").get() as { c: number }).c;
  } finally {
    db.close();
  }
}

/** How many non-empty messages still need an embedding. */
export function vectorRemaining(dbPath: string = BRAIN_DB): number {
  const db = vecConnect(dbPath);
  try {
    if (!tableExists(db)) {
      return (db.prepare("SELECT count(*) c FROM messages WHERE content IS NOT NULL AND content!=''").get() as { c: number }).c;
    }
    return (
      db
        .prepare("SELECT count(*) c FROM messages WHERE content IS NOT NULL AND content!='' AND id NOT IN (SELECT rowid FROM vec_chunks)")
        .get() as { c: number }
    ).c;
  } finally {
    db.close();
  }
}
