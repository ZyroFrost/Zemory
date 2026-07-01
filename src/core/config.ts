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
  return config as HarnessConfig;
}

/** Walk up from `start` to find the nearest project root (dir with docs/.harness.json). */
export function findProjectRoot(start: string = process.cwd()): string | null {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, CONFIG_FILE))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
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
