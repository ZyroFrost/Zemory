// Where do agent transcripts live? Two strategies, both feeding the same
// adapters:
//
//   FAST (default scan): enumerate the default signature locations (home/AppData)
//   PLUS every store a previous deep scan already discovered (persisted in the
//   `known_stores` table). Sub-second — never walks the disk.
//
//   DEEP (find storage): walk the machine, match each adapter signature
//   ANYWHERE, and flag transcript-shaped dirs no adapter recognizes. Returns the
//   store roots it found so the caller can remember them — so you only deep-scan
//   to DISCOVER locations, then fast-scan routinely.

import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import { isDir, safeReaddir, safeStat } from "./adapters/_shared.js";
import type { Adapter, TranscriptFile } from "./adapters/types.js";

export interface StoreRef {
  source: string;
  root: string;
}

export interface UnknownStore {
  path: string;
  files: number;
  sample: string;
}

export interface DiscoveryResult {
  files: TranscriptFile[];
  /** Store roots enumerated this run (for persistence). */
  stores: StoreRef[];
  unknown: UnknownStore[];
  roots: string[];
  deep: boolean;
}

export interface DiscoverOptions {
  home: string;
  deep?: boolean;
  /** Store roots discovered earlier (always re-enumerated, even in fast mode). */
  knownStores?: StoreRef[];
  /** Extra roots to walk in deep mode (e.g. other drives). */
  roots?: string[];
  maxDepth?: number;
}

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".svn", ".hg", "$recycle.bin", "system volume information",
  "windows", "program files", "program files (x86)", "programdata", "$windows.~ws",
  "temp", "tmp", "cache", ".cache", "dist", "build", ".next", "venv", ".venv",
  "site-packages", "__pycache__", ".gradle", ".m2", "go",
]);

const STORE_NAMES = new Set(["sessions", "conversations", "history", "chats", "threads"]);

const IGNORE_TAILS = [
  join(".claude", "sessions"),
  join("hermes", "sessions"),
  join("ms-vscode.powershell", "sessions"),
].map((t) => sep + t.toLowerCase());

function defaultRoots(home: string): string[] {
  const roots = [home];
  const appdata = process.env.APPDATA;
  const local = process.env.LOCALAPPDATA;
  if (appdata && !appdata.startsWith(home)) roots.push(appdata);
  if (local && !local.startsWith(home)) roots.push(local);
  return roots;
}

export function discover(adapters: Adapter[], opts: DiscoverOptions): DiscoveryResult {
  return opts.deep ? deepDiscover(adapters, opts) : fastDiscover(adapters, opts);
}

// Shared: enumerate a known store root via the adapter that owns its source.
function enumStore(
  bySource: Map<string, Adapter>,
  store: StoreRef,
  seen: Set<string>,
  files: TranscriptFile[],
): void {
  const adapter = bySource.get(store.source);
  if (!adapter || !isDir(store.root)) return;
  for (const f of adapter.enumerate(store.root)) {
    if (seen.has(f.path)) continue;
    seen.add(f.path);
    files.push(f);
  }
}

function fastDiscover(adapters: Adapter[], opts: DiscoverOptions): DiscoveryResult {
  const bySource = new Map(adapters.map((a) => [a.source, a]));
  const roots = defaultRoots(opts.home);
  const seen = new Set<string>();
  const files: TranscriptFile[] = [];
  const stores: StoreRef[] = [];
  const seenStore = new Set<string>();

  const recordStore = (s: StoreRef) => {
    const key = s.root.toLowerCase();
    if (!seenStore.has(key)) {
      seenStore.add(key);
      stores.push(s);
    }
  };

  // Default signature locations.
  for (const a of adapters) {
    for (const root of roots) {
      const storeRoot = join(root, a.signature);
      if (!isDir(storeRoot)) continue;
      enumStore(bySource, { source: a.source, root: storeRoot }, seen, files);
      recordStore({ source: a.source, root: storeRoot });
    }
  }
  // Plus everything a deep scan found before.
  for (const ks of opts.knownStores ?? []) {
    enumStore(bySource, ks, seen, files);
    recordStore(ks);
  }

  return { files, stores, unknown: [], roots, deep: false };
}

function deepDiscover(adapters: Adapter[], opts: DiscoverOptions): DiscoveryResult {
  const bySource = new Map(adapters.map((a) => [a.source, a]));
  const roots = opts.roots && opts.roots.length ? opts.roots : [opts.home];
  const maxDepth = opts.maxDepth ?? 8;
  const sigs = adapters.map((a) => ({ a, tail: sep + a.signature.toLowerCase() }));

  const seen = new Set<string>();
  const files: TranscriptFile[] = [];
  const stores: StoreRef[] = [];
  const seenStore = new Set<string>();
  const unknown: UnknownStore[] = [];

  const recordStore = (s: StoreRef) => {
    const key = s.root.toLowerCase();
    if (!seenStore.has(key)) {
      seenStore.add(key);
      stores.push(s);
    }
  };

  // Re-enumerate already-known stores too (cheap, ensures nothing is lost).
  for (const ks of opts.knownStores ?? []) {
    enumStore(bySource, ks, seen, files);
    recordStore(ks);
  }

  const matchAdapter = (dirPath: string): Adapter | null => {
    const low = dirPath.toLowerCase();
    for (const s of sigs) if (low.endsWith(s.tail)) return s.a;
    return null;
  };

  const walk = (dir: string, depth: number): void => {
    const entries = safeReaddir(dir);
    const owner = matchAdapter(dir);
    if (owner) {
      enumStore(bySource, { source: owner.source, root: dir }, seen, files);
      recordStore({ source: owner.source, root: dir });
      return; // don't descend into a known store
    }
    const low = dir.toLowerCase();
    if (IGNORE_TAILS.some((t) => low.endsWith(t))) return;
    const base = dir.split(sep).pop()?.toLowerCase() ?? "";
    if (STORE_NAMES.has(base)) {
      const hits = entries.filter((e) => e.endsWith(".json") || e.endsWith(".jsonl"));
      if (hits.length >= 3) {
        unknown.push({ path: dir, files: hits.length, sample: hits[0] });
        return;
      }
    }
    if (depth <= 0) return;
    for (const name of entries) {
      if (name.startsWith("$") || SKIP_DIRS.has(name.toLowerCase())) continue;
      const child = join(dir, name);
      if (safeStat(child)?.isDirectory()) walk(child, depth - 1);
    }
  };

  for (const root of roots) if (existsSync(root)) walk(root, maxDepth);
  return { files, stores, unknown, roots, deep: true };
}
