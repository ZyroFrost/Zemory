// Offline replay: run the whole fixture corpus through a compressor and report
// the net metric. No model is called — this is the quota-free benchmark that
// gates any handler before it can be turned on (plan 03 §13).

import { compress } from "../compress/compress.js";
import { type Fixture, FIXTURES } from "./fixtures.js";
import { evaluate, type NetReport } from "./metrics.js";

/** A compressor under test: raw fixture in, compressed text out. */
export type CompressFn = (f: Fixture) => string;

/** The current deterministic `lite` engine — the phase-A baseline. */
export const liteFn: CompressFn = (f) => compress(f.raw, { cmd: f.cmd }).text;

export function replayAll(fn: CompressFn = liteFn): NetReport[] {
  return FIXTURES.map((f) => evaluate(f, fn(f)));
}

const padEnd = (s: string, n: number): string => (s.length >= n ? s : s + " ".repeat(n - s.length));
const padStart = (s: string, n: number): string => (s.length >= n ? s : " ".repeat(n - s.length) + s);

/** Render a fixed-width table of the replay result. */
export function formatReport(reports: NetReport[]): string {
  const head = `${padEnd("fixture", 18)} ${padEnd("kind", 9)} ${padStart("lines", 13)} ${padStart("chars%", 7)} ${padStart("~tok-", 8)} signals`;
  const rows = reports.map((r) => {
    const lines = `${r.before.lines}→${r.after.lines}`;
    return [
      padEnd(r.name, 18),
      padEnd(r.kind, 9),
      padStart(lines, 13),
      padStart(`${r.savedCharsPct}%`, 7),
      padStart(String(r.estTokensAvoided), 8),
      r.signalsKept ? "✓ kept" : `✗ LOST: ${r.missingSignals.join(", ")}`,
    ].join(" ");
  });
  const total = reports.reduce((a, r) => a + r.estTokensAvoided, 0);
  return [
    head,
    "-".repeat(head.length),
    ...rows,
    "",
    `~tokens avoided (estimate): ${total} across ${reports.length} fixtures · token counts are estimates, not billing`,
  ].join("\n");
}
