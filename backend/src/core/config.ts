import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { Context, HarnessConfig } from "./types.js";

// Config lives INSIDE docs/ so the project root stays clean (everything zemory
// is contained in docs/). Root only carries AGENTS.md.
export const CONFIG_FILE = join("docs", ".harness.json");

function assertConfig(value: unknown, projectRoot: string): HarnessConfig {
  if (!value || typeof value !== "object") throw new Error("Invalid docs/.harness.json: expected an object.");
  const config = value as Partial<HarnessConfig>;
  if (typeof config.docs !== "string" || !config.docs.trim()) {
    throw new Error("Invalid docs/.harness.json: docs must be a relative path.");
  }
  const docsRoot = resolve(projectRoot, "docs");
  const docsDir = resolve(projectRoot, config.docs);
  const rel = relative(docsRoot, docsDir);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Invalid docs/.harness.json: docs must stay inside the project docs directory.");
  }
  if (!config.adapters || typeof config.adapters !== "object") config.adapters = {};
  if (!config.thresholds || typeof config.thresholds !== "object") config.thresholds = {};
  // Structure profile: which standard validate/structure enforce (03_STRUCTURE).
  config.profile = config.profile === "non-app" ? "non-app" : "app";
  return config as HarnessConfig;
}

/** Canonical spelling of a project root, for use as an index key.
 *
 *  On Windows the case of the drive letter depends on how the shell entered the
 *  directory (`cd d:\x` vs `cd D:\x`), so process.cwd() hands back two different
 *  spellings of the SAME folder. Measured 2026-07-29: this repo's own doc index was
 *  split in two — 24 rows under `D:\Zyro\Tool\Zemory` and 15 stale duplicates under
 *  `d:\Zyro\Tool\Zemory` — so a project-scoped search saw only whichever half matched
 *  the casing of the moment. Upper-casing the drive letter is a safe canonical form
 *  (Windows drive letters are case-insensitive); the rest of the path is left alone,
 *  since folder names are meaningful and other platforms are case-sensitive. */
export function normalizeRoot(path: string): string {
  const abs = resolve(path);
  return process.platform === "win32" ? abs.replace(/^([a-z]):/, (_m, drive: string) => `${drive.toUpperCase()}:`) : abs;
}

/** Walk up from `start` to find the nearest project root (dir with docs/.harness.json). */
export function findProjectRoot(start: string = process.cwd()): string | null {
  let dir = normalizeRoot(start);
  while (true) {
    if (existsSync(join(dir, CONFIG_FILE))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** The project root for the current directory, falling back to the directory itself
 *  when there is no harness above it — always canonical, so what callers look up in
 *  the index matches what was written into it. */
export function currentProjectRoot(): string {
  return findProjectRoot() ?? normalizeRoot(process.cwd());
}

/** Load the project context (config + resolved docs dir) from a project root. */
export function loadContext(projectRoot: string): Context {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(projectRoot, CONFIG_FILE), "utf8"));
  } catch (error) {
    throw new Error(
      `Invalid ${CONFIG_FILE}: ${error instanceof Error ? error.message : "cannot read config"}`,
      { cause: error },
    );
  }
  const config = assertConfig(raw, projectRoot);
  return {
    projectRoot,
    docsDir: resolve(projectRoot, config.docs),
    config,
    log: (msg) => console.log(msg),
  };
}
