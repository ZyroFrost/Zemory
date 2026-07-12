// Vector lane for hybrid recall (docs/plan/05_rag.md, Giai đoạn B). Stores
// embeddings in a sqlite-vec `vec0` table INSIDE global_memory.db — same file,
// derived index (rebuildable). FTS stays the baseline; this only adds a
// semantic stream that the RRF fuser in search.ts blends in.
//
// Notes from probing sqlite-vec 0.1.9: rowid MUST be bound as BigInt (a plain JS
// number binds as REAL and is rejected); embedding binds as a Float32 BLOB; KNN
// is `... WHERE embedding MATCH ? ORDER BY distance LIMIT ?`.
//
// Embedding is a SEPARATE incremental pass (`embedPending` / `zemory brain
// embed`), NOT part of the Stop-hook capture — capture stays fast and offline.
//
// LONG MESSAGES are split into overlapping windows so their tail is visible to
// semantic search (it always was to FTS). Chunk 0 keeps rowid = message id (all
// existing invariants and vectors stay valid); chunks 1+ get synthetic rowids
// (>= SYNTH_BASE, far above any message id) recorded in `vec_map` so KNN hits
// resolve back to their message.
//
// The index also records the EMBED PROFILE it was built with (vec_config.profile,
// see embed.ts): prefixed and bare vectors live in different spaces, so both the
// document and the query side always follow the STORED profile. Pre-profile
// indexes read as "raw" and keep working unchanged; switching profiles is
// `zemory brain embed --rebuild`.

import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { currentBrainDb } from "./db.js";
import { currentEmbedProfile, embedDocBatch, embedQuery, type EmbedProfile } from "./embed.js";

type Conn = Database.Database;

const CHUNK_CHARS = 6000; // window size — same value as the old hard cap
const CHUNK_STEP = 5500; // 500-char overlap between consecutive windows
const MAX_CHUNKS = 8; // cap pathological mega-messages (~44.5k chars covered)
const SYNTH_BASE = 2 ** 40; // synthetic rowids for chunks 1+ (message ids never get near this)

/** A brain connection with the sqlite-vec extension loaded. */
function vecConnect(dbPath: string): Conn {
  const db = new Database(dbPath);
  db.pragma("busy_timeout = 5000");
  sqliteVec.load(db);
  return db;
}

