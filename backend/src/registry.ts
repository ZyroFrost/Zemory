// Known-projects registry — a global list of projects zemory has seen, so the
// UI can offer a picker (instead of only the launch directory). Stored at
// ~/.zemory/projects.json. Visiting or setting up a project registers it.
//
// Entries carry `pinned` (user keeps it on the tab bar) and `lastSeen` (recency)
// so the UI can show a few projects and tuck the rest behind a "…" menu.
// Temp/scratch directories are NOT registered — test runs used to pollute the
// real registry with hundreds of throwaway roots (see 06_CHANGES 2026-07-20).

import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, normalize, resolve } from "node:path";
import { CONFIG_FILE } from "./core/config.js";

/**
 * Where the registry lives. Resolved per call (not frozen at import) so tests —
 * and anyone isolating a run — can point it elsewhere via ZEMORY_REGISTRY_FILE
 * instead of writing into the real ~/.zemory/projects.json.
 */
function registryFile(): string {
  const override = process.env.ZEMORY_REGISTRY_FILE;
  return override && override.trim() ? override.trim() : join(homedir(), ".zemory", "projects.json");
}

export interface ProjectEntry {
  root: string;
  /** User pinned it — always visible on the tab bar. */
  pinned?: boolean;
  /** ISO timestamp of the last visit — drives "recent" ordering. */
  lastSeen?: string;
}

export interface KnownProject extends ProjectEntry {
  name: string;
}

/**
 * Comparison key for a project root. Windows paths are case-insensitive and the
 * same repo shows up as both `D:\…` and `d:\…` depending on how the shell spelled
 * it — without folding, one project renders as two tabs.
 */
function key(root: string): string {
  const norm = normalize(resolve(root)).replace(/[\\/]+$/, "");
  return process.platform === "win32" ? norm.toLowerCase() : norm;
}

/** Resolve 8.3 short names (`HUY~1.NGU`) to their long form so prefix checks match. */
function longPath(p: string): string {
  try {
    return realpathSync.native(p);
  } catch {
    return p;
  }
}

/**
 * True for scratch/throwaway roots (system temp). The test suite scaffolds dozens
 * of harnesses per run; registering them made the UI tab bar unusable and there is
 * no case where a temp dir is a project worth remembering. Escape hatch: set
 * ZEMORY_REGISTRY_ALLOW_TMP=1.
 */
export function isScratchRoot(root: string): boolean {
  if (process.env.ZEMORY_REGISTRY_ALLOW_TMP === "1") return false;
  const tmp = key(longPath(tmpdir()));
  const target = key(longPath(root));
  return target === tmp || target.startsWith(tmp + (process.platform === "win32" ? "\\" : "/"));
}

function read(): ProjectEntry[] {
  const FILE = registryFile();
  if (!existsSync(FILE)) return [];
  try {
    const v = JSON.parse(readFileSync(FILE, "utf8"));
    // v1 was a bare string[]; keep reading it so an upgrade loses nothing.
    const raw: unknown[] = Array.isArray(v) ? v : Array.isArray(v?.projects) ? v.projects : [];
    const out: ProjectEntry[] = [];
    const seen = new Set<string>();
    for (const item of raw) {
      const entry: ProjectEntry | null =
        typeof item === "string"
          ? { root: item }
          : item && typeof item === "object" && typeof (item as ProjectEntry).root === "string"
            ? (item as ProjectEntry)
            : null;
      if (!entry) continue;
      const k = key(entry.root);
      const prev = out.find((e) => key(e.root) === k);
      if (prev) {
        // Same project spelled two ways — merge rather than list it twice.
        prev.pinned = prev.pinned || entry.pinned;
        if (entry.lastSeen && (!prev.lastSeen || entry.lastSeen > prev.lastSeen)) prev.lastSeen = entry.lastSeen;
        continue;
      }
      seen.add(k);
      out.push({ ...entry });
    }
    return out;
  } catch {
    return [];
  }
}

function write(list: ProjectEntry[]): void {
  const FILE = registryFile();
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify({ version: 2, projects: list }, null, 2) + "\n");
}

/** Record a project root (idempotent). Refreshes `lastSeen` on every visit. */
export function rememberProject(root: string): void {
  if (isScratchRoot(root)) return;
  const list = read();
  const k = key(root);
  const now = new Date().toISOString();
  const hit = list.find((e) => key(e.root) === k);
  if (hit) {
    hit.lastSeen = now;
  } else {
    list.push({ root, lastSeen: now });
  }
  write(list);
}

/** Known projects that still exist + are still set up, most recent first. */
export function listKnownProjects(): KnownProject[] {
  return read()
    .filter((e) => existsSync(join(e.root, CONFIG_FILE)))
    .map((e) => ({ ...e, name: basename(e.root) }))
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return (b.lastSeen ?? "").localeCompare(a.lastSeen ?? "");
    });
}

/** Pin/unpin a project so the UI always shows it. Returns false if unknown. */
export function pinProject(root: string, pinned: boolean): boolean {
  const list = read();
  const hit = list.find((e) => key(e.root) === key(root));
  if (!hit) return false;
  hit.pinned = pinned;
  write(list);
  return true;
}

/**
 * Drop a project from the picker. This only edits zemory's own list — the project
 * folder, its docs and its memory data are left untouched.
 */
export function forgetProject(root: string): boolean {
  const list = read();
  const k = key(root);
  const next = list.filter((e) => key(e.root) !== k);
  if (next.length === list.length) return false;
  write(next);
  return true;
}

/**
 * Drop entries whose folder is gone, is no longer set up, or is a scratch dir.
 * Returns how many were removed. Advisory cleanup — never touches the folders.
 */
export function pruneDeadProjects(): number {
  const list = read();
  const next = list.filter((e) => existsSync(join(e.root, CONFIG_FILE)) && !isScratchRoot(e.root));
  if (next.length === list.length) return 0;
  write(next);
  return list.length - next.length;
}
