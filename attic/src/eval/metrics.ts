// Net-impact metric for the compressor. The honest fields are bytes/chars/lines
// (measured exactly); token counts are ESTIMATES (~chars/4) and are always
// labeled as such — never reported as a real token count (plan 03 §13).
//
// Recovery cost (re-reads an agent makes because something was cut) is a runtime
// signal that only exists once a host is wired (phase C/D); phase A defines and
// measures the static fields here so later phases compare against this baseline.

import type { Fixture } from "./fixtures.js";

export interface SizeMetric {
  chars: number;
  lines: number;
  /** ESTIMATE only (~chars/4). Not a real token count. */
  estTokens: number;
}

export function measure(text: string): SizeMetric {
  const chars = text.length;
  const lines = text === "" ? 0 : text.split("\n").length;
  return { chars, lines, estTokens: Math.ceil(chars / 4) };
}

export interface NetReport {
  name: string;
  kind: Fixture["kind"];
  before: SizeMetric;
  after: SizeMetric;
  savedCharsPct: number;
  savedLinesPct: number;
  /** ESTIMATE of tokens avoided; labeled, never a billing claim. */
  estTokensAvoided: number;
  signalsKept: boolean;
  missingSignals: string[];
}

const pct = (before: number, after: number): number =>
  before > 0 ? Math.round((1 - after / before) * 100) : 0;

/** Score one fixture against its compressed form. */
export function evaluate(fixture: Fixture, compressed: string): NetReport {
  const before = measure(fixture.raw);
  const after = measure(compressed);
  const missingSignals = fixture.requiredSignals.filter((s) => !compressed.includes(s));
  return {
    name: fixture.name,
    kind: fixture.kind,
    before,
    after,
    savedCharsPct: pct(before.chars, after.chars),
    savedLinesPct: pct(before.lines, after.lines),
    estTokensAvoided: Math.max(0, before.estTokens - after.estTokens),
    signalsKept: missingSignals.length === 0,
    missingSignals,
  };
}
