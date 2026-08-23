// Encrypted memory bundles for sharing <repo>/data/global_memory.db safely.
// The raw DB is sensitive; export writes one authenticated AES-GCM file and
// keeps the key out-of-band via --key-file or ZEMORY_SHARE_KEY.

import Database from "better-sqlite3";
import { appVersion } from "../core/config.js";
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { currentMemoryDb, currentMemoryDir, openMemory } from "./db.js";
import { scan } from "./ingest.js";
import { embedPending, pruneOrphanVectors, vectorRemaining } from "./vectors.js";
import { receiveVectorsFrom, shipVectorsInto } from "./vecship.js";
import { type ScopeLane, laneSqlClause } from "./scope.js";
import { type SyncLevel, getScopeExclude, getSyncAttachments, getSyncLevel } from "../config/settings.js";

const MAGIC = "ZEMORY-MEMORY-ENC v1\n";
const TAG_BYTES = 16;
const KDF = { n: 16384, r: 8, p: 1 };

export interface MemoryShareKeyOptions {
  keyFile?: string;
  env?: NodeJS.ProcessEnv;
}

/**
 * What the bundle carries.
 *  • "full" — a byte snapshot of the whole DB (v1 behaviour). Ships every derived
 *    layer (FTS + vector + digest ≈ 87% of the file) that `mergeMemoryBundle` then
 *    IGNORES — kept only for compatibility / disaster restore.
 *  • "rows" — SOURCE ROWS ONLY (sessions + messages + known_stores): exactly what
 *    merge reads. The receiver rebuilds FTS on insert and re-embeds locally
 *    (vectors are keyed by local ids and never travel anyway).
 */
export type BundlePayload = "full" | "rows";

export interface ExportMemoryBundleOptions extends MemoryShareKeyOptions {
  dbPath?: string;
  outPath: string;
  force?: boolean;
  /** Provenance lanes to leave OUT of the bundle (scoped sync). */
  excludeLanes?: ScopeLane[];
  /** Payload shape. Default "rows" (lean) — "full" only for a byte-for-byte copy. */
  payload?: BundlePayload;
  /**
   * DELTA: carry only messages newer than this local `messages.id` (plus the
   * sessions they belong to). Implies payload "rows". Merge is additive and
   * idempotent, so a delta grafts straight onto a receiver that already holds
   * the earlier rows.
   */
  sinceMessageId?: number;
}

export interface ExportMemoryBundleResult {
  outPath: string;
  sourcePath: string;
  sourceBytes: number;
  bundleBytes: number;
  payload: BundlePayload;
  /** rows payload only: what actually went in, and the new watermark. */
  rows?: { sessions: number; messages: number; since: number; maxMessageId: number };
  /** Vector chở kèm trong gói (HP điều 16). Trưng ra để một lượt chở HỤT lộ ngay ở bề mặt —
   *  lỗ 75% ngày 2026-08-12 sống sót được chính vì con số này không đi tới đâu cả. */
  vectorsShipped?: number;
  /** Hàng bị SQLite từ chối lúc nhét vào gói. Khác 0 là có chuyện, đừng bỏ qua. */
  vectorsRejected?: number;
}

export interface ImportMemoryBundleOptions extends MemoryShareKeyOptions {
  bundlePath: string;
  dbPath?: string;
  force?: boolean;
}

export interface ImportMemoryBundleResult {
  dbPath: string;
  bundlePath: string;
  bytes: number;
  backupPath: string | null;
}

interface BundleHeader {
  format: "zemory.memory.bundle";
  /** 1 = full-snapshot only (pre-2026-07). 2 = adds `payload`/`rows`. */
  version: 1 | 2;
  alg: "aes-256-gcm";
  kdf: { name: "scrypt"; n: number; r: number; p: number; salt: string };
  iv: string;
  createdAt: string;
  source: { name: string; bytes: number };
  /** v2+. Absent on a v1 bundle → treat as "full". */
  payload?: BundlePayload;
  /** v2+, rows payload: counts + watermark span carried by this bundle. */
  rows?: { sessions: number; messages: number; since: number; maxMessageId: number; host: string };
}

function readShareSecret(opts: MemoryShareKeyOptions): Buffer {
  const fromFile = opts.keyFile ? readFileSync(opts.keyFile, "utf8").trim() : "";
  const fromEnv = opts.env?.ZEMORY_SHARE_KEY?.trim() ?? process.env.ZEMORY_SHARE_KEY?.trim() ?? "";
  const secret = fromFile || fromEnv;
  if (!secret) {
    // Câu lỗi cũ chỉ kể tên hai CỜ mà không nói chìa phải nằm ở đâu, nên người dùng ở máy
    // thứ hai không biết bước kế tiếp là gì. Nay chỉ thẳng vào lệnh.
    throw new Error(
      [
        "Chưa có chìa share.",
        `  máy đầu tiên : zemory memory keygen        (sinh chìa mới → ${shareKeyPath()})`,
        "  máy thứ hai  : zemory memory key set      (nhập chìa từ máy đầu, đọc stdin)",
        "  hoặc         : --key-file <path> · biến ZEMORY_SHARE_KEY",
      ].join("\n"),
    );
  }
  return Buffer.from(secret, "utf8");
}

function deriveKey(secret: Buffer, salt: Buffer, kdf = KDF): Buffer {
  return scryptSync(secret, salt, 32, { N: kdf.n, r: kdf.r, p: kdf.p, maxmem: 64 * 1024 * 1024 });
}

