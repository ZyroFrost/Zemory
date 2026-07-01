// Retention — NEVER auto-deletes. The artifact store is permanent memory: once
// the compressor cuts raw output, that raw lives ONLY here (the transcript keeps
// just the envelope), so deleting it would lose data for good.
//
// Instead, to keep disk in check WITHOUT losing anything:
//   - archiveCold(): gzip cold, non-pinned raw files in place (lossless; show
//     transparently decompresses → still byte-exact). 'pin' is never archived.
//   - storeStats(): report disk usage + a WARNING when over the soft quota — the
//     user adds disk or archives; the system never silently drops data.
//   - removeArtifact(): explicit, user-initiated deletion only.
//
// Tunables (env): ZEMORY_ARTIFACT_QUOTA_GB (warn threshold, default 5),
//                 ZEMORY_ARTIFACT_ARCHIVE_DAYS (archive-after age, default 14).

import { existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { BRAIN_DB, type BrainDB, openBrain } from "../brain/db.js";
import { artifactDir } from "./store.js";

export const DEFAULT_SOFT_QUOTA_GB = 5;
export const DEFAULT_ARCHIVE_AFTER_DAYS = 14;

export function softQuotaBytes(): number {
  const g = Number(process.env.ZEMORY_ARTIFACT_QUOTA_GB);
  return (Number.isFinite(g) && g > 0 ? g : DEFAULT_SOFT_QUOTA_GB) * 1024 * 1024 * 1024;
}

export function archiveAfterMs(): number {
  const d = Number(process.env.ZEMORY_ARTIFACT_ARCHIVE_DAYS);
  return (Number.isFinite(d) && d > 0 ? d : DEFAULT_ARCHIVE_AFTER_DAYS) * 24 * 60 * 60 * 1000;
}

function existingPaths(db: BrainDB): string[] {
  const rows = db
    .prepare("SELECT DISTINCT storage_path AS p FROM artifact WHERE storage_path IS NOT NULL")
    .all() as { p: string }[];
  return rows.map((r) => r.p).filter((p) => existsSync(p));
}

const bytesOf = (paths: string[]): number => paths.reduce((a, p) => a + statSync(p).size, 0);

export interface StoreStats {
  count: number; // total artifacts
  archivedCount: number; // artifacts whose raw file is gzip-archived
  diskBytes: number; // bytes on disk (unique files)
  softQuotaBytes: number;
  overQuota: boolean; // true → warn the user (never auto-delete)
}

export function storeStats(opts: { dbPath?: string } = {}): StoreStats {
  const db = openBrain(opts.dbPath ?? BRAIN_DB);
  const count = (db.prepare("SELECT count(*) AS c FROM artifact").get() as { c: number }).c;
  const archivedCount = (
    db.prepare("SELECT count(*) AS c FROM artifact WHERE storage_path LIKE '%.gz'").get() as { c: number }
  ).c;
  const diskBytes = bytesOf(existingPaths(db));
  const quota = softQuotaBytes();
  return { count, archivedCount, diskBytes, softQuotaBytes: quota, overQuota: diskBytes > quota };
}

export interface ArchiveResult {
  archived: number; // files compressed
  freedBytes: number; // disk saved by compression (lossless; nothing deleted)
}

/**
 * Compress cold, non-pinned raw files in place (gzip). Lossless: the bytes are
 * preserved and show() transparently decompresses. Nothing is removed.
 */
export function archiveCold(opts: { dbPath?: string; olderThanMs?: number; now?: number } = {}): ArchiveResult {
  const dbPath = opts.dbPath ?? BRAIN_DB;
  const db = openBrain(dbPath);
  const now = opts.now ?? Date.now();
  const cutoff = new Date(now - (opts.olderThanMs ?? archiveAfterMs())).toISOString();
  const result: ArchiveResult = { archived: 0, freedBytes: 0 };

  // One row per distinct raw file; skip if any referencing artifact is pinned or
  // newer than the cutoff (keep recent/important ones hot).
  const groups = db
    .prepare(
      `SELECT storage_path AS p, MAX(created_at) AS newest, MAX(retention_class = 'pin') AS anyPin
       FROM artifact
       WHERE storage_path IS NOT NULL AND storage_path NOT LIKE '%.gz'
       GROUP BY storage_path`,
    )
    .all() as { p: string; newest: string | null; anyPin: number }[];

  for (const g of groups) {
    if (g.anyPin) continue;
    if (g.newest && g.newest > cutoff) continue;
    if (!existsSync(g.p)) continue;
    const raw = readFileSync(g.p);
    const gzPath = `${g.p}.gz`;
    writeFileSync(gzPath, gzipSync(raw), { mode: 0o600 });
    const before = statSync(g.p).size;
    const after = statSync(gzPath).size;
    unlinkSync(g.p);
    db.prepare("UPDATE artifact SET storage_path = ? WHERE storage_path = ?").run(gzPath, g.p);
    result.archived++;
    result.freedBytes += Math.max(0, before - after);
  }
  return result;
}

/**
 * EXPLICIT, user-initiated deletion. Removes the row + index, then deletes the
 * raw file only if no other artifact still references it. Never called
 * automatically — the store does not drop data on its own.
 */
export function removeArtifact(id: string, opts: { dbPath?: string } = {}): boolean {
  const db = openBrain(opts.dbPath ?? BRAIN_DB);
  const row = db.prepare("SELECT storage_path AS p FROM artifact WHERE id = ?").get(id) as
    | { p: string | null }
    | undefined;
  if (!row) return false;
  db.transaction(() => {
    db.prepare("DELETE FROM artifact_index WHERE artifact_id = ?").run(id);
    db.prepare("DELETE FROM artifact WHERE id = ?").run(id);
  })();
  if (row.p) {
    const stillUsed = (
      db.prepare("SELECT count(*) AS c FROM artifact WHERE storage_path = ?").get(row.p) as { c: number }
    ).c;
    if (stillUsed === 0 && existsSync(row.p)) unlinkSync(row.p);
  }
  return true;
}

/** Maintenance: delete raw files no surviving row references (e.g. after a crash). */
export function sweepOrphans(opts: { dbPath?: string } = {}): { orphanFiles: number; freedBytes: number } {
  const dbPath = opts.dbPath ?? BRAIN_DB;
  const db = openBrain(dbPath);
  const dir = artifactDir(dbPath);
  const out = { orphanFiles: 0, freedBytes: 0 };
  if (!existsSync(dir)) return out;
  const referenced = new Set(
    (db.prepare("SELECT DISTINCT storage_path AS p FROM artifact WHERE storage_path IS NOT NULL").all() as {
      p: string;
    }[]).map((r) => r.p),
  );
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (referenced.has(full)) continue;
    out.freedBytes += statSync(full).size;
    unlinkSync(full);
    out.orphanFiles++;
  }
  return out;
}
