// Encrypted brain bundles for sharing ~/.zemory/global_memory.db safely.
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
import { currentBrainDb, currentBrainDir, openBrain } from "./db.js";
import { scan } from "./ingest.js";
import { embedPending, pruneOrphanVectors, vectorRemaining } from "./vectors.js";
import { type ScopeLane, laneSqlClause } from "./scope.js";
import { getScopeExclude } from "../settings.js";

const MAGIC = "ZEMORY-BRAIN-ENC v1\n";
const TAG_BYTES = 16;
const KDF = { n: 16384, r: 8, p: 1 };

export interface BrainShareKeyOptions {
  keyFile?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ExportBrainBundleOptions extends BrainShareKeyOptions {
  dbPath?: string;
  outPath: string;
  force?: boolean;
  /** Provenance lanes to leave OUT of the bundle (scoped sync). */
  excludeLanes?: ScopeLane[];
}

export interface ExportBrainBundleResult {
  outPath: string;
  sourcePath: string;
  sourceBytes: number;
  bundleBytes: number;
}

export interface ImportBrainBundleOptions extends BrainShareKeyOptions {
  bundlePath: string;
  dbPath?: string;
  force?: boolean;
}

export interface ImportBrainBundleResult {
  dbPath: string;
  bundlePath: string;
  bytes: number;
  backupPath: string | null;
}

interface BundleHeader {
  format: "zemory.brain.bundle";
  version: 1;
  alg: "aes-256-gcm";
  kdf: { name: "scrypt"; n: number; r: number; p: number; salt: string };
  iv: string;
  createdAt: string;
  source: { name: string; bytes: number };
}

function readShareSecret(opts: BrainShareKeyOptions): Buffer {
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
  const dir = mkdtempSync(join(tmpdir(), "zemory-brain-export-"));
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
  const db = openBrain(path);
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

function writeHeader(outPath: string, header: BundleHeader, force: boolean | undefined): Buffer {
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  const aad = Buffer.from(MAGIC + JSON.stringify(header) + "\n", "utf8");
  writeFileSync(outPath, aad, { flag: force ? "w" : "wx" });
  return aad;
}

export async function exportBrainBundle(opts: ExportBrainBundleOptions): Promise<ExportBrainBundleResult> {
  const sourcePath = opts.dbPath ?? currentBrainDb();
  if (!existsSync(sourcePath)) throw new Error(`Brain DB not found: ${sourcePath}`);
  const secret = readShareSecret(opts);
  const snapshot = await snapshotSqlite(sourcePath);
  try {
    if (opts.excludeLanes?.length) filterSnapshot(snapshot.path, opts.excludeLanes);
    const sourceBytes = statSync(snapshot.path).size;
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const header: BundleHeader = {
      format: "zemory.brain.bundle",
      version: 1,
      alg: "aes-256-gcm",
      kdf: { name: "scrypt", ...KDF, salt: salt.toString("base64") },
      iv: iv.toString("base64"),
      createdAt: new Date().toISOString(),
      source: { name: basename(sourcePath), bytes: sourceBytes },
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
    };
  } finally {
    snapshot.cleanup();
  }
}

function readHeader(bundlePath: string): { header: BundleHeader; aad: Buffer; dataOffset: number } {
  const fd = openSync(bundlePath, "r");
  try {
    const probe = Buffer.alloc(64 * 1024);
    readSync(fd, probe, 0, probe.length, 0);
    const firstNl = probe.indexOf(10, 0);
    const secondNl = firstNl >= 0 ? probe.indexOf(10, firstNl + 1) : -1;
    if (firstNl < 0 || secondNl < 0) throw new Error("Invalid zemory brain bundle header.");
    const magic = probe.subarray(0, firstNl + 1).toString("utf8");
    if (magic !== MAGIC) throw new Error("Not a zemory encrypted brain bundle.");
    const header = JSON.parse(probe.subarray(firstNl + 1, secondNl).toString("utf8")) as BundleHeader;
    if (header.format !== "zemory.brain.bundle" || header.version !== 1 || header.alg !== "aes-256-gcm") {
      throw new Error("Unsupported zemory brain bundle version.");
    }
    return { header, aad: probe.subarray(0, secondNl + 1), dataOffset: secondNl + 1 };
  } finally {
    closeSync(fd);
  }
}

function readAuthTag(bundlePath: string): Buffer {
  const size = statSync(bundlePath).size;
  if (size <= TAG_BYTES) throw new Error("Invalid zemory brain bundle: missing auth tag.");
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
  opts: BrainShareKeyOptions & { bundlePath: string },
  outPath: string,
): Promise<BundleHeader> {
  const { header, aad, dataOffset } = readHeader(opts.bundlePath);
  const size = statSync(opts.bundlePath).size;
  const cipherEnd = size - TAG_BYTES - 1;
  if (cipherEnd < dataOffset) throw new Error("Invalid zemory brain bundle: empty ciphertext.");
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

export async function importBrainBundle(opts: ImportBrainBundleOptions): Promise<ImportBrainBundleResult> {
  const targetPath = opts.dbPath ?? currentBrainDb();
  if (existsSync(targetPath) && !opts.force) {
    throw new Error(`Refusing to overwrite existing brain DB: ${targetPath}. Re-run with --force to replace it.`);
  }
  mkdirSync(dirname(resolve(targetPath)), { recursive: true });
  const tmpPath = join(dirname(resolve(targetPath)), `.zemory-import-${process.pid}-${Date.now()}.tmp`);
  let backupPath: string | null = null;
  try {
    const header = await decryptBundleToFile(opts, tmpPath);
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

export interface MergeBrainBundleOptions extends BrainShareKeyOptions {
  bundlePath: string;
  dbPath?: string;
  /** Provenance lanes to NOT pull from the incoming bundle (scoped sync). */
  excludeLanes?: ScopeLane[];
}

export interface MergeBrainBundleResult {
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
 * MERGE a bundle into the existing local brain — ADDITIVE, never destructive.
 * Sessions/messages are copied with INSERT OR IGNORE (sessions keyed by id;
 * messages by their UNIQUE(session_id, uuid)), so anything already present is
 * kept untouched and only genuinely new rows are added — no machine overwrites
 * another, and the original DB is never replaced. Each session keeps the `host`
 * stamped by its producing machine, so provenance survives the merge.
 *
 * NOT copied: ingest_state (per-machine file offsets — merging would corrupt the
 * local incremental scan), vec_chunks (keyed by local message ids that differ
 * across DBs — re-embed new messages with `brain embed`), and doc/section/
 * changelog (those travel via git, not the brain bundle).
 */
export async function mergeBrainBundle(opts: MergeBrainBundleOptions): Promise<MergeBrainBundleResult> {
  const targetPath = opts.dbPath ?? currentBrainDb();
  const dir = mkdtempSync(join(tmpdir(), "zemory-brain-merge-"));
  const srcPath = join(dir, "incoming.db");
  try {
    await decryptBundleToFile(opts, srcPath);
    // Normalize the incoming DB to the current schema (adds host on a pre-v4
    // bundle) and drop WAL so it attaches cleanly as a plain file.
    const src = openBrain(srcPath);
    try {
      src.pragma("wal_checkpoint(TRUNCATE)");
      src.pragma("journal_mode = DELETE");
    } finally {
      src.close();
    }

    const db = openBrain(targetPath);
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
          // (openBrain above migrates the incoming DB, so src.sessions.origin
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
  for (const c of [explicit, join(currentBrainDir(), "share.key"), join(projectRoot, "share", "share.key")]) {
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
  merged: { file: string; sessionsAdded?: number; messagesAdded?: number; error?: string }[];
  /** New vectors built at the end of sync (this machine's + merged messages). */
  embedded: number;
  vectorRemaining: number;
}

/**
 * One-shot cross-machine sync through a synced Drive FOLDER (not the live DB):
 * export THIS machine's bundle into the folder, then merge every OTHER machine's
 * bundle found there. Bundles are named per host so machines never clobber each
 * other. Returns what was pushed/merged; embedding of new rows is left to the
 * caller (`brain embed`).
 */
export async function syncDrive(opts: { driveDir: string; keyFile?: string; dbPath?: string }): Promise<DriveSyncResult> {
  const dir = opts.driveDir.trim();
  if (!dir) throw new Error("No Drive folder linked.");
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`Drive folder not found: ${dir}`);
  // Capture THIS machine's latest transcripts into the DB FIRST, so the bundle
  // we upload can never miss the newest chat lines when switching machines.
  const scanReport = scan({ dbPath: opts.dbPath });
  const excludeLanes = getScopeExclude(); // scoped sync: same list both directions
  const host = (hostname() || "unknown").replace(/[^A-Za-z0-9._-]/g, "_");
  const myName = `global_memory.${host}.zemory.enc`;
  const exported = await exportBrainBundle({
    outPath: join(dir, myName),
    dbPath: opts.dbPath,
    keyFile: opts.keyFile,
    force: true,
    excludeLanes,
  });
  const merged: DriveSyncResult["merged"] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".zemory.enc") && f !== myName)) {
    try {
      const r = await mergeBrainBundle({ bundlePath: join(dir, f), dbPath: opts.dbPath, keyFile: opts.keyFile, excludeLanes });
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
  // finished by `zemory brain embed --all` (vectorRemaining reports the rest).
  // Fail-open: if the model is unavailable, embedPending embeds 0 (FTS fallback).
  const embedded = (await embedPending({ dbPath: opts.dbPath })).embedded;

  return {
    driveDir: dir,
    scanned: { newMessages: scanReport.totals.newMessages, changedFiles: scanReport.changedFiles },
    exported: myName,
    exportedBytes: exported.bundleBytes,
    merged,
    embedded,
    vectorRemaining: vectorRemaining(opts.dbPath),
  };
}

export function writeBrainShareKey(path: string, opts: { force?: boolean } = {}): string {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  const key = randomBytes(32).toString("base64");
  writeFileSync(path, key + "\n", { flag: opts.force ? "w" : "wx", mode: 0o600 });
  return path;
}