function tableExists(db: Conn, name = "vec_chunks"): boolean {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
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

// Chunk map for long messages: vec_chunks rowid (synthetic) → owning message.
function ensureMapTable(db: Conn): void {
  db.exec("CREATE TABLE IF NOT EXISTS vec_map (rowid INTEGER PRIMARY KEY, message_id INTEGER NOT NULL, seq INTEGER NOT NULL)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_vec_map_message ON vec_map(message_id)");
}

const contentKey = (text: string): string => createHash("sha1").update(text).digest("hex");

/** Overlapping windows over a long message; a short message is its own single chunk. */
function chunksOf(content: string): string[] {
  if (content.length <= CHUNK_CHARS) return [content];
  const out: string[] = [];
  for (let off = 0; off < content.length && out.length < MAX_CHUNKS; off += CHUNK_STEP) {
    out.push(content.slice(off, off + CHUNK_CHARS));
  }
  return out;
}

/** The stored vector at a rowid, or null (e.g. canonical row was forgotten). */
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

/** Profile the existing index was built with; pre-profile indexes are "raw". */
function storedProfile(db: Conn): EmbedProfile {
  try {
    const row = db.prepare("SELECT * FROM vec_config LIMIT 1").get() as { profile?: unknown } | undefined;
    if (!row) return currentEmbedProfile();
    return row.profile === "gemma-prompt-v1" ? "gemma-prompt-v1" : "raw";
  } catch {
    return currentEmbedProfile(); // no vec_config yet — a new index gets the current profile
  }
}

/** The profile of the vector index at dbPath (observability + tests). */
export function vectorIndexProfile(dbPath: string = currentBrainDb()): EmbedProfile {
  const db = vecConnect(dbPath);
  try {
    return storedProfile(db);
  } finally {
    db.close();
  }
}

/** Create the vec0 table sized to `dims` (once). Records dims + profile for mismatch checks. */
function ensureVecTable(db: Conn, dims: number, profile: EmbedProfile): void {
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[${dims}])`);
  db.exec("CREATE TABLE IF NOT EXISTS vec_config (dims INTEGER NOT NULL)");
  try {
    db.exec("ALTER TABLE vec_config ADD COLUMN profile TEXT");
  } catch {
    /* column already there */
  }
  if (!db.prepare("SELECT dims FROM vec_config LIMIT 1").get()) {
    db.prepare("INSERT INTO vec_config(dims, profile) VALUES (?, ?)").run(dims, profile);
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
  embedded: number; // vectors written this pass (a long message counts once per chunk)
  /** Of `embedded`, how many were COPIED from identical earlier content (no model call). */
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
    // "Pending" is keyed on the chunk-0 row (rowid = message id) — the invariant
    // every count/query in this file shares.
    const rows = db
      .prepare(
        `SELECT id, content FROM messages
         WHERE content IS NOT NULL AND content != ''${EMBEDDABLE()}
           ${has ? "AND NOT EXISTS (SELECT 1 FROM vec_chunks WHERE vec_chunks.rowid = messages.id)" : ""}
         ORDER BY length(content) ASC, id ASC LIMIT ?`,
      )
      .all(limit) as { id: number; content: string }[];

    // Documents are embedded under the profile the index was BUILT with — never
    // mix spaces. A brand-new index adopts the current profile.
    const profile = has ? storedProfile(db) : currentEmbedProfile();

    let dims: number | null = null;
    let embedded = 0;
    let deduped = 0;

    ensureHashTable(db);
    ensureMapTable(db);
    const hashGet = db.prepare("SELECT rowid FROM vec_hash WHERE hash = ?");
    const hashPut = db.prepare("INSERT OR REPLACE INTO vec_hash(hash, rowid) VALUES (?, ?)");
    const mapPut = db.prepare("INSERT OR REPLACE INTO vec_map(rowid, message_id, seq) VALUES (?, ?, ?)");
    let nextSynth = Math.max(
      SYNTH_BASE,
      (((db.prepare("SELECT max(rowid) m FROM vec_map").get() as { m: number | null }).m ?? 0) as number) + 1,
    );
    /** Rowid a chunk's vector is stored at; chunks 1+ claim a synthetic id + vec_map row. */
    const targetRowid = (messageId: number, seq: number): number => {
      if (seq === 0) return messageId;
      const rowid = nextSynth++;
      mapPut.run(rowid, messageId, seq);
      return rowid;
    };

    const ins = (messageId: number, seq: number, vec: number[]): number => {
      if (dims === null) {
        dims = vec.length;
        ensureVecTable(db, dims, profile);
      }
      const rowid = targetRowid(messageId, seq);
      writeVector(db, rowid, vec);
      embedded++;
      return rowid;
    };
    let done = 0;
    const tick = (id: number): void => {
      done++;
      opts.onProgress?.({ done, total: rows.length, embedded, currentId: id });
    };

    // Split candidates: content already embedded before (or earlier in this run)
    // gets its vector COPIED (identical text ⇒ identical vector, no model call);
    // only genuinely novel content goes through the model. Dedup applies PER
    // CHUNK, so repeated long messages copy every window.
    const seenThisRun = new Map<string, number>(); // hash → canonical rowid written this run
    const queued = new Set<string>();
    const pending: { messageId: number; seq: number; text: string; key: string }[] = [];
    const dupsOfQueued: { messageId: number; seq: number; key: string }[] = [];
    const clearOldChunks = db.prepare("DELETE FROM vec_map WHERE message_id = ?");
    for (const r of rows) {
      const chunks = chunksOf(r.content);
      if (chunks.length > 1) {
        // A crashed earlier run may have left chunk rows without chunk 0; drop
        // their map entries so this pass re-allocates cleanly (old vec rows are
        // orphans — harmless, pruned by pruneOrphanVectors / --rebuild).
        clearOldChunks.run(r.id);
      }
      // Chunks 1+ FIRST, chunk 0 LAST: the chunk-0 row marks the message done,
      // so a crash mid-message never silently skips the tail.
      for (let seq = chunks.length - 1; seq >= 0; seq--) {
        const text = chunks[seq];
        const key = contentKey(text);
        const canonical = (hashGet.get(key) as { rowid: number } | undefined)?.rowid;
        const blob = canonical != null && tableExists(db) ? vectorOf(db, canonical) : null;
        if (blob) {
          writeVectorRaw(db, targetRowid(r.id, seq), blob);
          embedded++;
          deduped++;
          if (seq === 0) tick(r.id);
        } else if (queued.has(key)) {
          dupsOfQueued.push({ messageId: r.id, seq, key }); // twin is in this run's model queue
        } else {
          queued.add(key);
          pending.push({ messageId: r.id, seq, text, key });
        }
      }
    }
    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize);
      const vectors = await embedDocBatch(
        batch.map((r) => r.text),
        profile,
      );
      for (let j = 0; j < batch.length; j++) {
        const r = batch[j];
        const v = vectors[j];
        if (v) {
          const rowid = ins(r.messageId, r.seq, v);
          hashPut.run(r.key, rowid);
          seenThisRun.set(r.key, rowid);
        }
        if (r.seq === 0) tick(r.messageId);
      }
    }
    // In-run twins of the rows above: copy now that their canonical is embedded.
    for (const d of dupsOfQueued) {
      const cid = seenThisRun.get(d.key);
      const blob = cid != null ? vectorOf(db, cid) : null;
      if (blob) {
        writeVectorRaw(db, targetRowid(d.messageId, d.seq), blob);
        embedded++;
        deduped++;
      } // else: canonical failed (fail-open) — the twin stays pending for the next pass
      if (d.seq === 0) tick(d.messageId);
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
 * fusion (same {rowid, rank} contract as the FTS streams). Chunk hits resolve
 * to their owning message and duplicates collapse to the best rank. Returns []
 * when the query can't be embedded or no vectors exist (fail-open → FTS-only).
 */
export async function vectorRanks(query: string, opts: { dbPath?: string; pool?: number } = {}): Promise<VecRank[]> {
  // Fully fail-open: embed failure, missing sqlite-vec, or no table → [] (FTS-only).
  try {
    const dbPath = opts.dbPath ?? currentBrainDb();
    let profile: EmbedProfile;
    {
      const probe = vecConnect(dbPath);
      try {
        if (!tableExists(probe)) return [];
        profile = storedProfile(probe); // the query MUST live in the index's space
      } finally {
        probe.close();
      }
    }
    const qv = await embedQuery(query, profile);
    if (!qv) return [];
    const db = vecConnect(dbPath);
    try {
      if (!tableExists(db)) return [];
      const pool = opts.pool ?? 60;
      // Over-fetch: several chunks of one long message can occupy KNN slots
      // before collapsing to a single message below.
      const rows = db
        .prepare("SELECT rowid FROM vec_chunks WHERE embedding MATCH ? ORDER BY distance LIMIT ?")
        .all(toBlob(qv), pool * 2) as { rowid: number }[];
      const hasMap = tableExists(db, "vec_map");
      const mapGet = hasMap ? db.prepare("SELECT message_id FROM vec_map WHERE rowid = ?") : null;
      const seen = new Set<number>();
      const out: VecRank[] = [];
      for (const r of rows) {
        let id = r.rowid;
        if (id >= SYNTH_BASE) {
          const m = mapGet?.get(id) as { message_id: number } | undefined;
          if (!m) continue; // orphan chunk (message forgotten) — skip
          id = m.message_id;
        }
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({ rowid: id, rank: out.length });
        if (out.length >= pool) break;
      }
      return out;
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

/** How many vectors are stored (chunks count individually). */
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

/**
 * Drop the whole derived vector index (vectors, chunk map, dedup hashes, config)
 * so the next `embed --all` rebuilds it under the CURRENT embed profile. The
 * only way to switch profiles — mixed-space indexes are never allowed.
 */
export function dropVectorIndex(dbPath: string = currentBrainDb()): void {
  const db = vecConnect(dbPath);
  try {
    db.exec("DROP TABLE IF EXISTS vec_chunks");
    db.exec("DROP TABLE IF EXISTS vec_map");
    db.exec("DROP TABLE IF EXISTS vec_hash");
    db.exec("DROP TABLE IF EXISTS vec_config");
  } finally {
    db.close();
  }
}

/**
 * Best-effort removal of vectors (incl. long-message chunk rows and dedup-hash
 * entries) for messages being forgotten. Runs on its OWN sqlite-vec-loaded
 * connection — the caller's plain connection cannot touch a vec0 table.
 * Fail-open: vectors are derived; leftovers are orphans, not data loss.
 */
export function forgetVectors(dbPath: string, messageIds: number[]): number {
  if (!messageIds.length) return 0;
  const db = vecConnect(dbPath);
  try {
    if (!tableExists(db)) return 0;
    ensureHashTable(db);
    ensureMapTable(db);
    let changes = 0;
    db.transaction(() => {
      db.exec("CREATE TEMP TABLE zemory_vec_forget(id INTEGER PRIMARY KEY)");
      const put = db.prepare("INSERT OR IGNORE INTO zemory_vec_forget(id) VALUES (?)");
      for (const id of messageIds) put.run(id);
      db.prepare(
        "DELETE FROM vec_hash WHERE rowid IN (SELECT id FROM zemory_vec_forget) OR rowid IN (SELECT rowid FROM vec_map WHERE message_id IN (SELECT id FROM zemory_vec_forget))",
      ).run();
      changes += db
        .prepare("DELETE FROM vec_chunks WHERE rowid IN (SELECT rowid FROM vec_map WHERE message_id IN (SELECT id FROM zemory_vec_forget))")
        .run().changes;
      db.prepare("DELETE FROM vec_map WHERE message_id IN (SELECT id FROM zemory_vec_forget)").run();
      changes += db.prepare("DELETE FROM vec_chunks WHERE rowid IN (SELECT id FROM zemory_vec_forget)").run().changes;
    })();
    return changes;
  } catch {
    return 0;
  } finally {
    db.close();
  }
}

/**
 * Drop vector rows whose message no longer exists (snapshot filtering before an
 * encrypted export). Fail-open — orphans are harmless (importer re-embeds).
 */
export function pruneOrphanVectors(dbPath: string): void {
  const db = vecConnect(dbPath);
  try {
    if (!tableExists(db)) return;
    ensureHashTable(db);
    ensureMapTable(db);
    db.prepare("DELETE FROM vec_map WHERE message_id NOT IN (SELECT id FROM messages)").run();
    db.prepare("DELETE FROM vec_chunks WHERE rowid NOT IN (SELECT id FROM messages) AND rowid NOT IN (SELECT rowid FROM vec_map)").run();
    db.prepare("DELETE FROM vec_hash WHERE rowid NOT IN (SELECT rowid FROM vec_chunks)").run();
  } catch {
    /* derived data — a failed prune only leaves harmless orphans */
  } finally {
    db.close();
  }
}
