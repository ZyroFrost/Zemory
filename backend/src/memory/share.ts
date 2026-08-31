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
  truncateSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { currentMemoryDb, currentMemoryDir, openMemory } from "./db.js";
import { scan } from "./ingest.js";
import { embedFrontierId, embedPending, pruneOrphanVectors, vectorRemaining } from "./vectors.js";
import { messageKey, receiveVectorsFrom, shipVectorsInto } from "./vecship.js";
import { markVectorsShipped, unshippedVectorIds } from "./vectors.js";
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
  /**
   * GÓI BÙ VECTOR: id tin CŨ cần chở vector dù tin không nằm trong gói. Dùng cho
   * `memory vectors-catchup` — bù phần kho chung còn thiếu bằng cách NỐI THÊM một khối nhỏ,
   * KHÔNG ghi đè kho chung (HP điều 16). Gói khi đó có thể 0 tin mà vẫn có ích.
   */
  vectorCatchUpIds?: number[];
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
  /** Id tin (kho nguồn) có vector chính đã vào gói — bên gọi ghi `vec_shipped` SAU khi nối xong. */
  vectorShippedIds?: number[];
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
  opts: { excludeLanes?: ScopeLane[]; since?: number; until?: number; attachments?: boolean },
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
      // CHẶN TRÊN = ranh giới đã nhúng (`embedFrontierId`): tin chưa có vector thì để chuyến
      // sau đi CÙNG vector của nó (HP điều 16). Số nội suy thẳng vì nó là `number` đã ép kiểu —
      // cùng nếp `vecship.ts`, không rải chuỗi ngoài vào SQL.
      const untilSql = opts.until !== undefined ? ` AND id <= ${Number(opts.until)}` : "";
      const deltaSessions =
        since > 0 ? ` AND id IN (SELECT DISTINCT session_id FROM src.messages WHERE id > ?${untilSql})` : "";

      const stats: RowsStats = { sessions: 0, messages: 0, since, maxMessageId: 0, attachments: 0 };
      db.transaction(() => {
        const maxInStore = (db.prepare("SELECT COALESCE(MAX(id),0) m FROM src.messages").get() as { m: number }).m;
        // Watermark = id CAO NHẤT ĐÃ GỬI, không phải id cao nhất trong kho. Lấy nhầm cái sau
        // thì phần bị chặn lại (tin chưa có vector) bị đánh dấu "đã gửi" và mất vĩnh viễn.
        stats.maxMessageId = opts.until !== undefined ? Math.min(maxInStore, opts.until) : maxInStore;
        db.exec("INSERT INTO main.schema_version SELECT * FROM src.schema_version");
        db.prepare(
          `INSERT INTO main.sessions SELECT * FROM src.sessions WHERE 1=1${deltaSessions}${notExcluded("id")}`,
        ).run(...(since > 0 ? [since] : []), ...excl.params);
        // `id` is local AUTOINCREMENT — omitted so it never travels (merge keys on
        // UNIQUE(session_id, uuid) / content identity, never on id).
        db.prepare(
          `INSERT INTO main.messages (session_id, uuid, role, content, tool_name, timestamp)
             SELECT session_id, uuid, role, content, tool_name, timestamp FROM src.messages
             WHERE id > ?${untilSql}${notExcluded("session_id")}`,
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
              WHERE m.id > ?${untilSql.replace(/ AND id /, " AND m.id ")}${notExcluded("m.session_id")}`,
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
  // TIN VÀ VECTOR ĐI CÙNG CHUYẾN (HP điều 16): dừng gói ngay TRƯỚC tin đầu tiên chưa nhúng.
  // Không có gì phải chờ ⇒ `null` ⇒ hành vi y như cũ. Xem `embedFrontierId` để biết vì sao.
  //
  // 🔴 CHỈ ÁP CHO DELTA (`sinceMessageId > 0`). Với `since = 0` — baseline, **GỘP container**,
  // bàn giao máy — gói là bản THAY THẾ chứ không phải phần thêm: gộp ghi đè kho chung, nên cắt
  // ở ranh giới đã nhúng sẽ **xoá khỏi kênh** những tin nằm trên ranh giới mà container cũ đang
  // có. Tin không mất khỏi máy (còn cả trong `.bak`) nhưng kênh hụt cho tới lượt sync sau, và
  // máy nào merge trúng cửa sổ đó thì nhận thiếu. Giữa "kênh thiếu VECTOR" và "kênh thiếu TIN",
  // thiếu tin nặng hơn — vector còn bù được bằng `vectors-catchup`, tin thì không.
  const frontier = payload === "rows" && opts.sinceMessageId ? embedFrontierId(sourcePath) : null;
  const until = frontier && frontier > 0 ? frontier - 1 : undefined;
  const snapshot =
    payload === "rows"
      ? buildRowsSnapshot(sourcePath, {
          excludeLanes: opts.excludeLanes,
          since: opts.sinceMessageId,
          until,
          attachments: getSyncAttachments(),
        })
      : await snapshotSqlite(sourcePath);
  const rows = "stats" in snapshot ? (snapshot.stats as RowsStats) : undefined;
  try {
    // CHỞ KÈM VECTOR (2026-08-12): máy nhận merge xong là dùng được hybrid ngay, thay vì có
    // đủ chữ mà recall rơi về FTS cho tới khi nhúng lại xong (đo: FTS-thuần @10 26% nghiêm /
    // 50% tương đương, so với hybrid 38% / 71% — mất hơn một nửa, đúng phần "hiểu ý câu hỏi").
    // Chỉ áp cho payload "rows": bản "full" vốn đã là ảnh chụp nguyên kho, có sẵn vector.
    const shipped =
      payload === "rows" ? shipVectorsInto(snapshot.path, sourcePath, opts.sinceMessageId, opts.vectorCatchUpIds) : null;
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
      ...(shipped ? { vectorsShipped: shipped.shipped, vectorsRejected: shipped.rejected, vectorShippedIds: shipped.shippedIds } : {}),
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
               )
               -- Khử trùng NGAY TRONG gói tới: NOT EXISTS ở trên chỉ so với hàng ĐÃ CÓ, nên hai bản
               -- giống nhau trong cùng một gói đều được chèn (đo 2026-08-27: kho chung mang 10.271 bản
               -- trùng NULL từ một máy, dựng lại ra 21.502 hàng). Giữ bản có rowid nhỏ nhất.
               AND s.rowid = (
                 SELECT MIN(d.rowid) FROM src.messages d
                 WHERE d.session_id = s.session_id AND d.uuid IS NULL
                   AND d.role IS s.role AND d.timestamp IS s.timestamp AND d.content IS s.content
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
  merged: { file: string; sessionsAdded?: number; messagesAdded?: number; skipped?: boolean; error?: string;
    /** Bỏ qua bằng CHỮ KÝ ĐỌC TẠI CHỖ, KHÔNG chép khối ra ngoài (`plan/08 §8c` ①). Trưng ra để
     *  cổng test đo được — không có cờ này thì "đã bỏ qua" và "đã chép rồi mới bỏ qua" nhìn y hệt
     *  nhau, và cổng canh nó thành trang trí (đột biến 2026-08-25 bắt đúng ca đó). */
    cheap?: boolean }[];
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
// ── KHO CHIA KHÚC (user chốt 2026-08-30 — HP điều 16 sửa đổi, spec `plan/08 §8e`) ───────────
// Gốc bệnh ĐO ĐƯỢC: Drive không upload delta ⇒ nối 0,3 MB vào file 2.066 MB là DriveFS
// re-upload CẢ 2 GB, 10–20 lượt/ngày ≈ 20–40 GB qua tầng ổ ảo ⇒ DriveFS treo cứng tầng OS
// 2 lần/giờ (30/08), kéo daemon chết theo. Chia khúc: khúc 1 giữ tên cũ `global_memory.enc`
// (tương thích ngược), đầy `SEGMENT_MAX` thì NIÊM PHONG và mở `global_memory.002.enc`… —
// mỗi lượt append chỉ đụng khúc ĐANG MỞ (≤256 MB), khúc niêm phong là BẤT BIẾN, Drive không
// bao giờ upload lại nó. Chiều ĐỌC không đổi: vòng merge vốn quét mọi `.enc` và dedup theo
// `tên-file#khối` + chữ ký. Dãy khúc là thứ tự TOÀN CỤC chung mọi máy — KHÔNG phải series
// theo máy (thứ điều 16 cấm và vẫn cấm).
function segmentMaxBytes(): number {
  const v = Number(process.env.ZEMORY_SEGMENT_MAX ?? "");
  return Number.isFinite(v) && v > 0 ? v : 256 * 1024 * 1024;
}
const SEGMENT_RE = /^global_memory\.(\d{3})\.enc$/;
function segmentName(n: number): string {
  return n <= 1 ? MAIN_BUNDLE : `global_memory.${String(n).padStart(3, "0")}.enc`;
}
/** Mọi khúc đang có, theo thứ tự — khúc 1 là `global_memory.enc`, kế là `.002`, `.003`… */
function listSegments(dir: string): { path: string; n: number }[] {
  const out: { path: string; n: number }[] = [];
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  if (names.includes(MAIN_BUNDLE)) out.push({ path: join(dir, MAIN_BUNDLE), n: 1 });
  for (const f of names) {
    const m = SEGMENT_RE.exec(f);
    if (m) out.push({ path: join(dir, f), n: Number(m[1]) });
  }
  return out.sort((a, b) => a.n - b.n);
}
/** Khúc sẽ NHẬN lượt ghi kế: khúc cuối nếu còn chỗ, không thì khúc kế (chưa tồn tại). */
function activeSegment(dir: string): { path: string; name: string; fresh: boolean } {
  const segs = listSegments(dir);
  if (segs.length === 0) return { path: join(dir, MAIN_BUNDLE), name: MAIN_BUNDLE, fresh: true };
  const last = segs[segs.length - 1];
  let full = false;
  try {
    full = statSync(last.path).size >= segmentMaxBytes();
  } catch {
    /* biến mất giữa chừng — coi như chưa đầy, appendChunkVerified sẽ tự dựng */
  }
  if (!full) return { path: last.path, name: basename(last.path), fresh: false };
  const name = segmentName(last.n + 1);
  return { path: join(dir, name), name, fresh: true };
}

interface DriveLock {
  host: string;
  pid: number;
  at: string;
  /** v2: chủ khoá có ĐẬP NHỊP (chạm lại `at` mỗi `LOCK_BEAT_MS`). Thiếu cờ = bản CŨ, phải đọc
   *  bằng ngưỡng mồ côi RỘNG — xem `lockStaleMs()`. */
  beat?: boolean;
}

/** Nhịp tim: chủ khoá chạm lại `at` mỗi 30 giây khi còn đang làm việc. */
const LOCK_BEAT_MS = 30_000;
/** Lỡ 3 nhịp mới coi là chết. Một nhịp lỡ vì máy bận KHÔNG phải là chết (cùng doctrine
 *  `02_RULES` §Bề mặt CHẾT THEO nền: phải trượt LIÊN TIẾP N nhịp mới kết luận). */
const LOCK_BEAT_MISSES = 3;
/** Chờ tới lượt: nới rộng dần, trần mỗi nhịp chờ. KHÔNG có trần TỔNG — user chốt "thấy máy kia
 *  đang ghi thì đợi, chạy sau"; bỏ cuộc là quay lại đúng hành vi cũ. */
const LOCK_WAIT_STEP_MAX_MS = 30_000;

/**
 * Ngưỡng coi khoá là MỒ CÔI, phụ thuộc chủ khoá có đập nhịp hay không.
 *
 * 🔴 Vì sao KHÔNG dùng một ngưỡng chung: máy chạy bản cũ (≤2.6.0) ghi khoá MỘT LẦN rồi làm việc
 * hàng chục phút. Áp ngưỡng nhịp-tim (90 s) lên nó là **cướp khoá giữa chừng** — tái tạo đúng lỗi
 * đang đi vá, chỉ đổi chiều. Đo 2026-08-25: máy kia nối khối lúc 13:08 khi khoá của máy này đã quá
 * 15 phút, làm hỏng cả lượt sync lẫn lượt bù vector.
 */
const lockStaleMs = (l: DriveLock): number => (l.beat ? LOCK_BEAT_MS * LOCK_BEAT_MISSES : LOCK_STALE_MS);

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

/** Số lần thử nối trước khi chịu thua (`plan/08 §8c` ④ — vế "tối đa 3 lần", trước nay chưa build). */
const APPEND_ATTEMPTS = 3;

/**
 * Một lượt nối là THÀNH hay BẠI — quyết bằng SỐ KHỐI ĐẾM ĐƯỢC, không bằng việc có ném hay không.
 *
 * Tách thành hàm thuần vì đây là chỗ ĐẢO NGƯỢC so với bản cũ, và là chỗ duy nhất đáng canh bằng
 * cổng: bản cũ để ngoại lệ phán, nên lượt 26/08 bị coi là hỏng dù khối đã nằm đủ trên kênh.
 * `threw && đếm đủ ⇒ "ok"` chính là ca đó, viết thẳng ra để không ai vô tình lật lại.
 */
export function appendVerdict(threw: boolean, afterCount: number, expected: number): "ok" | "ok-despite-error" | "retry" {
  if (afterCount !== expected) return "retry"; // đếm sai ⇒ bại, kể cả khi KHÔNG ném
  return threw ? "ok-despite-error" : "ok"; // đếm đủ ⇒ thành, kể cả khi CÓ ném
}

/**
 * Nối một khối rồi **ĐẾM LẠI KHỐI** để phán thành/bại — không hỏi ngoại lệ.
 *
 * 🔴 NGOẠI LỆ KHÔNG PHẢI TRỌNG TÀI, TRẠNG THÁI CONTAINER MỚI LÀ (2026-08-26). Lượt auto-sync
 * 05:45 ném `UNKNOWN: unknown error, write` — libuv không map nổi mã lỗi Windows mà Google Drive
 * File Stream trả về — **trong khi khối đã nằm ĐỦ trên kênh**: đo lại thấy 40 khối, 0 byte rác,
 * khối cuối đúng độ dài. Tin lời ngoại lệ là vứt một khối đã ghi được, rồi lượt sau xuất lại
 * đúng dải đó và nối thêm bản TRÙNG — đo được: khối #37 và #39 khớp từng byte (22.270.367 byte
 * / 3.812 tin), kênh chung phình bằng bản sao chứ không phải dữ liệu mới.
 *
 * Vì sao phải CẮT trước khi thử lại: một lượt nối dở để lại byte thừa ở đuôi, mà `listChunks`
 * gặp byte thừa là DỪNG ⇒ nối tiếp lên đó sẽ **chôn sống mọi khối phía sau**. Cắt về đúng chiều
 * dài trước lúc nối là cách duy nhất để lần thử sau không đẻ ra một kiểu hỏng tệ hơn cái đang vá.
 */
/**
 * Đọc-để-đếm khối, CHỊU ĐƯỢC CHẬP — bọc `listChunks` bằng thử-lại đồng bộ cho đúng họ lỗi transient.
 *
 * Vì sao phải có (đo 2026-08-30, lượt 04:18Z): ghi XONG, embed XONG (backlog về 0 lần đầu trong ngày),
 * nhưng cú ĐỌC LẠI để xác minh dính `UNKNOWN: unknown error, read` của Google Drive File Stream và ném
 * XUYÊN ra ngoài — cả lượt sync 40 phút chết vì một cú đọc chập, watermark không nhích, 6.054 tin phải
 * xếp hàng chờ lượt sau. Chiều ghi đã có 3 lần thử (`appendChunkVerified`), chiều đọc-merge đã có
 * `withDriveRetry` — đúng MỘT phép đọc này lọt lưới. Sleep đồng bộ bằng `Atomics.wait` (hàm gọi là sync,
 * đổi sang async là đổi chữ ký lan ra cả test); chờ ngắn 300ms→1200ms vì transient của Drive thường
 * qua trong dưới một giây (đo các lượt withDriveRetry trước).
 */
function listChunksRetry(path: string, what: string): ChunkRef[] {
  let wait = 300;
  for (let attempt = 1; ; attempt++) {
    try {
      return listChunks(path);
    } catch (e) {
      if (attempt >= DRIVE_READ_ATTEMPTS || !isTransientFsError(e)) throw e;
      const code = (e as NodeJS.ErrnoException).code;
      console.error(`[sync] ${what}: đọc-đếm khối chập (${code}) — thử lại ${attempt + 1}/${DRIVE_READ_ATTEMPTS} sau ${wait} ms.`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait);
      wait *= 2;
    }
  }
}

export function appendChunkVerified(containerPath: string, bundlePath: string, expected: number): number {
  const sizeBefore = existsSync(containerPath) ? statSync(containerPath).size : 0;
  let written = 0;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= APPEND_ATTEMPTS; attempt++) {
    try {
      written = appendChunk(containerPath, bundlePath);
      lastErr = null;
    } catch (e) {
      lastErr = e; // giữ lại để báo nếu ĐẾM cũng nói hỏng — nhưng chưa kết luận gì
    }
    // Đường đo THỨ HAI, khác cơ chế với lời của `appendFileSync` (`02_RULES §Hành xử`).
    const after = existsSync(containerPath) ? listChunksRetry(containerPath, "xác minh sau khi nối") : [];
    const tail = after[after.length - 1];
    const verdict = appendVerdict(lastErr !== null, after.length, expected);
    if (verdict !== "retry" && tail) {
      if (verdict === "ok-despite-error") {
        // Ghi ra để lượt sau còn biết chuyện này CÓ xảy ra — stderr của con nay được giữ lại.
        console.error(
          `[sync] nối khối ném "${lastErr instanceof Error ? lastErr.message : String(lastErr)}" ` +
            `nhưng đếm lại thấy ĐỦ ${after.length} khối ⇒ coi là ĐÃ NỐI (kênh Drive báo lỗi giả).`,
        );
      }
      return written || tail.len;
    }
    // CẮT SAU MỌI LẦN TRƯỢT — kể cả lần CUỐI. Bản đầu của chính lượt vá này chỉ cắt khi còn lượt
    // thử tiếp, nên lần thử thứ ba để lại nguyên phần mình vừa ghi trên kênh chung (cổng bắt
    // được: container 149 byte thay vì 132). Đó đúng là thứ đang đi vá: byte thừa ở đuôi làm
    // `listChunks` dừng sớm, và mọi khối nối sau nó trở thành vô hình với MỌI máy.
    console.error(`[sync] nối khối trượt (thấy ${after.length} khối, chờ ${expected}) — cắt về ${sizeBefore} byte.`);
    try {
      truncateSync(containerPath, sizeBefore);
    } catch (e) {
      throw new Error(
        `Nối khối trượt và KHÔNG cắt lại được đuôi container (${e instanceof Error ? e.message : String(e)}). ` +
          `Kho của máy này vẫn đủ; đừng sync tiếp cho tới khi soi lại ${containerPath}.`,
        { cause: e },
      );
    }
  }
  throw new Error(
    `Nối khối lên kho chung trượt sau ${APPEND_ATTEMPTS} lần` +
      `${lastErr ? `: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}` : ""}. ` +
      `Kho của máy này vẫn đủ; chạy \`zemory memory sync\` lại.`,
  );
}

/** Cắt một khối ra file rời để đi qua đúng đường merge sẵn có. */
/**
 * Chữ ký của MỘT KHỐI, đọc THẲNG trong container — không chép khối ra ngoài.
 *
 * 🔴 Vì sao cần: `mergeContainer` bản đầu giải nén **mọi** khối ra file tạm rồi mới hỏi "đã merge
 * chưa". Với container 1,7 GB thì mỗi lượt sync chép lại nguyên bằng ấy byte **chỉ để phát hiện
 * KHÔNG có gì mới** — đo 2026-08-25: một lượt sync đọc **2,4 GB** và mất ~1 giờ trên kênh
 * 0,55 MB/s, trong khi phần thật sự mới chỉ là một khối vài trăm KB.
 *
 * Chữ ký = `<độ dài>:<createdAt trong header>`, mà header là **plaintext nằm ở đầu khối** ⇒ đọc
 * 64 KB tại `chunk.offset` là đủ. Khối đã biết ⇒ bỏ qua với chi phí gần bằng 0.
 */
function chunkSignature(containerPath: string, chunk: ChunkRef): string {
  const fd = openSync(containerPath, "r");
  try {
    const probe = Buffer.alloc(Math.min(64 * 1024, chunk.len));
    readSync(fd, probe, 0, probe.length, chunk.offset);
    const firstNl = probe.indexOf(10, 0);
    const secondNl = firstNl >= 0 ? probe.indexOf(10, firstNl + 1) : -1;
    if (firstNl < 0 || secondNl < 0) return `${chunk.len}:`;
    const header = JSON.parse(probe.subarray(firstNl + 1, secondNl).toString("utf8")) as BundleHeader;
    return `${chunk.len}:${header.createdAt ?? ""}`;
  } catch {
    return `${chunk.len}:`; // header lạ ⇒ rơi về độ dài (vẫn phát hiện được khối bị viết lại)
  } finally {
    closeSync(fd);
  }
}

/** Số lần thử một phép ĐỌC trên kênh chung trước khi chịu thua. */
const DRIVE_READ_ATTEMPTS = 3;

/**
 * Mã lỗi CHẬP CHỜN của ổ đám mây — thử lại là qua, không phải hỏng thật.
 *
 * `UNKNOWN` là mã libuv trả về khi Windows đưa ra một mã lỗi nó **không map nổi** — đúng thứ
 * Google Drive File Stream sinh ra. Đo 2026-08-26: `vectors-catchup` chết ở phút 5:42 với
 * `UNKNOWN: unknown error, read`, chạy lại **y nguyên lệnh đó thì xong**, và một lượt đọc tuần
 * tự trọn 1.832 MB cùng buổi mất 42,9 s **không một lỗi** (42,7 MB/s). Ba dữ kiện đó cộng lại
 * loại hẳn giả thuyết "kênh hỏng/chậm": nó CHẬP.
 *
 * Cố ý KHÔNG nhận `ENOENT`/`EACCES`: file không có hoặc không có quyền là sự thật bền, thử lại
 * chỉ làm chậm rồi cũng báo đúng lỗi đó — và che mất lỗi cấu hình thật.
 */
const TRANSIENT_FS_CODES = new Set(["UNKNOWN", "EBUSY", "EIO", "EAGAIN", "ETIMEDOUT", "EPERM"]);

export function isTransientFsError(e: unknown): boolean {
  const code = (e as NodeJS.ErrnoException | null)?.code;
  return typeof code === "string" && TRANSIENT_FS_CODES.has(code);
}

/**
 * Thử lại một phép ĐỌC trên kênh chung khi ổ đám mây chập.
 *
 * Đối xứng với `appendChunkVerified` ở chiều GHI: chiều ghi tự đo lại bằng số khối, chiều đọc
 * không có gì để đo nên đường duy nhất là **thử lại**. Thiếu lớp này thì một cú chập duy nhất
 * giết cả lượt sync — mà lượt sync có thể đã chạy vài phút.
 */
export async function withDriveRetry<T>(what: string, fn: () => Promise<T>): Promise<T> {
  let wait = 500;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= DRIVE_READ_ATTEMPTS || !isTransientFsError(e)) throw e;
      const code = (e as NodeJS.ErrnoException).code;
      // `[sync]` là dấu để lớp trên GIỮ dòng này lại kể cả khi lượt chạy thành công — một cú
      // chập được nuốt lặng thì lần sau không ai biết kênh đang có vấn đề (xem `jobs/syncjob.ts`).
      console.error(`[sync] ${what}: lỗi chập chờn ${code} — thử lại ${attempt + 1}/${DRIVE_READ_ATTEMPTS} sau ${wait} ms.`);
      await sleep(wait);
      wait *= 2;
    }
  }
}

