// Small filesystem + text helpers shared by adapters.

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { TranscriptFile } from "./types.js";

export const MAX_BLOCK = 4000; // cap any single block so tool dumps don't bloat the index

export function clip(s: string): string {
  return s.length > MAX_BLOCK ? s.slice(0, MAX_BLOCK) + "…" : s;
}

export function safeReaddir(p: string): string[] {
  try {
    return readdirSync(p);
  } catch {
    return [];
  }
}

export function safeStat(p: string) {
  try {
    return statSync(p);
  } catch {
    return undefined;
  }
}

export function isDir(p: string): boolean {
  return safeStat(p)?.isDirectory() ?? false;
}

export function toTranscript(source: string, path: string): TranscriptFile | null {
  const st = safeStat(path);
  if (!st || !st.isFile()) return null;
  return { source, path, size: st.size, mtimeMs: Math.floor(st.mtimeMs) };
}

/** Recursively collect files matching `ext` (without dot), up to `depth` levels. */
export function walkFiles(root: string, ext: string, depth = 6): string[] {
  const out: string[] = [];
  const suffix = "." + ext;
  const rec = (dir: string, left: number): void => {
    for (const name of safeReaddir(dir)) {
      const p = join(dir, name);
      const st = safeStat(p);
      if (!st) continue;
      if (st.isDirectory()) {
        if (left > 0) rec(p, left - 1);
      } else if (name.endsWith(suffix)) {
        out.push(p);
      }
    }
  };
  rec(root, depth);
  return out;
}

/** Decode a file:// URI (Continue's workspaceDirectory) to a native path. */
export function decodeFileUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  if (!uri.startsWith("file://")) return uri;
  let p = decodeURIComponent(uri.replace(/^file:\/\//, ""));
  // "/d:/x" -> "d:\x" on Windows-style drive paths
  const m = p.match(/^\/([a-zA-Z]):\/(.*)$/);
  if (m) p = `${m[1]}:\\${m[2].replace(/\//g, "\\")}`;
  return p;
}
