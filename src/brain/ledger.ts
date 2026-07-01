// Token-savings ledger — records baseline (no-zemory) vs actual (with-zemory)
// per event so the UI can show a real before/after benchmark. Token counts are
// an ESTIMATE (≈ chars/4); label them as such. Honest: compress is a true
// before/after; recall's baseline assumes "without zemory you'd read the whole
// containing message/section" (stated assumption, measurable from the DB).

import { BRAIN_DB, openBrain } from "./db.js";

/** Rough token estimate from character length (≈ chars / 4). */
export const estTokens = (chars: number): number => Math.round(chars / 4);

/** Record one saving event. Best-effort; never throws into the caller. */
export function logSavings(
  kind: "compress" | "recall",
  baselineChars: number,
  actualChars: number,
  detail: string,
  projectRoot?: string,
  dbPath: string = BRAIN_DB,
): void {
  try {
    const db = openBrain(dbPath);
    try {
      db.prepare(
        "INSERT INTO ledger (ts, kind, project_root, baseline_tokens, actual_tokens, detail) VALUES (?,?,?,?,?,?)",
      ).run(new Date().toISOString(), kind, projectRoot ?? null, estTokens(baselineChars), estTokens(actualChars), detail);
    } finally {
      db.close();
    }
  } catch {
    /* ledger is best-effort */
  }
}

export interface LedgerRow {
  kind: string;
  baseline: number;
  actual: number;
  saved: number;
  events: number;
  pct: number;
}

export interface LedgerSummary {
  byKind: LedgerRow[];
  total: LedgerRow;
  recent: { ts: string; kind: string; baseline: number; actual: number; detail: string }[];
}

const pct = (b: number, a: number) => (b > 0 ? Math.round((1 - a / b) * 100) : 0);

export function ledgerSummary(dbPath: string = BRAIN_DB): LedgerSummary {
  const db = openBrain(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT kind, COALESCE(SUM(baseline_tokens),0) AS baseline,
                COALESCE(SUM(actual_tokens),0) AS actual, COUNT(*) AS events
         FROM ledger GROUP BY kind`,
      )
      .all() as { kind: string; baseline: number; actual: number; events: number }[];
    const byKind: LedgerRow[] = rows.map((r) => ({
      kind: r.kind,
      baseline: r.baseline,
      actual: r.actual,
      saved: r.baseline - r.actual,
      events: r.events,
      pct: pct(r.baseline, r.actual),
    }));
    const tb = byKind.reduce((s, r) => s + r.baseline, 0);
    const ta = byKind.reduce((s, r) => s + r.actual, 0);
    const te = byKind.reduce((s, r) => s + r.events, 0);
    const recent = db
      .prepare(
        "SELECT ts, kind, baseline_tokens AS baseline, actual_tokens AS actual, detail FROM ledger ORDER BY ts DESC LIMIT 12",
      )
      .all() as LedgerSummary["recent"];
    return {
      byKind,
      total: { kind: "total", baseline: tb, actual: ta, saved: tb - ta, events: te, pct: pct(tb, ta) },
      recent,
    };
  } finally {
    db.close();
  }
}