async function extractChunk(containerPath: string, chunk: ChunkRef, outPath: string): Promise<void> {
  await withDriveRetry(`đọc khối #${chunk.index}`, async () => {
    // Lượt trước có thể để lại file dở; cờ "wx" sẽ ném EEXIST và biến một cú chập đọc thành
    // một lỗi khác hẳn. Dọn trước khi thử lại.
    rmSync(outPath, { force: true });
    await pipeline(
      createReadStream(containerPath, { start: chunk.offset, end: chunk.offset + chunk.len - 1 }),
      createWriteStream(outPath, { flags: "wx" }),
    );
  });
}

/** Giành quyền ghi kho chính. Trả hàm nhả khoá; ném lỗi RÕ khi máy khác đang giữ.
 *  KHÔNG phải khoá thật (Drive không có khoá file) — nó chỉ thu hẹp cửa sổ tranh chấp và,
 *  quan trọng hơn, biến một lần giẫm chân im lặng thành một câu báo lỗi đọc được. */
function readDriveLock(path: string): DriveLock | null {
  try {
    const cur = JSON.parse(readFileSync(path, "utf8")) as DriveLock;
    return cur && typeof cur.host === "string" && typeof cur.at === "string" ? cur : null;
  } catch {
    return null; // chưa có khoá, hoặc rác — cả hai đều là "không ai giữ"
  }
}

