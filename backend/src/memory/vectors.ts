// Vector lane for hybrid recall (docs/plan/05_rag.md, Giai đoạn B). Stores
// embeddings in a sqlite-vec `vec0` table INSIDE global_memory.db — same file,
// derived index (rebuildable). FTS stays the baseline; this only adds a
// semantic stream that the RRF fuser in search.ts blends in.
//
// Notes from probing sqlite-vec 0.1.9: rowid MUST be bound as BigInt (a plain JS
// number binds as REAL and is rejected); embedding binds as a Float32 BLOB; KNN
// is `... WHERE embedding MATCH ? ORDER BY distance LIMIT ?`.
//
// Embedding is a SEPARATE incremental pass (`embedPending` / `zemory memory
// embed`), NOT part of the Stop-hook capture — capture stays fast and offline.
//
// LONG MESSAGES are split into overlapping windows so their tail is visible to
// semantic search (it always was to FTS). Chunk 0 keeps rowid = message id (all
// existing invariants and vectors stay valid); chunks 1+ get synthetic rowids
// (>= SYNTH_BASE, far above any message id) recorded in `vec_map` so KNN hits
// resolve back to their message.
//
// The index records the EMBED DTYPE it was built with too (vec_config.dtype): q8 and
// fp32 vectors of the same model are close but NOT identical, so an index built with
// one must keep being fed by that one. Pre-column indexes read as q8 (the old default).
//
// The index also records the EMBED PROFILE it was built with (vec_config.profile,
// see embed.ts): prefixed and bare vectors live in different spaces, so both the
// document and the query side always follow the STORED profile. Pre-profile
// indexes read as "raw" and keep working unchanged; switching profiles is
// `zemory memory embed --rebuild`.

import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { currentMemoryDb } from "./db.js";
import { getEmbedTools } from "../config/settings.js";
import {
  currentEmbedProfile,
  embedConfig,
  embedDocBatch,
  embedQuery,
  sliceNormalize,
  targetEmbedDims,
  useEmbedDtype,
  type EmbedProfile,
} from "./embed.js";

type Conn = Database.Database;

const CHUNK_CHARS = 6000; // window size — same value as the old hard cap
const CHUNK_STEP = 5500; // 500-char overlap between consecutive windows
const MAX_CHUNKS = 8; // cap pathological mega-messages (~44.5k chars covered)
const SYNTH_BASE = 2 ** 40; // synthetic rowids for chunks 1+ (message ids never get near this)

/** A memory connection with the sqlite-vec extension loaded. Exported so callers
 *  elsewhere (e.g. VACUUM, which must resolve the vec0 module to recreate the
 *  virtual table's shadow tables in the rebuilt file) don't reimplement this. */
