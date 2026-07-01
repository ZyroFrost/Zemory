// lean-ctx engine adapter — calls the EXTERNAL lean-ctx binary (never vendored;
// lean-ctx is Apache-2.0 but its core is Rust, so zemory owns only this thin
// transport + policy, not the engine source). lean-ctx owns structural
// compression: code-signature maps and command-aware output reshaping. zemory
// owns routing, policy, artifacts and metrics.
//
// Fail-open by contract: if the binary is missing or errors, every call returns
// `ok:false` so the caller falls back to the deterministic `lite` engine.
// Compression is never required for a tool to succeed.
//
// Resolution order (no machine path hardcoded):
//   1. LEANCTX_BIN env — explicit path; a *.js entry runs via node, anything
//      else is spawned directly.
//   2. the `lean-ctx-bin` npm package (optional dependency), if installed.
//   3. `lean-ctx` on PATH.

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

export interface LeanCtxInvoker {
  /** Executable to spawn. */
  cmd: string;
  /** Args prepended before the subcommand (e.g. the .js entry when run via node). */
  baseArgs: string[];
  /** Where it was resolved from — surfaced by doctor. */
  source: string;
}

const MAX_BUFFER = 64 * 1024 * 1024;
let cached: LeanCtxInvoker | null | undefined;

function fromEnv(): LeanCtxInvoker | null {
  const p = process.env.LEANCTX_BIN?.trim();
  if (!p) return null;
  return p.toLowerCase().endsWith(".js")
    ? { cmd: process.execPath, baseArgs: [p], source: "LEANCTX_BIN" }
    : { cmd: p, baseArgs: [], source: "LEANCTX_BIN" };
}

function fromPackage(): LeanCtxInvoker | null {
  try {
    const require = createRequire(import.meta.url);
    const js = require.resolve("lean-ctx-bin/bin/lean-ctx.js");
    return { cmd: process.execPath, baseArgs: [js], source: "lean-ctx-bin package" };
  } catch {
    return null;
  }
}

function fromPath(): LeanCtxInvoker | null {
  const probe = spawnSync("lean-ctx", ["--version"], { encoding: "utf8" });
  if (!probe.error && probe.status === 0) return { cmd: "lean-ctx", baseArgs: [], source: "PATH" };
  return null;
}

/** Resolve the lean-ctx invoker once (memoized). null = not available. */
export function resolveLeanCtx(): LeanCtxInvoker | null {
  if (cached !== undefined) return cached;
  cached = fromEnv() ?? fromPackage() ?? fromPath() ?? null;
  return cached;
}

/** Drop the memoized resolution (tests / after changing LEANCTX_BIN). */
export function resetLeanCtx(): void {
  cached = undefined;
}

function invoke(inv: LeanCtxInvoker, args: string[]): { ok: boolean; stdout: string; status: number } {
  const r = spawnSync(inv.cmd, [...inv.baseArgs, ...args], { encoding: "utf8", maxBuffer: MAX_BUFFER });
  return { ok: !r.error && (r.status ?? 1) === 0, stdout: r.stdout ?? "", status: r.status ?? 1 };
}

export interface ProbeResult {
  available: boolean;
  version: string | null;
  source: string | null;
}

/** Detect the binary and its version (used by doctor). */
export function probe(): ProbeResult {
  const inv = resolveLeanCtx();
  if (!inv) return { available: false, version: null, source: null };
  const r = invoke(inv, ["--version"]); // "lean-ctx 3.8.8 (official, ...)"
  const m = r.stdout.match(/lean-ctx\s+(\d+\.\d+\.\d+)/i);
  return { available: r.ok, version: m?.[1] ?? null, source: inv.source };
}

/** Read modes. `signatures` = function/type map with line ranges (the real win);
 *  `density`/`outline` keep full content and are kept for parity/experiments. */
export type ReadMode = "signatures" | "density" | "outline";

export interface LeanReadResult {
  text: string;
  /** false → binary unavailable or errored; caller should fall back. */
  ok: boolean;
}

/**
 * Read a code file through lean-ctx (default: structural signatures map).
 * Fail-open: ok:false when the binary is unavailable or produces nothing.
 */
export function readFile(file: string, mode: ReadMode = "signatures"): LeanReadResult {
  const inv = resolveLeanCtx();
  if (!inv) return { text: "", ok: false };
  const r = invoke(inv, ["read", file, "-m", mode]);
  if (!r.ok || !r.stdout.trim()) return { text: "", ok: false };
  return { text: r.stdout, ok: true };
}
