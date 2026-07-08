// Privacy and retention operations for the local brain DB.
// Destructive actions default to dry-run at the CLI layer and create a backup
// unless explicitly skipped by internal/test callers.

import Database from "better-sqlite3";
import { existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { BRAIN_DB, openBrain, type BrainDB } from "./db.js";
import { redact } from "./redact.js";

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function defaultBackupPath(dbPath: string): string {
  const dir = join(dirname(resolve(dbPath)), "backups");
  const base = basename(dbPath).replace(/\.db$/i, "");
  return join(dir, `${base}-${timestamp()}.db`);
}

function ensureMissingOrForced(path: string, force?: boolean): void {
  if (existsSync(path) && !force) throw new Error(`Refusing to overwrite existing file: ${path}. Re-run with --force.`);
}

async function sqliteBackup(sourcePath: string, outPath: string, force?: boolean): Promise<number> {
  if (!existsSync(sourcePath)) throw new Error(`Brain DB not found: ${sourcePath}`);
  ensureMissingOrForced(outPath, force);
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  const db = new Database(sourcePath, { readonly: true, fileMustExist: true });
  try {
    await db.backup(outPath);
  } catch (error) {
    rmSync(outPath, { force: true });
    throw error;
  } finally {
    db.close();
  }
  return statSync(outPath).size;
}

export interface BackupBrainOptions {
  dbPath?: string;
  outPath?: string;
  force?: boolean;
}

export interface BackupBrainResult {
  dbPath: string;
  outPath: string;
  bytes: number;
}

export async function backupBrain(opts: BackupBrainOptions = {}): Promise<BackupBrainResult> {
  const dbPath = opts.dbPath ?? BRAIN_DB;
  const outPath = opts.outPath ?? defaultBackupPath(dbPath);
  const bytes = await sqliteBackup(dbPath, outPath, opts.force);
  return { dbPath, outPath, bytes };
}

export interface RestoreBrainBackupOptions {
  backupPath: string;
  dbPath?: string;
  force?: boolean;
}

export interface RestoreBrainBackupResult {
  dbPath: string;
  backupPath: string;
  bytes: number;
  previousBackupPath: string | null;
}

export async function restoreBrainBackup(opts: RestoreBrainBackupOptions): Promise<RestoreBrainBackupResult> {
  const targetPath = opts.dbPath ?? BRAIN_DB;
  if (!existsSync(opts.backupPath)) throw new Error(`Backup DB not found: ${opts.backupPath}`);
  if (existsSync(targetPath) && !opts.force) {
    throw new Error(`Refusing to overwrite existing brain DB: ${targetPath}. Re-run with --force to replace it.`);
  }
  mkdirSync(dirname(resolve(targetPath)), { recursive: true });
  const tmpPath = join(dirname(resolve(targetPath)), `.zemory-restore-${process.pid}-${Date.now()}.tmp`);
  let previousBackupPath: string | null = null;
  try {
    await sqliteBackup(opts.backupPath, tmpPath, true);
    if (existsSync(targetPath)) {
      previousBackupPath = `${targetPath}.bak-${timestamp()}`;
      renameSync(targetPath, previousBackupPath);
    }
    renameSync(tmpPath, targetPath);
  } catch (error) {
    rmSync(tmpPath, { force: true });
    if (previousBackupPath && !existsSync(targetPath) && existsSync(previousBackupPath)) {
      renameSync(previousBackupPath, targetPath);
    }
    throw error;
  }
  return { dbPath: targetPath, backupPath: opts.backupPath, bytes: statSync(targetPath).size, previousBackupPath };
}

export interface ForgetBrainOptions {
  dbPath?: string;
  session?: string;
  project?: string;
  source?: string;
  before?: string;
  message?: number;
  force?: boolean;
  skipBackup?: boolean;
  backupPath?: string;
}

export interface ForgetBrainResult {
  dbPath: string;
  dryRun: boolean;
  backupPath: string | null;
  sessions: number;
  messages: number;
  vectors: number;
  selectors: string[];
  sampleSessions: string[];
}

function hasTable(db: BrainDB, table: string): boolean {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
}

function normalizeBefore(before?: string): string | undefined {
  if (!before) return undefined;
  const ms = Date.parse(before);
  if (Number.isNaN(ms)) throw new Error(`Invalid --before value: ${before}`);
  return new Date(ms).toISOString();
}

function buildForgetWhere(opts: ForgetBrainOptions): { where: string; params: Record<string, string | number>; selectors: string[] } {
  const clauses: string[] = [];
  const selectors: string[] = [];
  const params: Record<string, string | number> = {};
  if (opts.session) {
    clauses.push("s.id = @session");
    params.session = opts.session;
    selectors.push(`session=${opts.session}`);
  }
  if (opts.project) {
    clauses.push("s.project_root = @project");
    params.project = opts.project;
    selectors.push(`project=${opts.project}`);
  }
  if (opts.source) {
    clauses.push("s.source = @source");
    params.source = opts.source;
    selectors.push(`source=${opts.source}`);
  }
  const before = normalizeBefore(opts.before);
  if (before) {
    clauses.push("COALESCE(m.timestamp, s.ended_at, s.started_at, '') < @before");
    params.before = before;
    selectors.push(`before=${before}`);
  }
  if (opts.message != null) {
    if (!Number.isInteger(opts.message) || opts.message <= 0) throw new Error(`Invalid --message value: ${opts.message}`);
    clauses.push("m.id = @message");
    params.message = opts.message;
    selectors.push(`message=${opts.message}`);
  }
  if (!clauses.length) throw new Error("Refusing to forget without a selector. Use --session, --project, --source, --before, or --message.");
  return { where: clauses.join(" AND "), params, selectors };
}

export async function forgetBrain(opts: ForgetBrainOptions = {}): Promise<ForgetBrainResult> {
  const dbPath = opts.dbPath ?? BRAIN_DB;
  const { where, params, selectors } = buildForgetWhere(opts);
  const db = openBrain(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT m.id AS message_id, s.id AS session_id
         FROM messages m JOIN sessions s ON s.id = m.session_id
         WHERE ${where}`,
      )
      .all(params) as { message_id: number; session_id: string }[];
    const messageIds = rows.map((row) => row.message_id);
    const sessionIds = [...new Set(rows.map((row) => row.session_id))];
    const dryRun = !opts.force;
    if (dryRun || messageIds.length === 0) {
      return {
        dbPath,
        dryRun,
        backupPath: null,
        sessions: sessionIds.length,
        messages: messageIds.length,
        vectors: 0,
        selectors,
        sampleSessions: sessionIds.slice(0, 8),
      };
    }

    const backup = opts.skipBackup ? null : await backupBrain({ dbPath, outPath: opts.backupPath, force: opts.backupPath ? false : true });
    let vectors = 0;
    const tx = db.transaction(() => {
      db.exec("DROP TABLE IF EXISTS temp.zemory_forget_message_ids");
      db.exec("CREATE TEMP TABLE zemory_forget_message_ids(id INTEGER PRIMARY KEY)");
      const insert = db.prepare("INSERT INTO zemory_forget_message_ids(id) VALUES (?)");
      for (const id of messageIds) insert.run(id);
      if (hasTable(db, "vec_chunks")) {
        vectors = db.prepare("DELETE FROM vec_chunks WHERE rowid IN (SELECT id FROM zemory_forget_message_ids)").run().changes;
      }
      db.prepare("DELETE FROM messages WHERE id IN (SELECT id FROM zemory_forget_message_ids)").run();
      const updateSession = db.prepare(
        `UPDATE sessions SET
           message_count = (SELECT COUNT(*) FROM messages WHERE session_id = sessions.id),
           started_at = (SELECT MIN(timestamp) FROM messages WHERE session_id = sessions.id),
           ended_at = (SELECT MAX(timestamp) FROM messages WHERE session_id = sessions.id)
         WHERE id = ?`,
      );
      for (const id of sessionIds) updateSession.run(id);
      const deleteEmptySession = db.prepare("DELETE FROM sessions WHERE id = ? AND message_count = 0");
      for (const id of sessionIds) deleteEmptySession.run(id);
      db.exec("DROP TABLE IF EXISTS temp.zemory_forget_message_ids");
    });
    tx();
    return {
      dbPath,
      dryRun: false,
      backupPath: backup?.outPath ?? null,
      sessions: sessionIds.length,
      messages: messageIds.length,
      vectors,
      selectors,
      sampleSessions: sessionIds.slice(0, 8),
    };
  } finally {
    db.close();
  }
}

export interface ReRedactBrainOptions {
  dbPath?: string;
  force?: boolean;
  skipBackup?: boolean;
  backupPath?: string;
}

export interface ReRedactBrainResult {
  dbPath: string;
  dryRun: boolean;
  backupPath: string | null;
  scanned: { messages: number; artifactCommands: number; artifactIndex: number };
  changed: { messages: number; artifactCommands: number; artifactIndex: number };
}

function diffRedactions<T extends { id: string | number; value: string | null }>(rows: T[]): (T & { redacted: string })[] {
  return rows
    .map((row) => ({ ...row, redacted: redact(row.value ?? "") }))
    .filter((row) => row.redacted !== (row.value ?? ""));
}

export async function reRedactBrain(opts: ReRedactBrainOptions = {}): Promise<ReRedactBrainResult> {
  const dbPath = opts.dbPath ?? BRAIN_DB;
  const db = openBrain(dbPath);
  try {
    const messages = db.prepare("SELECT id, content AS value FROM messages WHERE content IS NOT NULL AND content != ''").all() as {
      id: number;
      value: string;
    }[];
    const commands = db.prepare("SELECT id, command_redacted AS value FROM artifact WHERE command_redacted IS NOT NULL AND command_redacted != ''").all() as {
      id: string;
      value: string;
    }[];
    const indexRows = db
      .prepare("SELECT rowid AS id, text_redacted AS value FROM artifact_index WHERE text_redacted IS NOT NULL AND text_redacted != ''")
      .all() as { id: number; value: string }[];
    const changedMessages = diffRedactions(messages);
    const changedCommands = diffRedactions(commands);
    const changedIndex = diffRedactions(indexRows);
    const dryRun = !opts.force;
    if (dryRun || (!changedMessages.length && !changedCommands.length && !changedIndex.length)) {
      return {
        dbPath,
        dryRun,
        backupPath: null,
        scanned: { messages: messages.length, artifactCommands: commands.length, artifactIndex: indexRows.length },
        changed: { messages: changedMessages.length, artifactCommands: changedCommands.length, artifactIndex: changedIndex.length },
      };
    }
    const backup = opts.skipBackup ? null : await backupBrain({ dbPath, outPath: opts.backupPath, force: opts.backupPath ? false : true });
    const tx = db.transaction(() => {
      const msgUpdate = db.prepare("UPDATE messages SET content = ? WHERE id = ?");
      for (const row of changedMessages) msgUpdate.run(row.redacted, row.id);
      const cmdUpdate = db.prepare("UPDATE artifact SET command_redacted = ? WHERE id = ?");
      for (const row of changedCommands) cmdUpdate.run(row.redacted, row.id);
      const idxUpdate = db.prepare("UPDATE artifact_index SET text_redacted = ? WHERE rowid = ?");
      for (const row of changedIndex) idxUpdate.run(row.redacted, row.id);
    });
    tx();
    return {
      dbPath,
      dryRun: false,
      backupPath: backup?.outPath ?? null,
      scanned: { messages: messages.length, artifactCommands: commands.length, artifactIndex: indexRows.length },
      changed: { messages: changedMessages.length, artifactCommands: changedCommands.length, artifactIndex: changedIndex.length },
    };
  } finally {
    db.close();
  }
}