export function vecConnect(dbPath: string): Conn {
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
//
// 🔴 NHƯNG "gần như không có giá trị ngữ nghĩa" chỉ đúng với PHẦN LỚN, không phải tất cả —
// đo thành phần lớp này 2026-08-09 (62.284 tin): `Read` 10.863 tin dài trung bình **117 ký
// tự** (một đường dẫn — nhúng thành 768 chiều là vô nghĩa, FTS word khớp tốt hơn) · `Bash`
// 17.162 + `PowerShell` 7.652 là lệnh shell (token literal) · **29% cả lớp dưới 200 ký tự**.
// Nhưng `Edit` 16.215 (avg 1.233, mang cả `old_string`/`new_string`) và `Write` 3.350 (avg
// 3.201, mang NGUYÊN nội dung file) là **code thật** — chất liệu ngữ nghĩa đúng nghĩa.
//
// Phép thử trong RAM (khuôn dims-test, pool 326 tin trong đó 218 tin tool làm nhiễu CÙNG
// HẠNG): nhúng `Edit`+`Write` đưa lớp `tool_use` từ **0% tuyệt đối** lên `@1` 57% · `@10`
// 100% (MRR 0 → 0,672), và nhóm truy vấn gõ-nguyên-văn lên `@1` 50% (MRR 0,015 → 0,615).
// ⚠ Pool nhỏ nên số tuyệt đối bị thổi lên — chỉ đọc như phép so A/B, không so với kho thật.
//
// Vì vậy cờ nay nhận DANH SÁCH tên tool, để embed đúng 19.565 tin đáng nhúng (~9–16 giờ,
// ~60 MB) thay vì cả 62.284 tin (gấp ~3 lần công cho phần lớn là đường dẫn và lệnh).
//   ZEMORY_EMBED_TOOLS=1            → mọi tin tool (nếp cũ, giữ nguyên)
//   ZEMORY_EMBED_TOOLS=Edit,Write   → chỉ các tool nêu tên
function embedToolNames(): string[] | "all" | null {
  // Thứ tự: env (đường thử một lần) → config (đường CHÍNH, bền qua tiến trình).
  // Trước 2026-08-12 chỉ có env, nên phạm vi chết theo cửa sổ terminal và tin tool mới
  // âm thầm không được nhúng — xem getEmbedTools() để biết nhịp rò đo được.
  const raw = process.env.ZEMORY_EMBED_TOOLS?.trim() || getEmbedTools().join(",");
  if (!raw) return null;
  if (raw === "1" || raw.toLowerCase() === "all") return "all";
  const names = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return names.length ? names : null;
}

const EMBEDDABLE = (): string => {
  const want = embedToolNames();
  if (want === "all") return "";
  if (!want) return " AND tool_name IS NULL";
  // Tên tool đến từ env nên KHÔNG nội suy thẳng vào SQL: lọc còn ký tự an toàn rồi mới ghép
  // (cùng kỷ luật "SQL 1 cách" của 02_RULES — không rải chuỗi người dùng vào câu lệnh).
  const safe = want.filter((n) => /^[A-Za-z0-9_-]{1,40}$/.test(n)).map((n) => `'${n}'`);
  if (!safe.length) return " AND tool_name IS NULL";
  return ` AND (tool_name IS NULL OR tool_name IN (${safe.join(",")}))`;
};

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

// Every profile the reader accepts. An unknown string reads as "raw" ON PURPOSE — that is what
// pre-profile indexes are — but a profile we DO ship must be listed here, or its index would
// read as raw and get mean-pooled by a model that needs CLS: right shape, wrong space, no error.
const KNOWN_PROFILES: readonly EmbedProfile[] = ["gemma-prompt-v1", "bge-m3-v1"];

/** Profile the existing index was built with; pre-profile indexes are "raw". */
function storedProfile(db: Conn): EmbedProfile {
  try {
    const row = db.prepare("SELECT * FROM vec_config LIMIT 1").get() as { profile?: unknown } | undefined;
    if (!row) return currentEmbedProfile();
    const found = KNOWN_PROFILES.find((p) => p === row.profile);
    return found ?? "raw";
  } catch {
    return currentEmbedProfile(); // no vec_config yet — a new index gets the current profile
  }
}

// Indexes built before vec_config had a `dtype` column were built under the OLD
// default, q8. Reading NULL as "whatever is configured today" would silently feed
// fp32 vectors into a q8-built index — the exact mixing this column exists to stop.
const LEGACY_DTYPE = "q8";

/** Dtype the existing index was built with; null when there is no index yet. */
function storedDtype(db: Conn): string | null {
  try {
    const row = db.prepare("SELECT * FROM vec_config LIMIT 1").get() as { dtype?: unknown } | undefined;
    if (!row) return null;
    return typeof row.dtype === "string" && row.dtype ? row.dtype : LEGACY_DTYPE;
  } catch {
    return null; // no vec_config yet — a new index adopts the current config
  }
}

/** Dims the existing index was built with (Matryoshka-sliced); else the target for ITS profile. */
function storedDims(db: Conn): number {
  try {
    const row = db.prepare("SELECT dims FROM vec_config LIMIT 1").get() as { dims: number } | undefined;
    // A brand-new index must be sized for the profile it is about to be built under (BGE 1024,
    // Gemma 768) — passing no profile here would size every new index the Gemma way.
    return row?.dims ?? targetEmbedDims(storedProfile(db));
  } catch {
    return targetEmbedDims(currentEmbedProfile()); // no vec_config yet
  }
}

/** The profile of the vector index at dbPath (observability + tests). */
export function vectorIndexProfile(dbPath: string = currentMemoryDb()): EmbedProfile {
  const db = vecConnect(dbPath);
  try {
    return storedProfile(db);
  } finally {
    db.close();
  }
}

/** Profile + dims of the vector index at dbPath (observability + tests). */
export function vectorIndexInfo(dbPath: string = currentMemoryDb()): { profile: EmbedProfile; dims: number; dtype: string } {
  const db = vecConnect(dbPath);
  try {
    return { profile: storedProfile(db), dims: storedDims(db), dtype: storedDtype(db) ?? embedConfig().dtype };
  } finally {
    db.close();
  }
}

/** Create the vec0 table sized to `dims` (once). Records dims + profile for mismatch checks. */
function ensureVecTable(db: Conn, dims: number, profile: EmbedProfile): void {
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[${dims}])`);
  db.exec("CREATE TABLE IF NOT EXISTS vec_config (dims INTEGER NOT NULL)");
  for (const col of ["profile TEXT", "dtype TEXT"]) {
    try {
      db.exec(`ALTER TABLE vec_config ADD COLUMN ${col}`);
    } catch {
      /* column already there */
    }
  }
  if (!db.prepare("SELECT dims FROM vec_config LIMIT 1").get()) {
    db.prepare("INSERT INTO vec_config(dims, profile, dtype) VALUES (?, ?, ?)").run(dims, profile, embedConfig().dtype);
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
  const dbPath = opts.dbPath ?? currentMemoryDb();
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

    // Documents are embedded under the profile AND dims the index was BUILT with — never mix
    // spaces. The contract lives in vec_config, so ASK vec_config: the three stored* readers
    // already fall back to the current config when there is no contract yet.
    //
    // These used to be gated on `has` (does the vec_chunks TABLE exist), which quietly ignored
    // a vec_config that was stamped BEFORE the first embed — exactly how a store is prepared
    // when switching models (plan 19 §3: drop index → stamp contract → embed). Measured
    // 2026-08-19 on the parallel BGE store: contract said {1024, bge-m3-v1, int8} while the
    // run reported dims 768 and used Gemma. A 20-message smoke test caught it; the same bug
    // in the 44-hour full run would have produced a completely wrong index, silently.
    const profile = storedProfile(db);
    const dimsTarget = storedDims(db);
    useEmbedDtype(storedDtype(db));

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

    // MỘT giao dịch cho cả bộ ba `vec_map` → `vec_chunks` → `vec_hash`.
    //
    // Vì sao: ba lệnh này từng là ba autocommit RIÊNG, mà `vec_map` lại được ghi TRƯỚC vector.
    // Khe giữa chúng (tiến trình khác ghi xen, hoặc bị kill) để lại `vec_map` trỏ vào vector
    // chưa tồn tại. Bọc chung thì hoặc có đủ ba, hoặc không có gì.
    //
    // ⚠ ĐÍNH CHÍNH (2026-08-03e): tôi từng ghi ở đây rằng sự cố hỏng DB là BẰNG CHỨNG cho lỗi
    // này, viện dẫn "vec_hash 119.784 vs vec_chunks 142.840". SAI — `vec_hash` **điền dần**
    // theo thiết kế (xem `ensureHashTable`), chênh lệch đó là bình thường. Vật chứng cho thấy
    // **toàn bộ bảng vector còn LÀNH**; hỏng nằm ở cây bóng FTS5. Sửa này đúng về nguyên tắc
    // (SQLite: nhiều bảng đổi cùng lúc thì phải một giao dịch) nhưng KHÔNG do sự cố đó chứng
    // minh. Đừng dùng nó làm lý lẽ.
    const insTx = db.transaction((messageId: number, seq: number, blob: Buffer, key: string | null): number => {
      const rowid = targetRowid(messageId, seq);
      writeVectorRaw(db, rowid, blob);
      if (key !== null) hashPut.run(key, rowid);
      return rowid;
    });

    /** Đường CHÉP LẠI (dedup): không gọi model, nhưng vẫn ghi map + vector ⇒ vẫn phải bọc. */
    const copyTx = db.transaction((messageId: number, seq: number, blob: Buffer): void => {
      writeVectorRaw(db, targetRowid(messageId, seq), blob);
    });

    const ins = (messageId: number, seq: number, vec: number[], key: string | null = null): number => {
      if (dims === null) {
        dims = vec.length;
        ensureVecTable(db, dims, profile); // DDL: phải nằm NGOÀI giao dịch ghi
      }
      const rowid = insTx(messageId, seq, toBlob(vec), key);
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
          copyTx(r.id, seq, blob); // cùng một giao dịch: map + vector đi chung
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
        const v = vectors[j] ? sliceNormalize(vectors[j] as number[], dimsTarget) : null;
        if (v) {
          // `key` đi CÙNG giao dịch — trước đây `hashPut` chạy sau, tách rời, nên một lần
          // kill đúng khe đó để lại vector không có hash (hoặc ngược lại).
          seenThisRun.set(r.key, ins(r.messageId, r.seq, v, r.key));
        }
        if (r.seq === 0) tick(r.messageId);
      }
    }
    // In-run twins of the rows above: copy now that their canonical is embedded.
    for (const d of dupsOfQueued) {
      const cid = seenThisRun.get(d.key);
      const blob = cid != null ? vectorOf(db, cid) : null;
      if (blob) {
        copyTx(d.messageId, d.seq, blob);
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
  /**
   * Khoảng cách cosine tới truy vấn (0 = trùng khớp, càng lớn càng xa). Chỉ có khi chỉ mục
   * vector trả được — cần cho cổng "không biết" (plan 17 §1.3): thứ hạng nói *cái nào gần
   * nhất*, còn khoảng cách mới nói *có cái nào đủ gần hay không*. Hai câu hỏi khác nhau, và
   * chỉ câu thứ hai phân biệt được "kho có đáp án" với "kho chẳng có gì mà vẫn xếp hạng".
   */
  dist?: number;
}

/**
 * KNN over the vector index → message ids ranked by similarity, shaped for RRF
 * fusion (same {rowid, rank} contract as the FTS streams). Chunk hits resolve
 * to their owning message and duplicates collapse to the best rank. Returns []
 * when the query can't be embedded or no vectors exist (fail-open → FTS-only).
 */
export interface VectorProbe {
  ranks: VecRank[];
  /** Vector của TRUY VẤN, đã cắt đúng dims của chỉ mục — để người gọi chấm lại ứng viên mà
   *  KHÔNG phải nhúng lần hai (lớp trộn cosine ở `search.ts` dùng nó). */
  qv?: Float32Array;
}

/** Như `vectorRanks` nhưng trả kèm vector truy vấn (tránh nhúng hai lần cho cùng một câu). */
export async function vectorProbe(query: string, opts: { dbPath?: string; pool?: number } = {}): Promise<VectorProbe> {
  const ranks = await vectorRanks(query, opts, lastQueryVector);
  return { ranks, qv: lastQueryVector.v };
}

/** Ô nhớ một-chỗ để `vectorRanks` trả vector truy vấn ra ngoài mà không đổi chữ ký công khai. */
const lastQueryVector: { v?: Float32Array } = {};

export async function vectorRanks(
  query: string,
  opts: { dbPath?: string; pool?: number } = {},
  out?: { v?: Float32Array },
): Promise<VecRank[]> {
  // Fully fail-open: embed failure, missing sqlite-vec, or no table → [] (FTS-only).
  try {
    const dbPath = opts.dbPath ?? currentMemoryDb();
    let profile: EmbedProfile;
    let dims: number;
    {
      const probe = vecConnect(dbPath);
      try {
        if (!tableExists(probe)) return [];
        // The query MUST live in the index's space: same prompt profile, same dims.
        profile = storedProfile(probe);
        dims = storedDims(probe);
        useEmbedDtype(storedDtype(probe));
      } finally {
        probe.close();
      }
    }
    const raw = await embedQuery(query, profile);
    if (!raw) return [];
    const qv = sliceNormalize(raw, dims);
    if (out) out.v = Float32Array.from(qv);
    const db = vecConnect(dbPath);
    try {
      if (!tableExists(db)) return [];
      const pool = opts.pool ?? 60;
      // Over-fetch: several chunks of one long message can occupy KNN slots
      // before collapsing to a single message below.
      const rows = db
        .prepare("SELECT rowid, distance FROM vec_chunks WHERE embedding MATCH ? ORDER BY distance LIMIT ?")
        .all(toBlob(qv), pool * 2) as { rowid: number; distance: number }[];
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
        out.push({ rowid: id, rank: out.length, dist: r.distance });
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

/**
 * Vector của một nhóm message, để so tin-với-tin (gộp near-duplicate — plan 17 §1.2).
 *
 * Chỉ đọc hàng CHÍNH của mỗi tin (`rowid = messages.id`), KHÔNG đi qua `vec_map`: cửa sổ
 * chồng lấn của một tin dài không phải "tin khác", đưa vào chỉ làm nhiễu phép so. Tin nào
 * không có vector thì KHÔNG có mặt trong Map — người gọi phải coi đó là "đứng riêng"
 * (fail-open, điều 9), tuyệt đối không suy ra là "giống nhau".
 */
export function vectorsByRowid(ids: number[], dbPath: string = currentMemoryDb()): Map<number, Float32Array> {
  const out = new Map<number, Float32Array>();
  if (!ids.length) return out;
  try {
    const db = vecConnect(dbPath);
    try {
      if (!tableExists(db)) return out;
      const dims = storedDims(db);
      const get = db.prepare("SELECT embedding FROM vec_chunks WHERE rowid = ?");
      for (const id of ids) {
        const row = get.get(id) as { embedding: Buffer } | undefined;
        if (row?.embedding && row.embedding.byteLength >= dims * 4) {
          out.set(id, new Float32Array(row.embedding.buffer, row.embedding.byteOffset, dims));
        }
      }
    } finally {
      db.close();
    }
  } catch {
    /* thiếu sqlite-vec / bảng chưa có ⇒ Map rỗng: mọi tin đứng riêng, recall không vỡ */
  }
  return out;
}

/** How many vectors are stored (chunks count individually). */
export function vectorCount(dbPath: string = currentMemoryDb()): number {
  const db = vecConnect(dbPath);
  try {
    if (!tableExists(db)) return 0;
    return (db.prepare("SELECT count(*) c FROM vec_chunks").get() as { c: number }).c;
  } finally {
    db.close();
  }
}

/** How many non-empty EMBEDDABLE messages still need an embedding. */
/**
 * Coverage ĐO ĐÚNG KHÁI NIỆM: bao nhiêu MESSAGE embed-được đã thật sự có vector.
 *
 * Vì sao cần hàm riêng thay vì chia hai con số sẵn có (điều 12 — không trưng số vô lý):
 *  · `vectorCount()` đếm HÀNG trong `vec_chunks`, mà một message dài bị chunk thành nhiều
 *    vector (rowid tổng hợp ≥ 2^40, ánh xạ qua `vec_map`) ⇒ lấy nó làm tử số thì vượt 100%
 *    (UI từng hiện **114,6%**).
 *  · Mẫu số cũng không phải "mọi message": khi `embedToolCalls()` tắt thì tool-message
 *    KHÔNG nằm trong diện embed, tính chúng vào mẫu số là tự bôi đen coverage.
 * Nên: tử = message embed-được CÓ vector (trực tiếp hoặc qua `vec_map`); mẫu = message
 * embed-được. Không bao giờ vượt 100%, và 100% nghĩa là "hết việc", đúng như nhãn UI.
 */
export function vectorCoverage(dbPath: string = currentMemoryDb()): { covered: number; embeddable: number } {
  const db = vecConnect(dbPath);
  try {
    const base = `FROM messages WHERE content IS NOT NULL AND content!=''${EMBEDDABLE()}`;
    const embeddable = (db.prepare(`SELECT count(*) c ${base}`).get() as { c: number }).c;
    if (!tableExists(db)) return { covered: 0, embeddable };
    // Dùng `IN (…UNION…)` chứ KHÔNG phải hai `EXISTS` tương quan. Hai EXISTS bắt SQLite
    // dò `vec_chunks` (bảng ảo vec0 — không có index rowid như bảng thường) MỘT LẦN CHO
    // MỖI HÀNG messages; đo trên DB thật 2026-07-27: **23,0 s**. Dạng IN cho nó dựng tập
    // id một lần rồi tra: **0,5 s — nhanh 46×, ĐÁP SỐ Y HỆT** (80.936 = 80.936, đã đối chứng).
    // Đây là đường nóng: dashboard gọi nó mỗi lần refresh `fresh=1`, nên 23 s biến thành
    // ~69 s chờ trước khi số Drive/Sources kịp nhảy sau một lần quét (user báo "kẹt rất lâu").
    const covered = (
      db
        .prepare(
          `SELECT count(*) c ${base} AND messages.id IN (` +
            `SELECT rowid FROM vec_chunks WHERE rowid < ${SYNTH_BASE} UNION SELECT message_id FROM vec_map)`,
        )
        .get() as { c: number }
    ).c;
    return { covered, embeddable };
  } finally {
    db.close();
  }
}

export function vectorRemaining(dbPath: string = currentMemoryDb()): number {
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
 * Bao nhiêu tin bị phạm vi hiện tại CỐ Ý bỏ qua (chưa có vector và sẽ không bao giờ có,
 * chừng nào phạm vi chưa đổi).
 *
 * 🔴 Vì sao phải có hàm này: `vectorRemaining()` đếm bằng **chính bộ lọc** dùng để chọn tin,
 * nên thứ nằm ngoài phạm vi không xuất hiện trong bất kỳ con số nào — `/memory-status` báo
 * `remaining 0 · coverage 100%` trong khi 19.620 tin không có vector và 146 tin vừa trôi ra
 * ngoài (đo 2026-08-12). Đồng hồ đo đúng cái nó định làm, và vì thế nó NÓI DỐI về cái nó
 * không định làm. Hai con số cạnh nhau thì "cố ý bỏ" phân biệt được với "chưa kịp làm" —
 * chính là ranh giới mà một con số đơn lẻ xoá mất.
 */
export function vectorOutOfScope(dbPath: string = currentMemoryDb()): number {
  const db = vecConnect(dbPath);
  try {
    const inScope = EMBEDDABLE();
    if (!inScope) return 0; // phạm vi = tất cả ⇒ không có gì bị bỏ
    const notInScope = `NOT (1=1${inScope})`;
    const base = `SELECT count(*) c FROM messages WHERE content IS NOT NULL AND content!='' AND ${notInScope}`;
    const sql = tableExists(db) ? `${base} AND id NOT IN (SELECT rowid FROM vec_chunks)` : base;
    return (db.prepare(sql).get() as { c: number }).c;
  } finally {
    db.close();
  }
}

/**
 * Drop the whole derived vector index (vectors, chunk map, dedup hashes, config)
 * so the next `embed --all` rebuilds it under the CURRENT embed profile. The
 * only way to switch profiles — mixed-space indexes are never allowed.
 */
export function dropVectorIndex(dbPath: string = currentMemoryDb()): void {
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