async function snapshotSqlite(dbPath: string): Promise<{ path: string; cleanup: () => void }> {
  const dir = mkdtempSync(join(tmpdir(), "zemory-memory-export-"));
  const snapshot = join(dir, "global_memory.snapshot.db");
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    await db.backup(snapshot);
  } finally {
    db.close();
  }
  return { path: snapshot, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/**
 * Drop excluded lanes from a throwaway snapshot BEFORE it is encrypted, so a
 * scoped export never ships "shared" sessions. Deletes their messages first (FTS
 * delete triggers fire), then the sessions and any now-orphan vectors, and drops
 * the WAL so the file streams as a plain SQLite DB.
 */
function filterSnapshot(path: string, lanes: ScopeLane[]): void {
  const { match, params } = laneSqlClause("sessions", lanes);
  if (!match) return;
  const db = openMemory(path);
  try {
    db.transaction(() => {
      db.prepare(`DELETE FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE ${match})`).run(...params);
      db.prepare(`DELETE FROM sessions WHERE ${match}`).run(...params);
    })();
    // Vectors of the dropped messages are keyed by local message ids; orphans are
    // harmless (importer re-embeds) but drop them so the bundle stays clean.
    // Needs its own sqlite-vec-loaded connection (vec0 table).
    pruneOrphanVectors(path);
    db.pragma("wal_checkpoint(TRUNCATE)");
    db.pragma("journal_mode = DELETE");
  } finally {
    db.close();
  }
}

/** The only tables `mergeMemoryBundle` ever reads out of a bundle. Everything
 *  else in the DB is a DERIVED layer the receiver rebuilds locally. */
const ROWS_TABLES = ["schema_version", "sessions", "messages", "known_stores"] as const;

/**
 * L3 (plan 08 §7 bước ③) — bảng CHỞ đính kèm trong bundle, dạng ĐÃ LÀM PHẲNG.
 *
 * Vì sao không chở thẳng `attachment` + `attachment_link`: `messages.id` là AUTOINCREMENT
 * CỤC BỘ và **cố ý không đi theo bundle** (merge khoá trên `UNIQUE(session_id, uuid)`).
 * Chở `message_id` sang máy khác là trỏ vào tin của người ta — sai hoàn toàn. Nên mỗi hàng
 * mang sẵn `session_id` + `msg_uuid`, bên nhận tra lại id CỦA MÌNH.
 *
 * Bảng này CHỈ tồn tại trong bundle, không có trong DB sống.
 */
const ATT_SHIP_DDL = `CREATE TABLE attachment_ship (
  sha256 TEXT NOT NULL, name TEXT, mime TEXT, bytes INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL, content TEXT, blob BLOB, src_path TEXT, created_at TEXT,
  session_id TEXT NOT NULL, msg_uuid TEXT
)`;

interface RowsStats {
  sessions: number;
  messages: number;
  since: number;
  maxMessageId: number;
  /** L3: số liên kết đính kèm đã chở (0 khi công tắc tắt). */
  attachments?: number;
}

/**
 * Build a throwaway SQLite holding ONLY the source rows merge consumes — no FTS,
 * no vec_*, no digest, no doc/section/changelog, no ingest_state (per-machine).
 * Table DDL is copied verbatim from the source, so a schema change upstream needs
 * no edit here. `since` > 0 makes it a DELTA: only messages past that local
 * `messages.id`, plus the sessions those messages belong to.
 *
 * Reads run in one transaction so a concurrent writer can't tear the export
 * (WAL gives the reader a consistent snapshot).
 */
function buildRowsSnapshot(
  sourcePath: string,
  opts: { excludeLanes?: ScopeLane[]; since?: number; attachments?: boolean },
): { path: string; cleanup: () => void; stats: RowsStats } {
  const dir = mkdtempSync(join(tmpdir(), "zemory-memory-rows-"));
  const out = join(dir, "global_memory.rows.db");
  const cleanup = () => rmSync(dir, { recursive: true, force: true });
  const since = opts.since ?? 0;
  const db = new Database(out);
  try {
    db.pragma("journal_mode = OFF"); // throwaway: no WAL sidecar to ship
    db.prepare("ATTACH DATABASE ? AS src").run(sourcePath);
    try {
      for (const t of db
        .prepare(
          `SELECT sql FROM src.sqlite_master WHERE type='table' AND sql IS NOT NULL
             AND name IN (${ROWS_TABLES.map(() => "?").join(",")})`,
        )
        .all(...ROWS_TABLES) as { sql: string }[]) {
        db.exec(t.sql); // unqualified CREATE lands in main (the new lean file)
      }

      const excl = opts.excludeLanes?.length
        ? laneSqlClause("s", opts.excludeLanes)
        : { match: "", params: [] as unknown[] };
      const notExcluded = (col: string) =>
        excl.match ? ` AND ${col} NOT IN (SELECT id FROM src.sessions s WHERE ${excl.match})` : "";
      const deltaSessions = since > 0 ? " AND id IN (SELECT DISTINCT session_id FROM src.messages WHERE id > ?)" : "";

      const stats: RowsStats = { sessions: 0, messages: 0, since, maxMessageId: 0, attachments: 0 };
      db.transaction(() => {
        stats.maxMessageId = (db.prepare("SELECT COALESCE(MAX(id),0) m FROM src.messages").get() as { m: number }).m;
        db.exec("INSERT INTO main.schema_version SELECT * FROM src.schema_version");
        db.prepare(
          `INSERT INTO main.sessions SELECT * FROM src.sessions WHERE 1=1${deltaSessions}${notExcluded("id")}`,
        ).run(...(since > 0 ? [since] : []), ...excl.params);
        // `id` is local AUTOINCREMENT — omitted so it never travels (merge keys on
        // UNIQUE(session_id, uuid) / content identity, never on id).
        db.prepare(
          `INSERT INTO main.messages (session_id, uuid, role, content, tool_name, timestamp)
             SELECT session_id, uuid, role, content, tool_name, timestamp FROM src.messages
             WHERE id > ?${notExcluded("session_id")}`,
        ).run(since, ...excl.params);
        db.exec("INSERT INTO main.known_stores SELECT * FROM src.known_stores");
        // L3: chỉ chở khi máy này BẬT công tắc. Bám đúng tập message vừa chở (delta +
        // scope exclude) — chở đính kèm của tin không có trong bundle là chở rác.
        if (opts.attachments) {
          db.exec(ATT_SHIP_DDL);
          db.prepare(
            `INSERT INTO main.attachment_ship
                    (sha256, name, mime, bytes, kind, content, blob, src_path, created_at, session_id, msg_uuid)
             SELECT a.sha256, COALESCE(al.name, a.name), a.mime, a.bytes, a.kind, a.content, a.blob,
                    a.src_path, a.created_at, m.session_id, m.uuid
               FROM src.attachment_link al
               JOIN src.attachment a ON a.id = al.attachment_id
               JOIN src.messages m   ON m.id = al.message_id
              WHERE m.id > ?${notExcluded("m.session_id")}`,
          ).run(since, ...excl.params);
          stats.attachments = (
            db.prepare("SELECT COUNT(*) c FROM main.attachment_ship").get() as { c: number }
          ).c;
        }
        const c = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
        stats.sessions = c("SELECT COUNT(*) c FROM main.sessions");
        stats.messages = c("SELECT COUNT(*) c FROM main.messages");
      })();
      return { path: out, cleanup, stats };
    } finally {
      db.prepare("DETACH DATABASE src").run();
    }
  } catch (error) {
    db.close();
    cleanup();
    throw error;
  } finally {
    if (db.open) db.close();
  }
}

function writeHeader(outPath: string, header: BundleHeader, force: boolean | undefined): Buffer {
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  const aad = Buffer.from(MAGIC + JSON.stringify(header) + "\n", "utf8");
  writeFileSync(outPath, aad, { flag: force ? "w" : "wx" });
  return aad;
}

export async function exportMemoryBundle(opts: ExportMemoryBundleOptions): Promise<ExportMemoryBundleResult> {
  const sourcePath = opts.dbPath ?? currentMemoryDb();
  if (!existsSync(sourcePath)) throw new Error(`Memory DB not found: ${sourcePath}`);
  const secret = readShareSecret(opts);
  // "rows" is the default: ship only what merge consumes. "full" (byte snapshot)
  // stays available for a disaster-restore copy.
  const payload: BundlePayload = opts.sinceMessageId ? "rows" : (opts.payload ?? "rows");
  const snapshot =
    payload === "rows"
      ? buildRowsSnapshot(sourcePath, { excludeLanes: opts.excludeLanes, since: opts.sinceMessageId, attachments: getSyncAttachments() })
      : await snapshotSqlite(sourcePath);
  const rows = "stats" in snapshot ? (snapshot.stats as RowsStats) : undefined;
  try {
    // CHỞ KÈM VECTOR (2026-08-12): máy nhận merge xong là dùng được hybrid ngay, thay vì có
    // đủ chữ mà recall rơi về FTS cho tới khi nhúng lại xong (đo: FTS-thuần @10 26% nghiêm /
    // 50% tương đương, so với hybrid 38% / 71% — mất hơn một nửa, đúng phần "hiểu ý câu hỏi").
    // Chỉ áp cho payload "rows": bản "full" vốn đã là ảnh chụp nguyên kho, có sẵn vector.
    const shipped = payload === "rows" ? shipVectorsInto(snapshot.path, sourcePath, opts.sinceMessageId) : null;
    if (payload === "full" && opts.excludeLanes?.length) filterSnapshot(snapshot.path, opts.excludeLanes);
    const sourceBytes = statSync(snapshot.path).size;
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const header: BundleHeader = {
      format: "zemory.memory.bundle",
      version: 2,
      alg: "aes-256-gcm",
      kdf: { name: "scrypt", ...KDF, salt: salt.toString("base64") },
      iv: iv.toString("base64"),
      createdAt: new Date().toISOString(),
      source: { name: basename(sourcePath), bytes: sourceBytes },
      payload,
      ...(rows
        ? {
            rows: {
              sessions: rows.sessions,
              messages: rows.messages,
              since: rows.since,
              maxMessageId: rows.maxMessageId,
              host: (hostname() || "unknown").replace(/[^A-Za-z0-9._-]/g, "_"),
            },
          }
        : {}),
    };
    const aad = writeHeader(opts.outPath, header, opts.force);
    const cipher = createCipheriv(header.alg, deriveKey(secret, salt), iv);
    cipher.setAAD(aad);
    try {
      await pipeline(createReadStream(snapshot.path), cipher, createWriteStream(opts.outPath, { flags: "a" }));
      appendFileSync(opts.outPath, cipher.getAuthTag());
    } catch (error) {
      rmSync(opts.outPath, { force: true });
      throw error;
    }
    return {
      outPath: opts.outPath,
      sourcePath,
      sourceBytes,
      bundleBytes: statSync(opts.outPath).size,
      payload,
      ...(rows ? { rows } : {}),
      ...(shipped ? { vectorsShipped: shipped.shipped, vectorsRejected: shipped.rejected } : {}),
    };
  } finally {
    snapshot.cleanup();
  }
}

/**
 * Export watermark = the highest local `messages.id` already shipped in `bundle`.
 * Kept per-machine in `sync_state` (never travels in a bundle), so the next
 * `--delta` export carries only rows added since. 0 = never exported → full set.
 */
export function readExportWatermark(bundle: string, dbPath?: string): number {
  const db = openMemory(dbPath ?? currentMemoryDb());
  try {
    const row = db.prepare("SELECT last_message_id AS id FROM sync_state WHERE bundle = ?").get(bundle) as
      | { id: number }
      | undefined;
    return row?.id ?? 0;
  } finally {
    db.close();
  }
}

export function writeExportWatermark(bundle: string, lastMessageId: number, dbPath?: string): void {
  const db = openMemory(dbPath ?? currentMemoryDb());
  try {
    db.prepare(
      `INSERT INTO sync_state (bundle, last_message_id, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(bundle) DO UPDATE SET last_message_id = excluded.last_message_id, updated_at = excluded.updated_at`,
    ).run(bundle, lastMessageId, new Date().toISOString());
  } finally {
    db.close();
  }
}

/**
 * A cheap fingerprint of a bundle file WITHOUT decrypting it: byte size + the
 * `createdAt` from its plaintext header. It changes whenever the file is
 * rewritten, so the receiver can skip files it has already merged.
 */
function bundleSignature(bundlePath: string): string {
  const bytes = statSync(bundlePath).size;
  let createdAt = "";
  try {
    createdAt = readHeader(bundlePath).header.createdAt;
  } catch {
    /* unreadable header → sig falls back to size only (still detects rewrites) */
  }
  return `${bytes}:${createdAt}`;
}

/** Has this exact bundle file (by signature) already been merged here? */
function isBundleMerged(file: string, sig: string, dbPath?: string): boolean {
  const db = openMemory(dbPath ?? currentMemoryDb());
  try {
    const row = db.prepare("SELECT sig FROM merged_bundles WHERE file = ?").get(file) as { sig: string } | undefined;
    return row?.sig === sig;
  } finally {
    db.close();
  }
}

/** Record that a bundle file (by signature) has been merged here. */
function markBundleMerged(file: string, sig: string, dbPath?: string): void {
  const db = openMemory(dbPath ?? currentMemoryDb());
  try {
    db.prepare(
      `INSERT INTO merged_bundles (file, sig, merged_at) VALUES (?, ?, ?)
         ON CONFLICT(file) DO UPDATE SET sig = excluded.sig, merged_at = excluded.merged_at`,
    ).run(file, sig, new Date().toISOString());
  } finally {
    db.close();
  }
}

function readHeader(bundlePath: string): { header: BundleHeader; aad: Buffer; dataOffset: number } {
  const fd = openSync(bundlePath, "r");
  try {
    const probe = Buffer.alloc(64 * 1024);
    readSync(fd, probe, 0, probe.length, 0);
    const firstNl = probe.indexOf(10, 0);
    const secondNl = firstNl >= 0 ? probe.indexOf(10, firstNl + 1) : -1;
    if (firstNl < 0 || secondNl < 0) throw new Error("Invalid zemory memory bundle header.");
    const magic = probe.subarray(0, firstNl + 1).toString("utf8");
    if (magic !== MAGIC) throw new Error("Not a zemory encrypted memory bundle.");
    const header = JSON.parse(probe.subarray(firstNl + 1, secondNl).toString("utf8")) as BundleHeader;
    if (header.format !== "zemory.memory.bundle" || (header.version !== 1 && header.version !== 2) || header.alg !== "aes-256-gcm") {
      throw new Error("Unsupported zemory memory bundle version.");
    }
    return { header, aad: probe.subarray(0, secondNl + 1), dataOffset: secondNl + 1 };
  } finally {
    closeSync(fd);
  }
}

function readAuthTag(bundlePath: string): Buffer {
  const size = statSync(bundlePath).size;
  if (size <= TAG_BYTES) throw new Error("Invalid zemory memory bundle: missing auth tag.");
  const fd = openSync(bundlePath, "r");
  try {
    const tag = Buffer.alloc(TAG_BYTES);
    readSync(fd, tag, 0, TAG_BYTES, size - TAG_BYTES);
    return tag;
  } finally {
    closeSync(fd);
  }
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/** Decrypt a bundle's SQLite payload to `outPath` (must not yet exist). */
async function decryptBundleToFile(
  opts: MemoryShareKeyOptions & { bundlePath: string },
  outPath: string,
): Promise<BundleHeader> {
  const { header, aad, dataOffset } = readHeader(opts.bundlePath);
  const size = statSync(opts.bundlePath).size;
  const cipherEnd = size - TAG_BYTES - 1;
  if (cipherEnd < dataOffset) throw new Error("Invalid zemory memory bundle: empty ciphertext.");
  const secret = readShareSecret(opts);
  const salt = Buffer.from(header.kdf.salt, "base64");
  const iv = Buffer.from(header.iv, "base64");
  const decipher = createDecipheriv(header.alg, deriveKey(secret, salt, header.kdf), iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(readAuthTag(opts.bundlePath));
  await pipeline(
    createReadStream(opts.bundlePath, { start: dataOffset, end: cipherEnd }),
    decipher,
    createWriteStream(outPath, { flags: "wx" }),
  );
  return header;
}

export async function importMemoryBundle(opts: ImportMemoryBundleOptions): Promise<ImportMemoryBundleResult> {
  // Kho chính là CONTAINER nhiều khối, không phải ảnh chụp nguyên kho ⇒ không có gì để "thay
  // nguyên DB" cả. Chỉ đường sang `--merge` (chạy được cả trên máy trắng: merge tự tạo kho)
  // thay vì để người dùng nhận câu "Not a zemory encrypted memory bundle" rồi tự đoán.
  if (isChunkContainer(opts.bundlePath)) {
    throw new Error(
      "Đây là KHO CHÍNH nhiều khối, không phải ảnh chụp nguyên kho — dùng `zemory memory import <file> --merge` " +
        "(merge chạy được cả trên máy chưa có kho).",
    );
  }
  const targetPath = opts.dbPath ?? currentMemoryDb();
  if (existsSync(targetPath) && !opts.force) {
    throw new Error(`Refusing to overwrite existing memory DB: ${targetPath}. Re-run with --force to replace it.`);
  }
  mkdirSync(dirname(resolve(targetPath)), { recursive: true });
  const tmpPath = join(dirname(resolve(targetPath)), `.zemory-import-${process.pid}-${Date.now()}.tmp`);
  let backupPath: string | null = null;
  try {
    const header = await decryptBundleToFile(opts, tmpPath);
    // A "rows" bundle carries source rows only — it is NOT a runnable memory DB
    // (no FTS, no vec_*, no digest). Materialize a fully-migrated empty DB and
    // merge the rows in, so the result is a complete memory either way.
    if ((header.payload ?? "full") === "rows") {
      if (existsSync(targetPath)) {
        backupPath = `${targetPath}.bak-${timestamp()}`;
        renameSync(targetPath, backupPath);
      }
      openMemory(targetPath).close(); // create + migrate a fresh, complete schema
      await mergeMemoryBundle({ ...opts, dbPath: targetPath });
      rmSync(tmpPath, { force: true });
      return { dbPath: targetPath, bundlePath: opts.bundlePath, bytes: header.source.bytes, backupPath };
    }
    if (existsSync(targetPath)) {
      backupPath = `${targetPath}.bak-${timestamp()}`;
      renameSync(targetPath, backupPath);
    }
    renameSync(tmpPath, targetPath);
    return { dbPath: targetPath, bundlePath: opts.bundlePath, bytes: header.source.bytes, backupPath };
  } catch (error) {
    rmSync(tmpPath, { force: true });
    if (backupPath && !existsSync(targetPath) && existsSync(backupPath)) renameSync(backupPath, targetPath);
    throw error;
  }
}

export interface MergeMemoryBundleOptions extends MemoryShareKeyOptions {
  bundlePath: string;
  dbPath?: string;
  /** Provenance lanes to NOT pull from the incoming bundle (scoped sync). */
  excludeLanes?: ScopeLane[];
}

export interface MergeMemoryBundleResult {
  dbPath: string;
  bundlePath: string;
  sessionsBefore: number;
  sessionsAfter: number;
  messagesBefore: number;
  messagesAfter: number;
  sessionsAdded: number;
  messagesAdded: number;
  /** Vector nhận được từ gói (chở kèm từ 2026-08-12) — 0 với gói đời cũ. */
  vectorsApplied?: number;
  /** Vì sao KHÔNG nhận vector (thường là lệch cấu hình nhúng). Nói ra thay vì im lặng bỏ. */
  vectorsSkippedReason?: string;
}

/**
 * MERGE a bundle into the existing local memory — ADDITIVE, never destructive.
 * Sessions/messages are copied with INSERT OR IGNORE (sessions keyed by id;
 * messages by their UNIQUE(session_id, uuid)), so anything already present is
 * kept untouched and only genuinely new rows are added — no machine overwrites
 * another, and the original DB is never replaced. Each session keeps the `host`
 * stamped by its producing machine, so provenance survives the merge.
 *
 * NOT copied: ingest_state (per-machine file offsets — merging would corrupt the
 * local incremental scan), vec_chunks (keyed by local message ids that differ
 * across DBs — re-embed new messages with `memory embed`), and doc/section/
 * changelog (those travel via git, not the memory bundle).
 */
/**
 * Merge một gói vào kho local. Nhận CẢ HAI hình dạng:
 *  • một bundle đơn (mọi gói đời cũ, và từng khối bên trong container);
 *  • **container nhiều khối** — kho chính trên Drive từ 2026-08-12.
 *
 * 🔴 Vì sao cửa này phải mở: `zemory memory import` là đường BÀN GIAO MÁY MỚI trong tài liệu.
 * Bản đầu của lối một-file chỉ dạy `syncDrive` đọc container, nên `import` gặp kho chính là
 * trả về *"Not a zemory encrypted memory bundle"* — người làm đúng tài liệu vẫn thất bại, đúng
 * kiểu ĐỨT đường bàn giao mà `skill sync-path` sinh ra để bắt. Đo được ngay khi thử thật.
 */
export async function mergeMemoryBundle(opts: MergeMemoryBundleOptions): Promise<MergeMemoryBundleResult> {
  if (isChunkContainer(opts.bundlePath)) {
    const chunks = listChunks(opts.bundlePath);
    if (!chunks.length) throw new Error("Kho chính rỗng (không có khối nào đọc được).");
    const targetPath = opts.dbPath ?? currentMemoryDb();
    let first: MergeMemoryBundleResult | null = null;
    let last: MergeMemoryBundleResult | null = null;
    let vectors = 0;
    for (const chunk of chunks) {
      const tmp = mkdtempSync(join(tmpdir(), "zemory-mchunk-"));
      try {
        const part = join(tmp, "chunk.enc");
        await extractChunk(opts.bundlePath, chunk, part);
        const r = await mergeSingleBundle({ ...opts, bundlePath: part });
        vectors += r.vectorsApplied ?? 0;
        first ??= r;
        last = r;
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    }
    return {
      dbPath: targetPath,
      bundlePath: opts.bundlePath,
      sessionsBefore: first!.sessionsBefore,
      sessionsAfter: last!.sessionsAfter,
      messagesBefore: first!.messagesBefore,
      messagesAfter: last!.messagesAfter,
      sessionsAdded: last!.sessionsAfter - first!.sessionsBefore,
      messagesAdded: last!.messagesAfter - first!.messagesBefore,
      vectorsApplied: vectors,
    };
  }
  return mergeSingleBundle(opts);
}

async function mergeSingleBundle(opts: MergeMemoryBundleOptions): Promise<MergeMemoryBundleResult> {
  const targetPath = opts.dbPath ?? currentMemoryDb();
  const dir = mkdtempSync(join(tmpdir(), "zemory-memory-merge-"));
  const srcPath = join(dir, "incoming.db");
  try {
    const incoming = await decryptBundleToFile(opts, srcPath);
    // A "rows" bundle is already at the current schema and carries no WAL, so it
    // attaches as-is. A "full" snapshot still needs normalizing (adds `host` on a
    // pre-v4 bundle) and its WAL dropped before ATTACH.
    if ((incoming.payload ?? "full") !== "rows") {
      const src = openMemory(srcPath);
      try {
        src.pragma("wal_checkpoint(TRUNCATE)");
        src.pragma("journal_mode = DELETE");
      } finally {
        src.close();
      }
    }

    const db = openMemory(targetPath);
    try {
      const count = (sql: string): number => (db.prepare(sql).get() as { c: number }).c;
      const sessionsBefore = count("SELECT COUNT(*) c FROM sessions");
      const messagesBefore = count("SELECT COUNT(*) c FROM messages");
      db.prepare("ATTACH DATABASE ? AS src").run(srcPath);
      try {
        // Scoped sync: don't pull "shared" lanes the user excluded. Skip the
        // incoming sessions that match, and any messages under them.
        const excl = opts.excludeLanes?.length ? laneSqlClause("x", opts.excludeLanes) : { match: "", params: [] as unknown[] };
        const sessionsWhere = excl.match ? ` WHERE id NOT IN (SELECT id FROM src.sessions x WHERE ${excl.match})` : "";
        const notExcluded = (col: string) =>
          excl.match ? ` AND ${col} NOT IN (SELECT id FROM src.sessions x WHERE ${excl.match})` : "";
        db.transaction(() => {
          // Carry `origin` across machines (v6) so captured web-chat keeps its
          // 'web' lane on the receiving PC. COALESCE guards a pre-v6 bundle
          // (openMemory above migrates the incoming DB, so src.sessions.origin
          // exists; the COALESCE is belt-and-braces for a null).
          db.prepare(
            `INSERT OR IGNORE INTO sessions (id, source, origin, project_root, cwd, title, host, started_at, ended_at, message_count)
             SELECT id, source, COALESCE(origin, 'local'), project_root, cwd, title, host, started_at, ended_at, message_count FROM src.sessions${sessionsWhere}`,
          ).run(...excl.params);
          // id is AUTOINCREMENT and differs across DBs — omit it (FTS triggers
          // fire on real inserts). Dedup in two passes:
          //  • uuid present → UNIQUE(session_id, uuid) + OR IGNORE handles it.
          //  • uuid NULL (≈ tool/codex/lmstudio lines) → UNIQUE treats NULLs as
          //    distinct, so OR IGNORE would re-insert on every merge. Match on
          //    content identity instead so a re-merge of the same bundle adds 0.
          db.prepare(
            `INSERT OR IGNORE INTO messages (session_id, uuid, role, content, tool_name, timestamp)
             SELECT session_id, uuid, role, content, tool_name, timestamp FROM src.messages WHERE uuid IS NOT NULL${notExcluded("session_id")}`,
          ).run(...excl.params);
          db.prepare(
            `INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp)
             SELECT s.session_id, s.uuid, s.role, s.content, s.tool_name, s.timestamp
             FROM src.messages s
             WHERE s.uuid IS NULL
               AND NOT EXISTS (
                 SELECT 1 FROM messages m
                 WHERE m.session_id = s.session_id AND m.uuid IS NULL
                   AND m.role IS s.role AND m.timestamp IS s.timestamp AND m.content IS s.content
               )${notExcluded("s.session_id")}`,
          ).run(...excl.params);
          db.exec(
            `INSERT OR IGNORE INTO known_stores (store_root, source, found_at)
             SELECT store_root, source, found_at FROM src.known_stores`,
          );
          // Re-derive per-session counts/spans now that messages may have grown.
          db.exec(
            `UPDATE sessions SET
               message_count = (SELECT COUNT(*) FROM messages WHERE session_id = sessions.id),
               started_at    = (SELECT MIN(timestamp) FROM messages WHERE session_id = sessions.id),
               ended_at      = (SELECT MAX(timestamp) FROM messages WHERE session_id = sessions.id)`,
          );
          // L3: nhận đính kèm nếu bundle có chở. Bảng `attachment_ship` chỉ xuất hiện khi
          // máy GỬI bật công tắc ⇒ bundle cũ / máy gửi tắt thì nhánh này im lặng bỏ qua.
          //
          // Tra id CỦA MÁY NÀY qua `(session_id, uuid)` — id trong bundle là của máy kia,
          // dùng thẳng là trỏ nhầm vào tin của mình. Nội dung dedup theo `sha256` nên cùng
          // một ảnh từ nhiều máy chỉ tốn MỘT hàng.
          const hasShip = db
            .prepare("SELECT COUNT(*) c FROM src.sqlite_master WHERE type='table' AND name='attachment_ship'")
            .get() as { c: number };
          if (hasShip.c) {
            db.exec(
              `INSERT OR IGNORE INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, content, blob, src_path, created_at)
               SELECT COALESCE(m.id, 0), sp.session_id, sp.name, sp.mime, sp.bytes, sp.sha256, sp.kind,
                      sp.content, sp.blob, sp.src_path, sp.created_at
                 FROM src.attachment_ship sp
                 LEFT JOIN messages m ON m.session_id = sp.session_id AND m.uuid IS sp.msg_uuid`,
            );
            db.exec(
              `INSERT OR IGNORE INTO attachment_link (message_id, attachment_id, name)
               SELECT m.id, a.id, sp.name
                 FROM src.attachment_ship sp
                 JOIN messages m   ON m.session_id = sp.session_id AND m.uuid IS sp.msg_uuid
                 JOIN attachment a ON a.sha256 = sp.sha256`,
            );
          }
          db.exec("DELETE FROM sessions WHERE message_count = 0");
        })();
      } finally {
        db.prepare("DETACH DATABASE src").run();
      }
      const sessionsAfter = count("SELECT COUNT(*) c FROM sessions");
      const messagesAfter = count("SELECT COUNT(*) c FROM messages");
      db.close(); // nhả kho trước khi lớp vector mở lại nó bằng kết nối có sqlite-vec
      // Vector đi CÙNG gói: nối vào sau khi tin đã nằm trong kho, vì nó tra id local theo
      // (session_id, uuid) — chạy trước thì không có gì để tra. Fail-open: lệch cấu hình
      // nhúng hay thiếu extension chỉ làm mất phần vector, tin vẫn vào đủ.
      const vec = receiveVectorsFrom(srcPath, targetPath);
      return {
        dbPath: targetPath,
        bundlePath: opts.bundlePath,
        sessionsBefore,
        sessionsAfter,
        messagesBefore,
        messagesAfter,
        sessionsAdded: sessionsAfter - sessionsBefore,
        messagesAdded: messagesAfter - messagesBefore,
        vectorsApplied: vec.applied,
        ...(vec.reason ? { vectorsSkippedReason: vec.reason } : {}),
      };
    } finally {
      if (db.open) db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Find the share key: explicit path → ~/.zemory/share.key → <root>/share/share.key. */
export function resolveShareKey(projectRoot: string, explicit?: string): string | undefined {
  for (const c of [explicit, join(currentMemoryDir(), "share.key"), join(projectRoot, "share", "share.key")]) {
    if (c && existsSync(c)) return c;
  }
  return undefined; // fall back to ZEMORY_SHARE_KEY env (export/import read it)
}

export interface DriveSyncResult {
  driveDir: string;
  /** Fresh ingest of THIS machine's transcripts done right before export. */
  scanned: { newMessages: number; changedFiles: number };
  exported: string;
  exportedBytes: number;
  /** Sync depth used for the export (plan 08 §7): "lean" rows | "full" snapshot. */
  level: SyncLevel;
  /** What this machine wrote out this run (delta series, plan 08 §7 / plan 14 §3b). */
  push: {
    /** "baseline" (full row set) · "delta" (rows since watermark) · "full" (whole-DB
     *  snapshot) · "compact" (fresh baseline that replaced old deltas) · "none". */
    kind: "baseline" | "delta" | "full" | "compact" | "none";
    file: string;
    bytes: number;
    messages: number;
    /** Old delta files removed by a compaction (their rows live on in the baseline). */
    removed: number;
  };
  merged: { file: string; sessionsAdded?: number; messagesAdded?: number; skipped?: boolean; error?: string }[];
  /** New vectors built at the end of sync (this machine's + merged messages). */
  embedded: number;
  vectorRemaining: number;
}

/** Delta series knobs (plan 08 §7). */
const DRIVE_SEQ_PAD = 6; // zero-padded so files sort lexically by age
const DRIVE_COMPACT_AT = 12; // ≥ this many of MY files → fold them into a fresh baseline

/**
 * MỘT KHO CHÍNH TRÊN DRIVE (user chốt 2026-08-12) — thay hẳn lối "mỗi máy một series".
 *
 * Nguyên văn yêu cầu: *"trên drive luôn chỉ tồn tại 1 kho chính, 1 file duy nhất… bất kể máy
 * nào khi bấm sync đều ghi lên 1 file duy nhất, không được ghi vào file khác"*.
 *
 * Vì sao lối cũ phải bỏ: series-theo-máy khiến MỖI máy đẻ một baseline riêng của cùng một kho
 * đã hội tụ. Đo 2026-08-12 trên Drive thật: `DESKTOP-PFB157K.000003` (1.312 phiên · 235.839
 * tin · 331 MB) và `SS01-IT-12.000024` (1.314 · 238.422 · 336 MB) gần như CÙNG nội dung —
 * 667 MB cho thứ một gói phủ xong. Cộng thêm ca máy kia đổ lại baseline ba lần trong một ngày
 * (watermark chết sau `import`) ⇒ 13 file / 2,9 GB.
 *
 * ĐÁNH ĐỔI ĐÃ BIẾT, ghi ra để không ai ngạc nhiên: gói mã hoá KHÔNG sửa từng phần được, nên
 * mỗi lần sync có thay đổi là ghi lại NGUYÊN gói (~336 MB) thay cho delta ~100 KB. Đây là giá
 * của "một file", user đã chốt chấp nhận. Bù lại ta chỉ ghi khi THẬT SỰ có thay đổi.
 *
 * VÌ SAO MẤT TIN KHÔNG PHẢI THẢM HOẠ (lập luận của user, và nó đúng): kho THẬT nằm ở
 * `<repo>/data/global_memory.db` của TỪNG máy — gói trên Drive chỉ là chỗ gặp nhau. Hai máy
 * sync sát nhau thì máy sau ghi đè phần của máy trước; lần sync kế tiếp của máy trước đẩy lại
 * đủ. Nên thiết kế ở đây ưu tiên **báo lỗi rõ ràng** hơn là cố chống mọi tranh chấp.
 */
const MAIN_BUNDLE = "global_memory.enc";
/** Thế hệ trước của kho chính. Giữ đúng MỘT bản — đủ để lùi khi một lượt ghi hỏng giữa chừng,
 *  mà không đẻ lại đúng cái đống file vừa dọn. */
const MAIN_BAK = "global_memory.bak.enc";
const SYNC_LOCK = "global_memory.sync.lock";
/** Khoá cũ hơn mức này coi như MỒ CÔI (máy kia chết giữa chừng). Rộng tay vì một lượt ghi
 *  336 MB qua thư mục đồng bộ có thể lâu; hẹp quá thì hai máy cùng tưởng mình được quyền. */
const LOCK_STALE_MS = 15 * 60_000;

/**
 * ĐỊNH DẠNG KHO CHÍNH — CONTAINER NỐI THÊM (user chốt 2026-08-12: *"ghi thêm được mà"*).
 *
 * ```
 * ZEMORY-MEMORY-CHUNKS v1\n
 * ZCHUNK <số byte>\n<nguyên một bundle .enc>
 * ZCHUNK <số byte>\n<nguyên một bundle .enc>
 * ```
 *
 * Mỗi khối là **một bundle hoàn chỉnh** (có header · salt · iv · thẻ xác thực của riêng nó),
 * chỉ được nối vào cuối file. Hai hệ quả, và đó là lý do chọn hình dạng này thay vì bẻ lại
 * lớp mã hoá:
 *  ① **Ghi thêm là ghi thêm thật** — không giải mã, không mã hoá lại, không đụng byte cũ.
 *    Một lượt sync bình thường nối ~100 KB vào cuối, thay vì viết lại ~336 MB.
 *  ② **Không phải viết lại lớp mật mã** — mọi khối đi qua đúng `exportMemoryBundle` /
 *    `mergeMemoryBundle` đã có; ở đây chỉ thêm việc cắt byte theo tiền tố độ dài. Tự chế
 *    khung mã hoá mới là chỗ dễ sai nhất trong cả repo, và không có lý do gì để chạm vào.
 *
 * Tiền tố ĐỘ DÀI chứ không dò theo dấu hiệu đầu gói: bản mã trông như ngẫu nhiên nên nó có
 * thể chứa đúng chuỗi dấu hiệu, và một bộ đọc dò-dấu-hiệu sẽ cắt nhầm giữa thân gói.
 */
const CHUNKS_MAGIC = "ZEMORY-MEMORY-CHUNKS v1\n";
const CHUNK_PREFIX = "ZCHUNK ";
/** Bao nhiêu khối thì gộp lại thành một. Gộp = viết lại nguyên file (đắt), nên để thưa;
 *  nhưng cũng không để vô hạn vì bên nhận phải giải mã lần lượt từng khối chưa merge. */
const MAIN_COMPACT_CHUNKS = 48;

interface DriveLock {
  host: string;
  pid: number;
  at: string;
}

interface ChunkRef {
  index: number;
  offset: number; // byte đầu của bundle bên trong (đã bỏ qua dòng tiền tố)
  len: number;
}

function isChunkContainer(path: string): boolean {
  if (!existsSync(path)) return false;
  const fd = openSync(path, "r");
  try {
    const probe = Buffer.alloc(CHUNKS_MAGIC.length);
    readSync(fd, probe, 0, probe.length, 0);
    return probe.toString("utf8") === CHUNKS_MAGIC;
  } finally {
    closeSync(fd);
  }
}

/** Danh mục khối trong container. Gặp khung hỏng ⇒ DỪNG ở đó và trả những khối đọc được:
 *  một lượt ghi bị cắt giữa chừng (mất điện, client đồng bộ chen ngang) chỉ được phép làm
 *  mất phần ĐUÔI, không được làm cả file thành vô dụng. */
function listChunks(path: string): ChunkRef[] {
  const size = statSync(path).size;
  const fd = openSync(path, "r");
  const out: ChunkRef[] = [];
  try {
    let pos = CHUNKS_MAGIC.length;
    for (let index = 0; pos < size; index++) {
      const head = Buffer.alloc(64);
      const got = readSync(fd, head, 0, Math.min(64, size - pos), pos);
      const nl = head.subarray(0, got).indexOf(10);
      if (nl < 0) break;
      const line = head.subarray(0, nl).toString("utf8");
      if (!line.startsWith(CHUNK_PREFIX)) break;
      const len = Number(line.slice(CHUNK_PREFIX.length));
      if (!Number.isSafeInteger(len) || len <= 0) break;
      const offset = pos + nl + 1;
      if (offset + len > size) break; // khối viết dở ⇒ bỏ, phần trước vẫn dùng được
      out.push({ index, offset, len });
      pos = offset + len;
    }
  } finally {
    closeSync(fd);
  }
  return out;
}

/** Nối một bundle đã dựng sẵn vào cuối container (tạo container nếu chưa có). */
function appendChunk(containerPath: string, bundlePath: string): number {
  const bytes = readFileSync(bundlePath);
  if (!existsSync(containerPath)) writeFileSync(containerPath, CHUNKS_MAGIC);
  appendFileSync(containerPath, Buffer.concat([Buffer.from(`${CHUNK_PREFIX}${bytes.length}\n`, "utf8"), bytes]));
  return bytes.length;
}

/** Cắt một khối ra file rời để đi qua đúng đường merge sẵn có. */
async function extractChunk(containerPath: string, chunk: ChunkRef, outPath: string): Promise<void> {
  await pipeline(
    createReadStream(containerPath, { start: chunk.offset, end: chunk.offset + chunk.len - 1 }),
    createWriteStream(outPath, { flags: "wx" }),
  );
}

/** Giành quyền ghi kho chính. Trả hàm nhả khoá; ném lỗi RÕ khi máy khác đang giữ.
 *  KHÔNG phải khoá thật (Drive không có khoá file) — nó chỉ thu hẹp cửa sổ tranh chấp và,
 *  quan trọng hơn, biến một lần giẫm chân im lặng thành một câu báo lỗi đọc được. */
function acquireDriveLock(dir: string, host: string): () => void {
  const path = join(dir, SYNC_LOCK);
  try {
    const cur = JSON.parse(readFileSync(path, "utf8")) as DriveLock;
    const age = Date.now() - Date.parse(cur.at);
    if (cur.host !== host && age < LOCK_STALE_MS) {
      throw new Error(
        `Kho chính trên Drive đang được máy "${cur.host}" ghi (${Math.round(age / 1000)}s trước). ` +
          `Chờ nó xong rồi sync lại — kho của máy này vẫn đủ, không mất gì.`,
      );
    }
  } catch (e) {
    // Không đọc được khoá = chưa có khoá (hoặc rác) ⇒ đi tiếp. Nhưng lỗi TỪ CHỐI ở trên phải
    // ném ra ngoài, không được nuốt chung với "file không tồn tại".
    if (e instanceof Error && e.message.startsWith("Kho chính trên Drive")) throw e;
  }
  writeFileSync(path, JSON.stringify({ host, pid: process.pid, at: new Date().toISOString() } satisfies DriveLock));
  return () => rmSync(path, { force: true });
}

const sanitizeHost = (): string => (hostname() || "unknown").replace(/[^A-Za-z0-9._-]/g, "_");
const seriesName = (host: string, seq: number): string =>
  `global_memory.${host}.${String(seq).padStart(DRIVE_SEQ_PAD, "0")}.enc`;
const legacyName = (host: string): string => `global_memory.${host}.zemory.enc`;

/** My delta-series files in the folder, with their parsed sequence numbers. */
function listMySeries(dir: string, host: string): { file: string; seq: number }[] {
  const prefix = `global_memory.${host}.`;
  const out: { file: string; seq: number }[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.startsWith(prefix) || !f.endsWith(".enc")) continue;
    const mid = f.slice(prefix.length, -".enc".length); // between prefix and .enc
    if (/^\d+$/.test(mid)) out.push({ file: f, seq: Number(mid) });
  }
  return out.sort((a, b) => a.seq - b.seq);
}

/** Mọi host có series trong thư mục Drive, kèm số file + tổng dung lượng. */
function listDriveHosts(dir: string): { host: string; files: string[]; bytes: number }[] {
  const byHost = new Map<string, { host: string; files: string[]; bytes: number }>();
  for (const f of readdirSync(dir)) {
    const m = /^global_memory\.(.+?)\.(?:\d+|zemory)\.enc$/.exec(f);
    if (!m) continue;
    const host = m[1];
    const e = byHost.get(host) ?? { host, files: [], bytes: 0 };
    e.files.push(f);
    try {
      e.bytes += statSync(join(dir, f)).size;
    } catch {
      /* file vừa biến mất giữa lúc liệt kê */
    }
    byHost.set(host, e);
  }
  return [...byHost.values()].sort((a, b) => b.bytes - a.bytes);
}

export interface PruneHostResult {
  host: string;
  files: { file: string; bytes: number; merged: boolean }[];
  bytes: number;
  /** Đủ điều kiện xoá an toàn? */
  safe: boolean;
  /** Vì sao KHÔNG an toàn (rỗng khi safe). */
  blockers: string[];
  /** Đã thật sự xoá chưa (false khi dry-run). */
  applied: boolean;
  removed: string[];
}

/**
 * Dọn series của một host ĐÃ CHẾT (máy bỏ đi, không còn ai chạy compact cho nó).
 *
 * Vì sao cần: `pushToDrive` chỉ compact `listMySeries(dir, host)` — series của CHÍNH máy
 * đang chạy. Máy cũ ngừng dùng thì file của nó **nằm đó vĩnh viễn** (đo 2026-08-05:
 * `SS01-IT-10` để lại 9 file ~338 MB). Đây là ca sẽ LẶP mỗi lần đổi máy.
 *
 * An toàn dựa trên đúng lập luận đã dùng cho compaction — "cái mới là TẬP CHA của cái bị
 * xoá" — nhưng phải chứng minh, không được tin:
 *  ① MỌI file của host đó đã được merge vào kho local (bảng `merged_bundles`);
 *  ② máy này CÓ series của mình trong thư mục, và watermark của nó đã phủ hết `messages`
 *     local. Vì merge là ADDITIVE (HP điều 11), kho local chứa trọn nội dung máy cũ, nên
 *     series của máy này là tập cha ⇒ máy thứ ba vẫn lấy đủ dữ liệu từ đó.
 * Thiếu một trong hai ⇒ TỪ CHỐI và nói rõ thiếu gì. Mặc định DRY-RUN.
 */
export function pruneDriveHost(o: {
  dir: string;
  host: string;
  apply?: boolean;
  dbPath?: string;
  /** Danh tính máy này (mặc định hostname) — seam cho test. */
  selfHost?: string;
}): PruneHostResult {
  const dir = o.dir.trim();
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`Drive folder not found: ${dir}`);
  const self = o.selfHost ? o.selfHost.replace(/[^A-Za-z0-9._-]/g, "_") : sanitizeHost();
  const host = o.host.trim().replace(/[^A-Za-z0-9._-]/g, "_");
  if (!host) throw new Error("Missing --prune-host <host>");
  if (host === self) {
    throw new Error(`"${host}" is THIS machine — its series is compacted automatically; prune is for retired hosts.`);
  }

  const entry = listDriveHosts(dir).find((h) => h.host === host);
  if (!entry) throw new Error(`No bundles for host "${host}" in ${dir}`);

  const files = entry.files.map((f) => {
    let merged: boolean;
    try {
      merged = isBundleMerged(f, bundleSignature(join(dir, f)), o.dbPath);
    } catch {
      merged = false; // đọc không được ⇒ coi như CHƯA merge (nghiêng về phía không xoá)
    }
    let bytes = 0;
    try {
      bytes = statSync(join(dir, f)).size;
    } catch {
      /* vừa biến mất */
    }
    return { file: f, bytes, merged };
  });

  const blockers: string[] = [];
  const unmerged = files.filter((f) => !f.merged);
  if (unmerged.length) {
    blockers.push(`${unmerged.length}/${files.length} bundle chưa được merge vào kho máy này: ${unmerged.map((f) => f.file).join(", ")}`);
  }

  // ② Máy này phải đang PHÁT một series phủ hết kho local, nếu không thì xoá xong
  //    nội dung máy cũ không còn đường nào tới máy thứ ba.
  // Từ 2026-08-12 đường phát của máy này là KHO CHÍNH (container nối thêm), không còn là
  // series mang tên host. Vẫn chấp nhận hai hình dạng cũ để repo đang dùng dở không kẹt.
  const mySeries = listMySeries(dir, self);
  const publishes = mySeries.length > 0 || existsSync(join(dir, legacyName(self))) || existsSync(join(dir, MAIN_BUNDLE));
  if (!publishes) {
    blockers.push(`máy này (${self}) chưa có bundle nào trong thư mục — chạy \`zemory memory sync\` trước để nội dung máy cũ có đường đi tiếp`);
  } else {
    const db = openMemory(o.dbPath ?? currentMemoryDb());
    let maxLocal: number;
    try {
      maxLocal = (db.prepare("SELECT COALESCE(MAX(id),0) m FROM messages").get() as { m: number }).m;
    } finally {
      db.close();
    }
    const wm = readExportWatermark(`drive:${self}`, o.dbPath);
    if (wm < maxLocal) {
      blockers.push(`series của máy này mới phủ tới message #${wm}/${maxLocal} — chạy \`zemory memory sync\` cho đủ rồi hãy dọn`);
    }
  }

  const safe = blockers.length === 0;
  const removed: string[] = [];
  if (safe && o.apply) {
    for (const f of files) {
      try {
        rmSync(join(dir, f.file), { force: true });
        removed.push(f.file);
      } catch {
        /* xoá hụt một file không phá vỡ gì — lần sau dọn tiếp */
      }
    }
  }
  return { host, files, bytes: entry.bytes, safe, blockers, applied: Boolean(o.apply) && safe, removed };
}

/**
 * One-shot cross-machine sync through a synced Drive FOLDER (not the live DB):
 * export THIS machine's bundle into the folder, then merge every OTHER machine's
 * bundle found there. Bundles are named per host so machines never clobber each
 * other. Returns what was pushed/merged; embedding of new rows is left to the
 * caller (`memory embed`).
 */
export async function syncDrive(opts: {
  driveDir: string;
  keyFile?: string;
  dbPath?: string;
  /** Sync depth (plan 08 §7). Omitted → the persisted setting (getSyncLevel). */
  level?: SyncLevel;
  /** This machine's identity for the delta series. Omitted → os.hostname().
   *  A seam for tests (to simulate two machines) and multi-identity setups. */
  host?: string;
  /** Build vectors for new rows at the end (default true). Off in tests that
   *  exercise the sync protocol, not the embedder. */
  embed?: boolean;
}): Promise<DriveSyncResult> {
  const dir = opts.driveDir.trim();
  if (!dir) throw new Error("No Drive folder linked.");
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`Drive folder not found: ${dir}`);
  // Capture THIS machine's latest transcripts into the DB FIRST, so the bundle
  // we upload can never miss the newest chat lines when switching machines.
  const scanReport = scan({ dbPath: opts.dbPath });
  const excludeLanes = getScopeExclude(); // scoped sync: same list both directions
  const host = opts.host ? opts.host.replace(/[^A-Za-z0-9._-]/g, "_") : sanitizeHost();
  const level = opts.level ?? getSyncLevel();

  // ── MỘT KHO CHÍNH: GỘP TRƯỚC, GHI SAU ───────────────────────────────────────
  // Thứ tự này là bắt buộc và là cả thiết kế: phải merge kho chính (+ mọi gói đời
  // cũ còn sót) vào kho local TRƯỚC, rồi mới xuất kho local đè lên kho chính. Làm
  // ngược lại thì gói mình ghi lên thiếu phần của máy kia ⇒ ghi đè là mất thật.
  // Ghi xong, kho chính = HỢP của cả hai bên, nên máy kia merge về cũng đủ.
  const release = level === "full" ? () => {} : acquireDriveLock(dir, host);
  const merged: DriveSyncResult["merged"] = [];
  let push: DriveSyncResult["push"];
  try {
    // Merge MỌI gói trong thư mục: kho chính (container nhiều khối) VÀ mọi file `.enc`
    // đời cũ còn sót — người dùng không phải dọn tay trước khi đổi sang lối một-file.
    // KHÔNG loại gói của chính máy này nữa: ở lối một-file, tên gói không còn nói "của
    // ai"; dedup theo CHỮ KÝ nội dung lo phần đó, và merge vốn idempotent.
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".enc"))) {
      const full = join(dir, f);
      if (isChunkContainer(full)) {
        merged.push(...(await mergeContainer(full, f, { dbPath: opts.dbPath, keyFile: opts.keyFile, excludeLanes })));
        continue;
      }
      let sig: string;
      try {
        sig = bundleSignature(full);
      } catch {
        continue; // vanished mid-listing → skip
      }
      if (isBundleMerged(f, sig, opts.dbPath)) {
        merged.push({ file: f, skipped: true });
        continue;
      }
      try {
        const r = await mergeMemoryBundle({ bundlePath: full, dbPath: opts.dbPath, keyFile: opts.keyFile, excludeLanes });
        markBundleMerged(f, sig, opts.dbPath);
        merged.push({ file: f, sessionsAdded: r.sessionsAdded, messagesAdded: r.messagesAdded });
      } catch (error) {
        merged.push({ file: f, error: error instanceof Error ? error.message : "merge failed" });
      }
    }
    push =
      level === "full"
        ? await pushToDrive({ dir, host, level, excludeLanes, keyFile: opts.keyFile, dbPath: opts.dbPath })
        : await pushAppend({ dir, host, excludeLanes, keyFile: opts.keyFile, dbPath: opts.dbPath });
  } finally {
    release();
  }
  // Build the semantic vector index for messages that still lack one — this
  // machine's freshly scanned lines AND the ones just merged from other machines.
  // Vectors are per-machine (keyed by local ids) so they never travel in a bundle;
  // embedding here keeps recall on THIS machine complete right after sync.
  // ONE bounded batch so the sync call stays responsive — a steady-state sync
  // (a handful of new messages) is fully covered; a large one-time backlog is
  // finished by `zemory memory embed --all` (vectorRemaining reports the rest).
  // Fail-open: if the model is unavailable, embedPending embeds 0 (FTS fallback).
  const embedded = opts.embed === false ? 0 : (await embedPending({ dbPath: opts.dbPath })).embedded;

  // Đóng dấu phiên bản của máy này lên kênh (chỉ đi lên — xem `publishChannelVersion`).
  // Đặt ở CUỐI, sau khi lượt sync đã qua phần nặng: tem chỉ nên xuất hiện khi máy này
  // thật sự chạy trót lọt bản đó, không phải khi nó vừa khởi động.
  publishChannelVersion(dir, appVersion(), host);

  return {
    driveDir: dir,
    scanned: { newMessages: scanReport.totals.newMessages, changedFiles: scanReport.changedFiles },
    exported: push.file,
    exportedBytes: push.bytes,
    level,
    push,
    merged,
    embedded,
    vectorRemaining: vectorRemaining(opts.dbPath),
  };
}

/**
 * Merge từng khối CHƯA merge của kho chính vào kho local.
 *
 * Dedup ở mức KHỐI, không ở mức FILE: kho chính đổi mỗi lần có máy nối thêm, nên chữ ký cả
 * file luôn khác ⇒ dùng nó thì lần sync nào cũng merge lại từ đầu. Khoá dedup là
 * `<tên file>#<số thứ tự khối>` kèm chữ ký của CHÍNH khối đó — số thứ tự một mình không đủ,
 * vì sau một lần gộp thì khối #0 là nội dung khác hẳn.
 *
 * Khối của chính máy này cũng được merge lại (rẻ: `INSERT OR IGNORE` không thêm gì) — đổi lấy
 * việc không phải đoán "khối này của ai" từ tên file.
 */
async function mergeContainer(
  containerPath: string,
  displayName: string,
  o: { dbPath?: string; keyFile?: string; excludeLanes: ScopeLane[] },
): Promise<DriveSyncResult["merged"]> {
  const out: DriveSyncResult["merged"] = [];
  const chunks = listChunks(containerPath);
  for (const chunk of chunks) {
    const tmp = mkdtempSync(join(tmpdir(), "zemory-chunk-"));
    const part = join(tmp, "chunk.enc");
    const label = `${displayName}#${chunk.index}`;
    try {
      await extractChunk(containerPath, chunk, part);
      const sig = bundleSignature(part);
      if (isBundleMerged(label, sig, o.dbPath)) {
        out.push({ file: label, skipped: true });
        continue;
      }
      const r = await mergeMemoryBundle({ bundlePath: part, dbPath: o.dbPath, keyFile: o.keyFile, excludeLanes: o.excludeLanes });
      markBundleMerged(label, sig, o.dbPath);
      out.push({ file: label, sessionsAdded: r.sessionsAdded, messagesAdded: r.messagesAdded });
    } catch (error) {
      out.push({ file: label, error: error instanceof Error ? error.message : "merge failed" });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  return out;
}

// ── TEM PHIÊN BẢN TRÊN KÊNH CHUNG ─────────────────────────────────────────────
//
// Bài toán: máy A `git pull` + build xong thì các repo TRÊN MÁY A được chip vàng nhắc
// (`syncCheck`, 2026-08-21) — nhưng máy B **mù hoàn toàn**, không ai báo nó rằng có bản
// mới. Sổ đã ghi đúng triệu chứng: *"Repo CÙNG máy làm được NGAY; máy kia chờ push."*
//
// Vì sao đi qua DRIVE chứ không hỏi GitHub (user chốt 2026-08-23):
//   · kênh này đã là đường xuyên máy được hiến pháp phê (điều 16), và **mọi máy đã poll
//     nó 30 phút/lần** qua autosync ⇒ KHÔNG thêm lớp mạng, KHÔNG thêm đồng hồ (điều 1);
//   · hỏi GitHub thì đụng điều 7 (local-only), thêm phụ thuộc mạng + rate-limit, đổi lấy
//     đúng một con số.
// Tệp chỉ chứa SỐ HIỆU — không dữ liệu người dùng — nên KHÔNG mã hoá (khác bundle `.enc`).

/** Tem phiên bản đặt cạnh kho chính: `<driveDir>/version.json`. */
export interface ChannelVersion {
  /** Semver CAO NHẤT từng thấy trên kênh. */
  latest: string;
  /** Commit đã build ra bản đó (rỗng nếu không tra được — không chặn). */
  commit?: string;
  at: string;
  /** Máy đã đóng dấu — để người đọc biết hỏi ai nếu bản đó hỏng. */
  host: string;
}

const VERSION_STAMP = "version.json";

/** So semver. Trả >0 nếu a mới hơn b. Phần không phải số ⇒ coi là 0 (fail-open). */
export function cmpSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Đọc tem của kênh. Fail-open: thiếu Drive / thiếu file / JSON hỏng ⇒ `null`. */
export function readChannelVersion(driveDir: string): ChannelVersion | null {
  try {
    const f = join(driveDir, VERSION_STAMP);
    if (!existsSync(f)) return null;
    const v = JSON.parse(readFileSync(f, "utf8")) as Partial<ChannelVersion>;
    return typeof v.latest === "string" && v.latest ? { latest: v.latest, commit: v.commit, at: v.at ?? "", host: v.host ?? "?" } : null;
  } catch {
    return null;
  }
}

/**
 * Đóng dấu phiên bản của MÁY NÀY lên kênh — chỉ khi nó MỚI HƠN tem đang có.
 *
 * Ràng buộc "chỉ đi lên" là cả thiết kế: một máy còn chạy bản cũ mà ghi đè tem thì nó
 * **kéo lùi** cảnh báo của mọi máy khác, và bệnh đó im lặng (ai cũng thấy "đã mới nhất").
 * Cùng doctrine ADDITIVE của điều 11 — kênh chung chỉ được đi tới.
 *
 * Fail-open (điều 9): ghi hỏng thì thôi, KHÔNG được làm chết lượt sync.
 */
export function publishChannelVersion(driveDir: string, version: string, host: string, commit?: string): ChannelVersion | null {
  try {
    if (!version) return null;
    const cur = readChannelVersion(driveDir);
    if (cur && cmpSemver(version, cur.latest) <= 0) return cur;
    const next: ChannelVersion = { latest: version, commit, at: new Date().toISOString(), host };
    writeFileSync(join(driveDir, VERSION_STAMP), JSON.stringify(next, null, 2) + "\n", "utf8");
    return next;
  } catch {
    return null;
  }
}

/**
 * NỐI THÊM phần mới của máy này vào kho chính — đường ghi mặc định từ 2026-08-12.
 *
 * Không có gì mới ⇒ KHÔNG chạm file. Đây là điều kiện để một thư mục đồng bộ không bị đánh
 * thức vô cớ mỗi 30 phút.
 *
 * Gộp khi số khối vượt ngưỡng: viết container MỚI (một khối, `since=0`) ra file tạm rồi đổi
 * tên đè lên — bản cũ lùi thành `.bak`. Đổi tên là thao tác nguyên tử trong cùng ổ đĩa, nên
 * không có khoảnh khắc nào kho chính tồn tại ở trạng thái nửa vời.
 */
async function pushAppend(o: {
  dir: string;
  host: string;
  excludeLanes: ScopeLane[];
  keyFile?: string;
  dbPath?: string;
}): Promise<DriveSyncResult["push"]> {
  const { dir, host, excludeLanes, keyFile, dbPath } = o;
  const mainPath = join(dir, MAIN_BUNDLE);
  const wmKey = `drive:${host}`;
  const chunks = existsSync(mainPath) && isChunkContainer(mainPath) ? listChunks(mainPath) : [];
  const compacting = chunks.length >= MAIN_COMPACT_CHUNKS;
  const since = compacting || chunks.length === 0 ? 0 : readExportWatermark(wmKey, dbPath);

  const tmp = mkdtempSync(join(tmpdir(), "zemory-push-"));
  const part = join(tmp, "part.enc");
  try {
    const r = await exportMemoryBundle({
      outPath: part,
      dbPath,
      keyFile,
      force: true,
      excludeLanes,
      ...(since ? { sinceMessageId: since } : {}),
    });
    if (!r.rows || r.rows.messages === 0) {
      return { kind: "none", file: "", bytes: 0, messages: 0, removed: 0 };
    }
    let removed = 0;
    let written = 0; // byte THẬT SỰ ghi thêm lượt này — xem chú thích ở `bytes` bên dưới
    if (compacting) {
      // Container MỚI chỉ một khối; bản cũ giữ đúng MỘT thế hệ làm đường lùi.
      const fresh = join(tmp, "fresh.enc");
      writeFileSync(fresh, CHUNKS_MAGIC);
      written = appendChunk(fresh, part);
      if (existsSync(mainPath)) {
        rmSync(join(dir, MAIN_BAK), { force: true });
        renameSync(mainPath, join(dir, MAIN_BAK));
      }
      renameSync(fresh, mainPath);
      removed = chunks.length;
    } else {
      written = appendChunk(mainPath, part);
    }
    // ĐÁNH DẤU KHỐI CỦA CHÍNH MÌNH LÀ ĐÃ MERGE.
    // Nội dung khối này lấy ra từ kho local, nên merge lại nó vào chính kho đó là việc
    // thừa 100%. Không đánh dấu thì mỗi lượt sync sau phải GIẢI MÃ lại nguyên khối chỉ để
    // phát hiện "0 dòng mới" — với khối cỡ 336 MB thì đó là vài chục giây và một lượt đọc
    // cả file, đúng thứ lối nối-thêm sinh ra để tránh. (Bắt được nhờ ca `receiver dedup`.)
    const after = listChunks(mainPath);
    const mine = after[after.length - 1];
    if (mine) {
      const tmp2 = mkdtempSync(join(tmpdir(), "zemory-mark-"));
      try {
        const copy = join(tmp2, "mine.enc");
        await extractChunk(mainPath, mine, copy);
        markBundleMerged(`${MAIN_BUNDLE}#${mine.index}`, bundleSignature(copy), dbPath);
      } finally {
        rmSync(tmp2, { recursive: true, force: true });
      }
    }
    writeExportWatermark(wmKey, r.rows.maxMessageId, dbPath);
    return {
      kind: compacting ? "compact" : chunks.length === 0 ? "baseline" : "delta",
      file: MAIN_BUNDLE,
      // Byte GHI THÊM lượt này, KHÔNG phải kích thước cả kho chính. Đây là con số người
      // dùng cần: nó nói lượt sync vừa rồi tốn bao nhiêu. Báo kích thước cả file thì mỗi
      // lượt sync đều hiện ~336 MB và cảm giác "nối thêm rẻ" biến mất khỏi màn hình dù
      // thực tế chỉ ghi 100 KB.
      bytes: written,
      messages: r.rows.messages,
      removed,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Write this machine's changes into the Drive folder.
 *
 * FULL depth → one whole-DB snapshot (`global_memory.<host>.zemory.enc`),
 * overwritten each sync; the delta series (if any) is cleared so the two schemes
 * never coexist for one host.
 *
 * LEAN depth → a delta series. Rules:
 *  • no series yet → write a BASELINE (all rows, since=0) as seq 0; drop any
 *    legacy single-file bundle it supersedes.
 *  • series exists, few files → write a DELTA (rows past the watermark). Empty
 *    delta (nothing new) → write nothing.
 *  • series exists, many files (≥ DRIVE_COMPACT_AT) → COMPACT: write a fresh
 *    baseline as the next seq, then delete all older files. The baseline is a
 *    superset of the deletes, so no receiver can lose data.
 *
 * The watermark (`sync_state` key `drive:<host>`) tracks the highest local
 * message id already shipped in the series.
 */
async function pushToDrive(o: {
  dir: string;
  host: string;
  level: SyncLevel;
  excludeLanes: ScopeLane[];
  keyFile?: string;
  dbPath?: string;
}): Promise<DriveSyncResult["push"]> {
  const { dir, host, level, excludeLanes, keyFile, dbPath } = o;

  if (level === "full") {
    // Disaster-restore snapshot: one self-contained file, overwritten each sync.
    const name = legacyName(host);
    const r = await exportMemoryBundle({ outPath: join(dir, name), dbPath, keyFile, force: true, excludeLanes, payload: "full" });
    // A prior lean series is now redundant (the full snapshot carries everything).
    for (const s of listMySeries(dir, host)) rmSync(join(dir, s.file), { force: true });
    // "full" payload carries no rows stats (whole-file snapshot, not row-tracked),
    // so record the watermark separately — it's what the UI sync-progress donut
    // reads (drive:<host> in sync_state), and every message is in this snapshot.
    const wdb = openMemory(dbPath);
    try {
      const maxId = (wdb.prepare("SELECT COALESCE(MAX(id),0) m FROM messages").get() as { m: number }).m;
      writeExportWatermark(`drive:${host}`, maxId, dbPath);
    } finally {
      wdb.close();
    }
    return { kind: "full", file: name, bytes: r.bundleBytes, messages: 0, removed: 0 };
  }

  const wmKey = `drive:${host}`;
  const series = listMySeries(dir, host);
  const nextSeq = series.length ? series[series.length - 1].seq + 1 : 0;

  // BASELINE — no series yet, or a scheduled compaction folds the deltas back in.
  const compacting = series.length >= DRIVE_COMPACT_AT;
  if (series.length === 0 || compacting) {
    const name = seriesName(host, nextSeq);
    const r = await exportMemoryBundle({ outPath: join(dir, name), dbPath, keyFile, force: true, excludeLanes });
    if (!r.rows || r.rows.messages === 0) {
      rmSync(join(dir, name), { force: true }); // empty memory → nothing to publish
      return { kind: "none", file: "", bytes: 0, messages: 0, removed: 0 };
    }
    writeExportWatermark(wmKey, r.rows.maxMessageId, dbPath);
    let removed = 0;
    if (compacting) {
      // The new baseline is a superset of every older file → deleting them cannot
      // lose data for any receiver (worst case they re-merge the baseline).
      for (const s of series) {
        rmSync(join(dir, s.file), { force: true });
        removed++;
      }
    } else {
      rmSync(join(dir, legacyName(host)), { force: true }); // supersede a legacy single file
    }
    return { kind: compacting ? "compact" : "baseline", file: name, bytes: r.bundleBytes, messages: r.rows.messages, removed };
  }

  // DELTA — only rows added since the last shipped watermark.
  const since = readExportWatermark(wmKey, dbPath);
  const name = seriesName(host, nextSeq);
  const r = await exportMemoryBundle({ outPath: join(dir, name), dbPath, keyFile, force: true, excludeLanes, sinceMessageId: since });
  if (!r.rows || r.rows.messages === 0) {
    rmSync(join(dir, name), { force: true }); // nothing new this sync
    return { kind: "none", file: "", bytes: 0, messages: 0, removed: 0 };
  }
  writeExportWatermark(wmKey, r.rows.maxMessageId, dbPath);
  return { kind: "delta", file: name, bytes: r.bundleBytes, messages: r.rows.messages, removed: 0 };
}

export function writeMemoryShareKey(path: string, opts: { force?: boolean } = {}): string {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  const key = randomBytes(32).toString("base64");
  writeFileSync(path, key + "\n", { flag: opts.force ? "w" : "wx", mode: 0o600 });
  return path;
}

/** Đường CHUẨN của chìa share: cạnh DB, KHÔNG phải trong repo.
 *
 *  Vì sao cần hàm này thay vì để người dùng tự đoán: `currentMemoryDir()` di động được
 *  (`memory relocate` dời DB khỏi ổ hệ thống), nên "chìa ở data/" là câu nói SAI trên máy
 *  chưa relocate — ở đó DB nằm `~/.zemory/`. Máy thứ hai KHÔNG cần clone repo zemory;
 *  `npm i -g zemory` là đủ, và chìa đi cạnh DB của máy đó. */
export function shareKeyPath(dbDir = currentMemoryDir()): string {
  return join(dbDir, "share.key");
}

/** Dấu tay của một chuỗi bí mật — 8 hex đầu của sha256.
 *
 *  Đây là phần đáng giá nhất của cả luồng mang-chìa-bằng-tay: lỗi thật khi gõ lại chìa ở
 *  máy khác là GÕ SAI, mà hôm nay gõ sai chỉ lộ ra dưới dạng "unable to authenticate data"
 *  sau khi import xong một bundle 254 MB. So dấu tay là tức thì. KHÔNG in giá trị chìa ra
 *  bất kỳ đâu: phiên agent bị ingest vào chính global_memory.db, nên in chìa ra là nhét nó
 *  vào cái nó bảo vệ, rồi nó theo bundle lên Drive. */
export function shareKeyFingerprint(secret: string): string {
  return createHash("sha256").update(secret.trim(), "utf8").digest("hex").slice(0, 8);
}

export interface SetShareKeyResult {
  path: string;
  fingerprint: string;
  replaced: boolean;
}

/** Ghi một chìa ĐANG CÓ vào đường chuẩn (luồng "thêm máy thứ hai").
 *
 *  Khác `writeMemoryShareKey` (sinh chìa MỚI random — dùng cho máy ĐẦU TIÊN): hàm này nhận
 *  chìa người dùng mang tới. Trước đây không có đường nào làm việc này, nên ở máy thứ hai
 *  người dùng phải tự biết đường dẫn rồi tạo file bằng editor — và không có cách nào kiểm
 *  mình gõ đúng chưa. */
export function setShareKey(secret: string, opts: { dbDir?: string; force?: boolean } = {}): SetShareKeyResult {
  const value = secret.trim();
  if (!value) throw new Error("Chìa rỗng — không ghi.");
  // Chìa là passphrase tuỳ ý (readShareSecret nhận mọi chuỗi UTF-8), nhưng quá ngắn thì
  // bundle trên kênh chia sẻ chỉ được che bởi vài bit. Chặn trước khi nó thành thói quen.
  if (value.length < 16) throw new Error(`Chìa quá ngắn (${value.length} ký tự) — cần ≥ 16.`);
  if (/\s/.test(value)) throw new Error("Chìa không được chứa khoảng trắng (dùng '-' để nối từ).");
  const path = shareKeyPath(opts.dbDir);
  const replaced = existsSync(path);
  if (replaced && !opts.force) {
    throw new Error(`Đã có chìa ở ${path} — thêm --force nếu muốn thay (bundle cũ sẽ KHÔNG giải được nữa).`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${value}\n`, { mode: 0o600 });
  return { path, fingerprint: shareKeyFingerprint(value), replaced };
}

/** Trạng thái chìa hiện tại — CHỈ dấu tay + đường dẫn, không bao giờ trả giá trị. */
export function shareKeyStatus(projectRoot: string, dbDir = currentMemoryDir()): {
  found: boolean;
  path?: string;
  fingerprint?: string;
  source: "file" | "env" | "none";
} {
  const file = resolveShareKey(projectRoot);
  if (file) {
    return { found: true, path: file, fingerprint: shareKeyFingerprint(readFileSync(file, "utf8")), source: "file" };
  }
  const env = process.env.ZEMORY_SHARE_KEY?.trim();
  if (env) return { found: true, fingerprint: shareKeyFingerprint(env), source: "env" };
  return { found: false, source: "none", path: shareKeyPath(dbDir) };
}
