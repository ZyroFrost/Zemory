// `leanctx` compress provider — a STRICT SUPERSET of `lite`:
//   - op "text"/"command": delegate to lite (lean-ctx has no generic text/log
//     filter; that is lite's job, and selecting leanctx must never lose it).
//   - op "read": NEW — compress a code file to its structural signatures via the
//     external lean-ctx binary, with a verbatim fallback when it is unavailable.
//
// This matches the design in docs/plan: lean-ctx is the engine for code-read +
// command-aware cases; lite is the always-available deterministic fallback.

import { readFileSync } from "node:fs";
import { type CompressResult, compress } from "../compress/compress.js";
import { compressionOff } from "../compress/policy.js";
import { runCompressed } from "../compress/run.js";
import { type ReadMode, probe, readFile } from "../compress/engines/leanctx.js";
import type { Module } from "../core/types.js";

const lineCount = (s: string): number => (s === "" ? 0 : s.split("\n").length);

export interface ReadPayload {
  file: string;
  mode?: ReadMode;
}

/** Compress a code file to its signatures via lean-ctx; fail-open to verbatim. */
export function readCode(payload: ReadPayload): CompressResult {
  const raw = readFileSync(payload.file, "utf8");
  const before = lineCount(raw);
  if (compressionOff()) return { text: raw, before, after: before, savedPct: 0 }; // kill switch → verbatim
  const r = readFile(payload.file, payload.mode ?? "signatures");
  if (!r.ok) return { text: raw, before, after: before, savedPct: 0 }; // no engine → no loss, no gain
  const after = lineCount(r.text);
  const savedPct = before > 0 ? Math.round((1 - after / before) * 100) : 0;
  return { text: r.text, before, after, savedPct };
}

export const compressLeanCtx: Module = {
  name: "leanctx",
  provides: "compress",
  run(_ctx, op, payload) {
    if (op === "read") return readCode(payload as ReadPayload);
    if (op === "text") return compress(String(payload ?? ""));
    if (op === "command") return runCompressed(String(payload ?? ""));
    throw new Error(`Unsupported compress operation: ${op}`);
  },
  check() {
    const p = probe();
    if (!p.available) {
      return {
        ok: false,
        detail:
          "lean-ctx binary not found (set LEANCTX_BIN or install lean-ctx-bin) · text/command still work via lite",
      };
    }
    return {
      ok: true,
      detail: `lean-ctx ${p.version ?? "?"} (${p.source}) · code-read signatures · text/command via lite`,
    };
  },
};