/**
 * HÀNG ĐỢI GHI KHO CHUNG (`plan/08 §8c`, user chốt 2026-08-25:
 * *"thấy máy kia đang ghi thì máy mình phải đợi, chạy sau, sync sau"*).
 *
 * Bản trước KHÔNG phải hàng đợi: gặp khoá là **ném lỗi** bảo người dùng tự bấm lại, và khoá ghi
 * MỘT LẦN nên việc chạy lâu bị hiểu là chết. Hậu quả đo được 2026-08-25: lượt merge đọc ở
 * 0,55 MB/s giữ khoá ~1 giờ ⇒ quá ngưỡng mồ côi 15 phút ⇒ máy kia **hợp lệ** nối khối vào giữa
 * lúc máy này đang đọc ⇒ `UNKNOWN: unknown error, read`, hỏng cả lượt sync lẫn lượt bù vector.
 *
 * Nay: ĐỢI tới lượt (nới rộng dần) · ĐẬP NHỊP khi đang giữ · chỉ vào khi chủ cũ **chết thật**.
 *
 * `onWait` để bề mặt gọi in ra *"đang chờ máy X"* — xếp hàng phải NHÌN THẤY, không thì người dùng
 * đọc thành treo (`02_RULES`: vỏ rỗng là kiểu hỏng tệ nhất vì nó không báo lỗi, nó nói dối).
 */
