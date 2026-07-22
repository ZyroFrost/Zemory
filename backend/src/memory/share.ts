// Encrypted memory bundles for sharing ~/.zemory/global_memory.db safely.
// The raw DB is sensitive; export writes one authenticated AES-GCM file and
// keeps the key out-of-band via --key-file or ZEMORY_SHARE_KEY.

import Database from "better-sqlite3";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
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
import { type ScopeLane, laneSqlClause } from "./scope.js";
import { type SyncLevel, getScopeExclude, getSyncLevel } from "../settings.js";

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
    throw new Error("Missing share key. Use --key-file <path> or set ZEMORY_SHARE_KEY.");
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

interface RowsStats {
  sessions: number;
  messages: number;
  since: number;
  maxMessageId: number;
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
  opts: { excludeLanes?: ScopeLane[]; since?: number },
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

      const stats: RowsStats = { sessions: 0, messages: 0, since, maxMessageId: 0 };
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
      ? buildRowsSnapshot(sourcePath, { excludeLanes: opts.excludeLanes, since: opts.sinceMessageId })
      : await snapshotSqlite(sourcePath);
  const rows = "stats" in snapshot ? (snapshot.stats as RowsStats) : undefined;
  try {
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
export function bundleSignature(bundlePath: string): string {
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
export function isBundleMerged(file: string, sig: string, dbPath?: string): boolean {
  const db = openMemory(dbPath ?? currentMemoryDb());
  try {
    const row = db.prepare("SELECT sig FROM merged_bundles WHERE file = ?").get(file) as { sig: string } | undefined;
    return row?.sig === sig;
  } finally {
    db.close();
  }
}

/** Record that a bundle file (by signature) has been merged here. */
export function markBundleMerged(file: string, sig: string, dbPath?: string): void {
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
export async function mergeMemoryBundle(opts: MergeMemoryBundleOptions): Promise<MergeMemoryBundleResult> {
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
          db.exec("DELETE FROM sessions WHERE message_count = 0");
        })();
      } finally {
        db.prepare("DETACH DATABASE src").run();
      }
      const sessionsAfter = count("SELECT COUNT(*) c FROM sessions");
      const messagesAfter = count("SELECT COUNT(*) c FROM messages");
      return {
        dbPath: targetPath,
        bundlePath: opts.bundlePath,
        sessionsBefore,
        sessionsAfter,
        messagesBefore,
        messagesAfter,
        sessionsAdded: sessionsAfter - sessionsBefore,
        messagesAdded: messagesAfter - messagesBefore,
      };
    } finally {
      db.close();
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

  // ── PUSH: write out this machine's changes ──────────────────────────────────
  // DEPTH (plan 08 §7): "full" = one whole-DB snapshot (disaster restore),
  // overwritten each sync. "lean" (default) = a DELTA SERIES: a baseline file plus
  // small per-sync deltas, so a steady sync ships ~KB not ~190MB. The series stays
  // self-sufficient (baseline + every delta = full history); periodic compaction
  // folds the deltas back into one baseline and deletes the superseded files.
  const push = await pushToDrive({ dir, host, level, excludeLanes, keyFile: opts.keyFile, dbPath: opts.dbPath });

  // ── MERGE: pull every OTHER machine's bundles we haven't merged yet ──────────
  // Skip anything from THIS host (my series + any legacy file), and skip files
  // whose signature we've already merged (receiver-side dedup, plan 08 §7).
  const myPrefix = `global_memory.${host}.`;
  const merged: DriveSyncResult["merged"] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".enc") && !f.startsWith(myPrefix))) {
    const full = join(dir, f);
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
  // Build the semantic vector index for messages that still lack one — this
  // machine's freshly scanned lines AND the ones just merged from other machines.
  // Vectors are per-machine (keyed by local ids) so they never travel in a bundle;
  // embedding here keeps recall on THIS machine complete right after sync.
  // ONE bounded batch so the sync call stays responsive — a steady-state sync
  // (a handful of new messages) is fully covered; a large one-time backlog is
  // finished by `zemory memory embed --all` (vectorRemaining reports the rest).
  // Fail-open: if the model is unavailable, embedPending embeds 0 (FTS fallback).
  const embedded = opts.embed === false ? 0 : (await embedPending({ dbPath: opts.dbPath })).embedded;

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
