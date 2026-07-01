// Artifact reading: progressive disclosure over stored output (plan 03 §6/§9).
//   - showArtifact  → byte-exact raw recovery (optionally a line range);
//   - searchArtifact→ matches within the REDACTED index, returns small chunks.
// Both touch accessed_at so retention can evict by LRU.

import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { BRAIN_DB, type BrainDB, openBrain } from "../brain/db.js";

/** Read a stored raw file, transparently decompressing an archived (.gz) one. */
function readStored(path: string): string {
  return path.endsWith(".gz")
    ? gunzipSync(readFileSync(path)).toString("utf8")
    : readFileSync(path, "utf8");
}

export interface ArtifactRow {
  id: string;
  sha256: string;
  project_root: string | null;
  command_redacted: string | null;
  exit_code: number | null;
  raw_bytes: number;
  storage_path: string | null;
  retention_class: string;
  has_secret: number;
  created_at: string | null;
  expires_at: string | null;
}

function touch(db: BrainDB, id: string, now: number): void {
  db.prepare("UPDATE artifact SET accessed_at = ? WHERE id = ?").run(new Date(now).toISOString(), id);
}

export function getArtifact(id: string, dbPath: string = BRAIN_DB): ArtifactRow | undefined {
  return openBrain(dbPath).prepare("SELECT * FROM artifact WHERE id = ?").get(id) as
    | ArtifactRow
    | undefined;
}

export interface ShowResult {
  found: boolean; // artifact id exists
  available: boolean; // raw file present (false for no-store / evicted)
  text: string;
  totalLines: number;
  offset: number;
  limit: number | null;
}

/**
 * Recover stored output. With no range, returns the raw file BYTE-FOR-BYTE.
 * With offset/limit, returns that 1-based line window.
 */
export function showArtifact(
  id: string,
  opts: { offset?: number; limit?: number; dbPath?: string; now?: number } = {},
): ShowResult {
  const dbPath = opts.dbPath ?? BRAIN_DB;
  const db = openBrain(dbPath);
  const row = getArtifact(id, dbPath);
  if (!row) return { found: false, available: false, text: "", totalLines: 0, offset: 0, limit: null };
  touch(db, id, opts.now ?? Date.now());

  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? null;
  if (!row.storage_path || !existsSync(row.storage_path)) {
    return { found: true, available: false, text: "", totalLines: 0, offset, limit };
  }
  const raw = readStored(row.storage_path);
  const allLines = raw.split("\n");
  if (offset === 0 && limit === null) {
    // Full recovery → return the file unchanged (byte-exact).
    return { found: true, available: true, text: raw, totalLines: allLines.length, offset, limit };
  }
  const slice = allLines.slice(offset, limit === null ? undefined : offset + limit);
  return { found: true, available: true, text: slice.join("\n"), totalLines: allLines.length, offset, limit };
}

export interface SearchHit {
  ordinal: number; // 1-based line number
  text: string; // redacted line
}

/** Substring search within ONE artifact's redacted index (case-insensitive). */
export function searchArtifact(
  id: string,
  query: string,
  opts: { limit?: number; dbPath?: string; now?: number } = {},
): SearchHit[] {
  const dbPath = opts.dbPath ?? BRAIN_DB;
  const db = openBrain(dbPath);
  if (!getArtifact(id, dbPath)) return [];
  touch(db, id, opts.now ?? Date.now());
  const like = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return db
    .prepare(
      `SELECT ordinal, text_redacted AS text FROM artifact_index
       WHERE artifact_id = ? AND lower(text_redacted) LIKE lower(?) ESCAPE '\\'
       ORDER BY ordinal LIMIT ?`,
    )
    .all(id, like, opts.limit ?? 20) as SearchHit[];
}

export interface ArtifactListRow {
  id: string;
  project_root: string | null;
  command_redacted: string | null;
  raw_bytes: number;
  retention_class: string;
  has_secret: number;
  created_at: string | null;
  expires_at: string | null;
}

export function listArtifacts(
  opts: { projectRoot?: string; limit?: number; dbPath?: string } = {},
): ArtifactListRow[] {
  const db = openBrain(opts.dbPath ?? BRAIN_DB);
  const where = opts.projectRoot ? "WHERE project_root = ?" : "";
  const args: (string | number)[] = opts.projectRoot ? [opts.projectRoot] : [];
  args.push(opts.limit ?? 50);
  return db
    .prepare(
      `SELECT id, project_root, command_redacted, raw_bytes, retention_class, has_secret,
              created_at, expires_at
       FROM artifact ${where} ORDER BY created_at DESC LIMIT ?`,
    )
    .all(...args) as ArtifactListRow[];
}
