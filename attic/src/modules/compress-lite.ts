import { compress } from "../compress/compress.js";
import { runCompressed } from "../compress/run.js";
import type { Module } from "../core/types.js";

export const compressLite: Module = {
  name: "lite",
  provides: "compress",
  run(_ctx, op, payload) {
    if (op === "text") return compress(String(payload ?? ""));
    if (op === "command") return runCompressed(String(payload ?? ""));
    throw new Error(`Unsupported compress operation: ${op}`);
  },
  check() {
    const sample = Array.from({ length: 60 }, (_, i) => `progress line ${i % 4}`).join("\n");
    const result = compress(sample);
    return {
      ok: result.after < result.before,
      detail: `${result.before}→${result.after} lines · deterministic lite provider`,
    };
  },
};