async function acquireDriveLock(
  dir: string,
  host: string,
  opts: { onWait?: (holder: string, waitedMs: number) => void; signal?: { aborted: boolean } } = {},
): Promise<() => void> {
  const path = join(dir, SYNC_LOCK);
  const started = Date.now();
  let step = 1_000;

  for (;;) {
    if (opts.signal?.aborted) throw new Error("Đã huỷ khi đang chờ tới lượt ghi kho chung.");
    const cur = readDriveLock(path);
    const mine = !cur || cur.host === host;
    const dead = cur ? Date.now() - Date.parse(cur.at) >= lockStaleMs(cur) : true;

    if (mine || dead) {
      const claim: DriveLock = { host, pid: process.pid, at: new Date().toISOString(), beat: true };
      writeFileSync(path, JSON.stringify(claim));
      // ĐỌC LẠI để xác nhận mình thật sự là chủ. Hai máy cùng thấy "trống" thì cùng ghi; bên ghi
      // sau thắng, bên kia phải biết mình THUA thay vì tưởng đang giữ. Không triệt tiêu được đua
      // (Drive không có ghi nguyên tử) nhưng thu hẹp cửa sổ xuống một lượt đọc.
      const back = readDriveLock(path);
      if (back && back.host === host && back.pid === process.pid) {
        const beat = setInterval(() => {
          try {
            writeFileSync(path, JSON.stringify({ ...claim, at: new Date().toISOString() } satisfies DriveLock));
          } catch {
            /* nhịp lỡ không được làm chết lượt đang chạy — bên kia còn 2 nhịp nữa mới kết luận */
          }
        }, LOCK_BEAT_MS);
        if (typeof beat.unref === "function") beat.unref();
        return () => {
          clearInterval(beat);
          rmSync(path, { force: true });
        };
      }
      // thua cuộc đua ⇒ rơi xuống nhánh chờ như mọi máy khác
    }

    opts.onWait?.(cur?.host ?? "?", Date.now() - started);
    await new Promise((r) => setTimeout(r, step));
    step = Math.min(step * 2, LOCK_WAIT_STEP_MAX_MS);
  }
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
  const publishes = mySeries.length > 0 || existsSync(join(dir, legacyName(self))) || listSegments(dir).length > 0;
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
  /** ÉP GỘP kho chung ngay lượt này thay vì chờ đủ ngưỡng khối (`--compact`).
   *  Dùng khi kho chung đã lệch và cần chốt "lấy kho của MÁY NÀY" — xem `pushAppend`. */
  compact?: boolean;
  /** Cắt vòng CHỜ TỚI LƯỢT (`plan/08 §8c` ③). Hàng đợi cố ý không có trần tổng — đợi là đợi —
   *  nên phải có đường huỷ tường minh cho người dùng (và cho test). */
  lockSignal?: { aborted: boolean };
  /**
   * Báo BƯỚC ĐANG CHẠY — mã ngắn ổn định (`"scan"` · `"merge"` · `"lock-wait:<ai>"` · `"export"` ·
   * `"write"` · `"verify"` · `"embed"`), KHÔNG phải câu người đọc (FE tự dịch qua i18n theo mã).
   * User chốt 2026-08-30: *"phải hiện tiến trình sync đang bước nào"* — trước đây `/sync-status`
   * chỉ có `running:true/false`, cả một lượt sync dài coi như một khối đen, và khi nó "xong" mà
   * số chưa đổi thì không cách nào phân biệt "chưa xong thật" với "xong mà không có gì để đẩy".
   */
  onProgress?: (phase: string) => void;
}): Promise<DriveSyncResult> {
  const dir = opts.driveDir.trim();
  if (!dir) throw new Error("No Drive folder linked.");
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`Drive folder not found: ${dir}`);
  const onProgress = opts.onProgress ?? (() => {});
  // Capture THIS machine's latest transcripts into the DB FIRST, so the bundle
  // we upload can never miss the newest chat lines when switching machines.
  onProgress("scan");
  const scanReport = scan({ dbPath: opts.dbPath });
  const excludeLanes = getScopeExclude(); // scoped sync: same list both directions
  const host = opts.host ? opts.host.replace(/[^A-Za-z0-9._-]/g, "_") : sanitizeHost();
  const level = opts.level ?? getSyncLevel();

  // ── MỘT KHO CHÍNH: GỘP TRƯỚC, GHI SAU ───────────────────────────────────────
  // Thứ tự này là bắt buộc và là cả thiết kế: phải merge kho chính (+ mọi gói đời
  // cũ còn sót) vào kho local TRƯỚC, rồi mới xuất kho local đè lên kho chính. Làm
  // ngược lại thì gói mình ghi lên thiếu phần của máy kia ⇒ ghi đè là mất thật.
  // Ghi xong, kho chính = HỢP của cả hai bên, nên máy kia merge về cũng đủ.
  const merged: DriveSyncResult["merged"] = [];
  let push: DriveSyncResult["push"];

  // ── VÙNG TỚI HẠN TỐI THIỂU (`plan/08 §8c` ①) ────────────────────────────────
  // Merge là phần NẶNG (đo 2026-08-25: ~1 giờ trên kênh 0,55 MB/s). Giữ khoá suốt cả lượt đó
  // nghĩa là máy kia xếp hàng đúng nhưng **chờ cả tiếng**. Nay: merge chạy NGOÀI khoá; khoá chỉ
  // ôm phần ghi. Lượt merge THỨ HAI ngay sau khi cầm khoá bắt phần máy khác vừa nối trong lúc
  // mình đang merge — rẻ gần bằng 0 nhờ `chunkSignature` (không chép khối đã biết).
  const mergeAll = async (record: "all" | "changed-only"): Promise<void> => {
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".enc"))) {
      const full = join(dir, f);
      // Lượt thứ hai (trong khoá) chỉ ghi nhận thứ THẬT SỰ mới — không thì bảng kết quả đầy
      // dòng "skipped" trùng, đọc thành như merge hai lần.
      const keep = (e: DriveSyncResult["merged"][number]): void => {
        if (record === "all" || !e.skipped) merged.push(e);
      };
      if (isChunkContainer(full)) {
        for (const e of await mergeContainer(full, f, { dbPath: opts.dbPath, keyFile: opts.keyFile, excludeLanes })) keep(e);
        continue;
      }
      let sig: string;
      try {
        sig = bundleSignature(full);
      } catch {
        continue; // vanished mid-listing → skip
      }
      if (isBundleMerged(f, sig, opts.dbPath)) {
        keep({ file: f, skipped: true });
        continue;
      }
      try {
        const r = await mergeMemoryBundle({ bundlePath: full, dbPath: opts.dbPath, keyFile: opts.keyFile, excludeLanes });
        markBundleMerged(f, sig, opts.dbPath);
        keep({ file: f, sessionsAdded: r.sessionsAdded, messagesAdded: r.messagesAdded });
      } catch (error) {
        keep({ file: f, error: error instanceof Error ? error.message : "merge failed" });
      }
    }
  };

  // Merge MỌI gói trong thư mục: kho chính (container nhiều khối) VÀ mọi file `.enc` đời cũ còn
  // sót — người dùng không phải dọn tay khi đổi sang lối một-file. KHÔNG loại gói của chính máy
  // này: ở lối một-file tên gói không còn nói "của ai"; dedup theo CHỮ KÝ lo phần đó.
  onProgress("merge");
  await mergeAll("all"); // ← NGOÀI khoá: phần nặng, máy khác vẫn ghi được trong lúc này
  // ── NHÚNG TRƯỚC, XUẤT SAU (đảo thứ tự 2026-08-30) ───────────────────────────
  // Trước đây embed nằm CUỐI lượt, còn export bị `embedFrontierId` cắt ở tin đầu tiên CHƯA nhúng
  // (tin và vector đi cùng chuyến — điều 16). Hệ quả đo được trên kho thật sáng 30/08: mỗi lượt chỉ
  // chở được phần lượt TRƯỚC đã nhúng — luôn trễ một nhịp; lượt auto 03:56Z export lúc frontier còn
  // kẹt ⇒ **chở 0 tin** rồi mới nhúng, watermark đứng yên (6504552) trong khi 5.926 tin xếp hàng.
  // Nhúng TRƯỚC export thì frontier tiến ngay trong lượt này và gói chở được chính phần vừa nhúng.
  // Vẫn: một lô có trần (giữ lượt sync không phình vô hạn) · NGOÀI khoá (nhúng 9 phút mà ôm khoá là
  // bắt máy kia chờ — plan/08 §8c ①) · fail-open (thiếu model ⇒ 0, FTS gánh) · phủ cả tin vừa merge
  // từ máy khác (mergeAll chạy xong ngay trên).
  onProgress("embed");
  const embedded = opts.embed === false ? 0 : (await embedPending({ dbPath: opts.dbPath })).embedded;
  const release =
    level === "full"
      ? () => {}
      : await acquireDriveLock(dir, host, {
          signal: opts.lockSignal,
          // Xếp hàng phải NHÌN THẤY: im lặng thì người dùng đọc thành treo. In mỗi ~30 s một lần,
          // không mỗi vòng — vòng đầu nới rộng dần từ 1 s nên in mỗi vòng sẽ thành spam.
          onWait: (holder, waited) => {
            if (waited < 2_000 || Math.floor(waited / 30_000) !== Math.floor((waited - 1) / 30_000)) return;
            console.log(`  ⏳ đang chờ máy "${holder}" ghi xong kho chung (${Math.round(waited / 1000)}s)…`);
            onProgress(`lock-wait:${holder}`);
          },
        });
  try {
    // GỘP TRƯỚC, GHI SAU — bất biến của lối một-file: ghi đè khi chưa có phần máy kia là mất thật.
    // Lượt này bắt đúng phần xuất hiện trong lúc mình merge ngoài khoá.
    onProgress("merge");
    await mergeAll("changed-only");
    push =
      level === "full"
        ? await pushToDrive({ dir, host, level, excludeLanes, keyFile: opts.keyFile, dbPath: opts.dbPath, onProgress })
        : await pushAppend({ dir, host, excludeLanes, keyFile: opts.keyFile, dbPath: opts.dbPath, compact: opts.compact, onProgress });
  } finally {
    release();
  }
  onProgress("done");

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
    const label = `${displayName}#${chunk.index}`;
    // CỬA CHẶN RẺ: hỏi "đã merge chưa" bằng chữ ký đọc TẠI CHỖ, trước khi chép byte nào.
    // Trước đây phải giải nén khối rồi mới hỏi ⇒ mỗi lượt sync chép lại cả container (đo
    // 2026-08-25: đọc 2,4 GB / ~1 giờ chỉ để kết luận "không có gì mới").
    if (isBundleMerged(label, chunkSignature(containerPath, chunk), o.dbPath)) {
      out.push({ file: label, skipped: true, cheap: true });
      continue;
    }
    const tmp = mkdtempSync(join(tmpdir(), "zemory-chunk-"));
    const part = join(tmp, "chunk.enc");
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
  /** Ép gộp kho chung NGAY lượt này (`memory sync --compact`), không chờ đủ ngưỡng khối. */
  compact?: boolean;
  onProgress?: (phase: string) => void;
}): Promise<DriveSyncResult["push"]> {
  const { dir, host, excludeLanes, keyFile, dbPath } = o;
  const onProgress = o.onProgress ?? (() => {});
  const segs = listSegments(dir);
  const active = activeSegment(dir);
  const wmKey = `drive:${host}`;
  // Khối đếm trên khúc ĐANG MỞ — guard trước/sau khi ghi so trên CÙNG file này (khúc niêm
  // phong là bất biến, không cần canh).
  const chunks = !active.fresh && isChunkContainer(active.path) ? listChunks(active.path) : [];
  // ÉP GỘP (`--compact`): gộp MỌI khúc về một khúc 1 tươi chở trọn kho máy này (since=0).
  //
  // Vì sao là thao tác vận hành THẬT, không phải mẹo một lần: gộp xuất `since=0` nên container
  // mới chở TRỌN vector của máy chạy nó. Đó là cách duy nhất làm kho chung ĐỦ trở lại sau khi
  // nó đã lệch — mà lệch thì có thật (đo 2026-08-25: thiếu ~22.000 vector do vector nhúng-sau
  // không được chở, xem `plan/08 §8b`).
  //
  // 🔄 NGƯỠNG GỘP TỰ ĐỘNG 48 KHỐI **BÃI BỎ** (2026-08-30, cùng đợt chia khúc — HP điều 16 sửa
  // đổi): gộp = viết lại CẢ kho = đúng tải re-upload 2 GB làm DriveFS treo, thứ chia khúc sinh
  // ra để giết. Máy mới không thiệt: mọi khối vẫn giải mã đúng MỘT lần bất kể nằm file nào,
  // khối đã biết bị bỏ qua bằng chữ ký tại chỗ (§8c ①). Gộp chỉ còn là lệnh TAY.
  const compacting = o.compact === true;
  const since = compacting || segs.length === 0 ? 0 : readExportWatermark(wmKey, dbPath);

  const tmp = mkdtempSync(join(tmpdir(), "zemory-push-"));
  const part = join(tmp, "part.enc");
  try {
    // VECTOR NHÚNG SAU KHI TIN ĐÃ LÊN KÊNH (v23, 2026-08-27): delta chỉ chở vector của tin
    // id > watermark, nên tin đã đi rồi mới được nhúng thì không còn chuyến nào chở nó — diễn tập
    // phục hồi đo thiếu 16.405 vector dù kho này có đủ (HP điều 16). Nay mỗi lượt kèm theo vector
    // có ở kho mà CHƯA ghi sổ `vec_shipped` (đường `vectorCatchUpIds` của lệnh bù, tái dùng
    // nguyên). Gộp (since = 0) chở trọn nên không cần.
    const lateIds = since ? unshippedVectorIds(dbPath, since) : [];
    onProgress("export");
    const r = await exportMemoryBundle({
      outPath: part,
      dbPath,
      keyFile,
      force: true,
      excludeLanes,
      ...(since ? { sinceMessageId: since } : {}),
      ...(lateIds.length ? { vectorCatchUpIds: lateIds } : {}),
    });
    // Lượt KHÔNG có tin mới nhưng CÓ vector nhúng-sau vẫn phải đi — đó chính là ca đang vá.
    if (!r.rows || (r.rows.messages === 0 && !(r.vectorsShipped ?? 0))) {
      return { kind: "none", file: "", bytes: 0, messages: 0, removed: 0 };
    }
    // 🔴 KIỂM LẠI TRƯỚC KHI GHI (`plan/08 §8c` ⑤). Drive đồng bộ theo CẢ FILE: nối 76 MB = tạo
    // một phiên bản mới của cả container. Nếu bản cục bộ đã CŨ (máy kia vừa nối mà mình chưa kéo
    // về) thì bản mình đẩy lên là *cũ + khối mình* ⇒ **khối của máy kia biến mất, không ai báo**.
    // Khoá KHÔNG cứu được ca này — nó chỉ chặn hai bên ghi cùng lúc, không chặn ghi đè bản cũ.
    const chunksNow = !active.fresh && isChunkContainer(active.path) ? listChunks(active.path) : [];
    if (chunksNow.length !== chunks.length) {
      // Có khối lạ xuất hiện sau lúc mình liệt kê ⇒ DỪNG, để lượt sync sau merge chúng rồi ghi.
      // Thà bỏ một lượt còn hơn nuốt mất khối của máy khác (kho THẬT nằm ở từng máy — điều 16).
      return { kind: "none", file: "", bytes: 0, messages: 0, removed: 0 };
    }
    let removed = 0;
    let written = 0; // byte THẬT SỰ ghi thêm lượt này — xem chú thích ở `bytes` bên dưới
    // Khúc TƯƠI (vừa mở / kho trống) khởi đầu bằng magic ⇒ sau khi nối có đúng 1 khối.
    const expected = compacting || active.fresh ? 1 : chunks.length + 1;
    const target = compacting ? join(dir, MAIN_BUNDLE) : active.path;
    onProgress("write");
    if (compacting) {
      // GỘP: mọi khúc gấp về MỘT khúc 1 tươi; bản khúc-1 cũ giữ đúng một thế hệ làm đường lùi;
      // khúc ≥2 xoá (nội dung đã nằm trong khúc tươi — export since=0 SAU khi merge đủ).
      const fresh = join(tmp, "fresh.enc");
      writeFileSync(fresh, CHUNKS_MAGIC);
      written = appendChunk(fresh, part);
      for (const s of segs) removed += isChunkContainer(s.path) ? listChunks(s.path).length : 0;
      if (existsSync(target)) {
        rmSync(join(dir, MAIN_BAK), { force: true });
        renameSync(target, join(dir, MAIN_BAK));
      }
      for (const s of segs) if (s.n > 1) rmSync(s.path, { force: true });
      renameSync(fresh, target);
    } else {
      // Khúc tươi: dựng vỏ magic TẠI CHỖ rồi nối — appendChunkVerified đếm lại như thường.
      if (active.fresh && !existsSync(target)) writeFileSync(target, CHUNKS_MAGIC);
      // Nối THẲNG lên kênh ⇒ đây là chỗ Drive ném lỗi giả, nên phải đếm lại mới dám kết luận.
      // (Nhánh gộp ở trên ghi ra file tạm LOCAL rồi `rename`, không đi qua đường đó.)
      written = appendChunkVerified(target, part, expected);
    }
    // ĐÚNG chỗ kẹt thật đo được 2026-08-29: ghi (`appendChunk`) thường xong trong vài giây, còn
    // ĐỌC LẠI để đếm khối trên ổ Drive đang chập có thể treo rất lâu — badge phải nói "đang xác
    // minh", không phải im lặng để người dùng tưởng máy đứng hình ở bước ghi.
    onProgress("verify");
    // 🔴 KIỂM SAU KHI GHI (`plan/08 §8c` ④). Drive không bảo đảm nguyên tử; nếu khối của mình
    // biến mất (bị bản khác đè) thì phải BIẾT, chứ không được báo "đã đẩy" rồi thôi — đó đúng là
    // kiểu "bề mặt nói dối" mà `02_RULES` cấm. Không có gì để sửa tự động ở đây (ghi lại có thể
    // đè tiếp bản mới), nên nói thẳng và để lượt sync sau làm lại.
    const after = listChunksRetry(target, "kiểm sau khi ghi");
    if (after.length !== expected) {
      throw new Error(
        `Kho chung đổi ngay sau khi ghi (${after.length} khối, chờ ${expected}) — khối vừa nối có thể đã bị đè. ` +
          `Kho của máy này vẫn đủ; chạy \`zemory memory sync\` lại để nối lại.`,
      );
    }
    // 🔴 WATERMARK NHÍCH NGAY KHI KHỐI ĐÃ CHỨNG MINH CÓ MẶT — trước mọi việc tối ưu (2026-08-26).
    // Trước đây nó nằm SAU bước đánh dấu bên dưới, nên một lỗi ở bước tối ưu ăn mất luôn sự thật
    // "đã đẩy tới đâu". Đó chính là cơ chế của ca 26/08: khối #39 nối xong lúc 05:46:26, lượt job
    // chết sau đó, watermark đứng nguyên ở mốc 25/08 09:54 suốt **20 giờ** — và mỗi lượt kế tiếp
    // lại xuất đúng dải cũ rồi nối thêm một khối TRÙNG. Thứ tự đúng: chứng minh xong là ghi nhận,
    // rồi mới tối ưu. Một lớp tối ưu KHÔNG được phép làm mất một sự thật đã đo được.
    writeExportWatermark(wmKey, r.rows.maxMessageId, dbPath);
    // GHI SỔ vector đã lên kênh — SAU khi khối chứng minh có mặt, cùng lý do với watermark ở trên.
    markVectorsShipped(dbPath, r.vectorShippedIds ?? []);
    // ĐÁNH DẤU KHỐI CỦA CHÍNH MÌNH LÀ ĐÃ MERGE — thuần TỐI ƯU, hỏng thì chịu chứ không kéo ai theo.
    // Nội dung khối này lấy ra từ kho local, nên merge lại nó vào chính kho đó là việc
    // thừa 100%. Không đánh dấu thì mỗi lượt sync sau phải GIẢI MÃ lại nguyên khối chỉ để
    // phát hiện "0 dòng mới" — với khối cỡ 336 MB thì đó là vài chục giây và một lượt đọc
    // cả file, đúng thứ lối nối-thêm sinh ra để tránh. (Bắt được nhờ ca `receiver dedup`.)
    const mine = after[after.length - 1];
    if (mine) {
      const tmp2 = mkdtempSync(join(tmpdir(), "zemory-mark-"));
      try {
        const copy = join(tmp2, "mine.enc");
        await extractChunk(target, mine, copy);
        // Khoá theo TÊN KHÚC THẬT — chiều merge dedup bằng `<tên file>#<khối>`; ghi cứng
        // MAIN_BUNDLE thì khối nằm ở khúc .002 trở đi không bao giờ được đánh dấu.
        markBundleMerged(`${basename(target)}#${mine.index}`, bundleSignature(copy), dbPath);
      } catch (e) {
        // Fail-open (điều 9) nhưng KHÔNG im: giá phải trả là lượt sync sau giải mã lại khối này
        // một lần. Nuốt lặng thì lần sau chậm mà không ai biết vì sao.
        console.error(
          `[sync] không đánh dấu được khối của chính mình (${e instanceof Error ? e.message : String(e)}) — ` +
            `lượt sync sau sẽ giải mã lại nó một lần. Không mất dữ liệu.`,
        );
      } finally {
        rmSync(tmp2, { recursive: true, force: true });
      }
    }
    return {
      kind: compacting ? "compact" : segs.length === 0 ? "baseline" : "delta",
      file: basename(target),
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
  onProgress?: (phase: string) => void;
}): Promise<DriveSyncResult["push"]> {
  const { dir, host, level, excludeLanes, keyFile, dbPath } = o;

  if (level === "full") {
    // Disaster-restore snapshot: one self-contained file, overwritten each sync.
    o.onProgress?.("export");
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

/**
 * BÙ VECTOR CHO KHO CHUNG — nối thêm MỘT khối chở đúng phần vector còn thiếu.
 *
 * 🔴 Vì sao tồn tại: vector nhúng SAU lúc tin được gửi thì không lượt nào quay lại chở (đã vá
 * chiều xuôi bằng `embedFrontierId`, nhưng phần TỒN thì vá đó không lo được). Đo 2026-08-25:
 * kho chung thiếu **~22.000 vector** ⇒ máy nhận phải nhúng lại ~12 giờ, trái HP điều 16.
 *
 * Vì sao NỐI THÊM chứ không gộp: gộp cũng chữa được (nó xuất `since=0`) nhưng phải viết lại cả
 * container 1,6 GB và ĐÈ lên kho chung của mọi máy. Khối bù chỉ ~3 KB/vector và **không đụng
 * một byte cũ nào** — đúng HP điều 16 (*"ghi là NỐI THÊM, không ghi đè"*).
 *
 * Cách biết kênh thiếu gì (KHÔNG đoán): dựng lại kho chung vào một file TẠM đúng như máy mới sẽ
 * nhận, rồi so bằng khoá BỀN `(session_id, uuid)` — không dùng `messages.id` vì id là số cục bộ
 * của từng máy. Tin nào bên đó thiếu vector mà bên này có ⇒ vào danh sách bù.
 */
export async function vectorCatchUp(opts: {
  driveDir: string;
  keyFile?: string;
  dbPath?: string;
  /** Chỉ ĐO rồi báo, không đụng kho chung. */
  dryRun?: boolean;
}): Promise<{ container: string; missing: number; shipped: number; bytes: number; pushed: boolean }> {
  const dir = opts.driveDir.trim();
  if (!dir) throw new Error("No Drive folder linked.");
  // Kho chia khúc (§8e): DỰNG probe từ MỌI khúc, nhưng khối bù NỐI vào khúc ĐANG MỞ —
  // nối vào khúc 1 đã niêm phong là bắt Drive re-upload cả khúc lớn, đúng tải đang giết.
  const segsAll = listSegments(dir);
  if (segsAll.length === 0) throw new Error(`Kho chung chưa có: ${join(dir, MAIN_BUNDLE)}`);
  const container = activeSegment(dir).path;
  const dbPath = opts.dbPath ?? currentMemoryDb();

  const tmp = mkdtempSync(join(tmpdir(), "zemory-catchup-"));
  const probe = join(tmp, "probe.db");
  try {
    // ① Dựng lại kho chung y như một máy mới sẽ nhận được — MỌI khúc, không riêng khúc đang mở
    //    (máy mới merge cả dãy; đo thiếu trên một khúc là đo thiếu sai).
    for (const s of segsAll) await mergeMemoryBundle({ bundlePath: s.path, dbPath: probe, keyFile: opts.keyFile });

    // ② So bằng khoá BỀN. `vec_chunks` là bảng ảo vec0 nên đọc qua bảng bóng `..._rowids`
    //    (bảng thường) — cùng cách `vectorCoverage` tránh quét bảng ảo cho mỗi hàng.
    // Bảng bóng của vec0 CÓ THỂ KHÔNG TỒN TẠI: kho chung chưa từng chở vector nào thì kho dựng
    // ra cũng không có bảng — đúng ca đang phải chữa. Hỏi trước, đừng để SQLITE_ERROR (bản đầu
    // của tôi quên, và test bắt được ngay).
    const hasVecTable = (d: Database.Database): boolean =>
      !!d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vec_chunks_rowids'").get();

    const missingKeys = new Set<string>();
    const p = new Database(probe, { readonly: true });
    try {
      const none = !hasVecTable(p);
      // Khoá BỀN = `messageKey` (uuid, hoặc timestamp+content khi uuid NULL) — CÙNG khoá mà
      // `vector_ship` dùng. Bản đầu lọc `uuid IS NOT NULL` ở đây ⇒ 10.271 vector của tin
      // không-uuid (đo diễn tập 2026-08-27) không bao giờ được bù, dù `shipVectorsInto` chở được.
      for (const r of p
        .prepare(
          `SELECT m.session_id s, m.uuid u, m.timestamp ts, m.content c FROM messages m
            WHERE 1=1` +
            (none ? "" : " AND NOT EXISTS (SELECT 1 FROM vec_chunks_rowids v WHERE v.rowid = m.id)"),
        )
        .iterate() as Iterable<{ s: string; u: string | null; ts: string | null; c: string | null }>) {
        missingKeys.add(`${r.s}|${messageKey(r.u, r.ts, r.c)}`);
      }
    } finally {
      p.close();
    }

    const ids: number[] = [];
    const src = new Database(dbPath, { readonly: true });
    try {
      // Máy này chưa nhúng gì ⇒ không có gì để bù (fail-open, điều 9).
      if (hasVecTable(src)) {
        for (const r of src
          .prepare(
            `SELECT m.id i, m.session_id s, m.uuid u, m.timestamp ts, m.content c FROM messages m
              WHERE EXISTS (SELECT 1 FROM vec_chunks_rowids v WHERE v.rowid = m.id)`,
          )
          .iterate() as Iterable<{ i: number; s: string; u: string | null; ts: string | null; c: string | null }>) {
          if (missingKeys.has(`${r.s}|${messageKey(r.u, r.ts, r.c)}`)) ids.push(r.i);
        }
      }
    } finally {
      src.close();
    }

    if (!ids.length || opts.dryRun) {
      return { container, missing: ids.length, shipped: 0, bytes: 0, pushed: false };
    }

    // ③ Gói CHỈ CÓ VECTOR: `sinceMessageId` đặt quá đỉnh kho ⇒ 0 tin, nhưng danh sách bù vẫn
    //    được chở. Máy nhận tra id CỦA MÌNH theo (session_id, uuid) nên gắn không thể lệch.
    const top = (() => {
      const d = openMemory(dbPath);
      try {
        return (d.prepare("SELECT COALESCE(MAX(id),0) m FROM messages").get() as { m: number }).m;
      } finally {
        d.close();
      }
    })();
    const part = join(tmp, "catchup.enc");
    const r = await exportMemoryBundle({
      outPath: part,
      dbPath,
      keyFile: opts.keyFile,
      force: true,
      sinceMessageId: top,
      vectorCatchUpIds: ids,
    });

    // KHOÁ KÊNH như mọi lượt ghi khác. Bản đầu của tôi nối thẳng — hai máy nối cùng lúc là
    // container rách, đúng thứ `acquireDriveLock` sinh ra để thu hẹp.
    const host = hostname();
    const release = await acquireDriveLock(dir, host, {
      onWait: (holder, waited) => {
        if (waited < 2_000 || Math.floor(waited / 30_000) !== Math.floor((waited - 1) / 30_000)) return;
        console.log(`  ⏳ đang chờ máy "${holder}" ghi xong kho chung (${Math.round(waited / 1000)}s)…`);
      },
    });
    let bytes = 0;
    try {
      // Khúc đang mở có thể là khúc TƯƠI chưa tồn tại (khúc trước vừa đầy) — dựng vỏ magic trước.
      if (!existsSync(container)) writeFileSync(container, CHUNKS_MAGIC);
      bytes = appendChunk(container, part);
      markVectorsShipped(dbPath, r.vectorShippedIds ?? []); // sổ v23 — lệnh bù cũng là một chuyến chở
      // ĐÁNH DẤU KHỐI CỦA CHÍNH MÌNH LÀ ĐÃ MERGE (cùng lý do như `pushAppend`): nội dung lấy từ
      // kho local, merge lại vào chính nó là việc thừa 100% — mà không đánh dấu thì lượt sync
      // sau phải GIẢI MÃ lại nguyên khối 66 MB chỉ để phát hiện "0 dòng mới".
      const after = listChunks(container);
      const mine = after[after.length - 1];
      if (mine) {
        const copy = join(tmp, "mine.enc");
        await extractChunk(container, mine, copy);
        markBundleMerged(`${basename(container)}#${mine.index}`, bundleSignature(copy), dbPath);
      }
    } finally {
      release();
    }
    return { container, missing: ids.length, shipped: r.vectorsShipped ?? 0, bytes, pushed: true };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
