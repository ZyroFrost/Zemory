// Recall-savings ledger — forward-only, honest. Each DELIBERATE recall logs an
// ESTIMATE of tokens avoided: instead of re-loading the source session(s)
// (baseline), recall surfaced a targeted slice (actual). avoided ≈ baseline −
// actual. Tokens ≈ chars/4. This is a targeted-recall EFFICIENCY estimate under a
// STATED assumption ("without recall you'd load the whole source" — an upper
// bound), NOT a verified bill saving (zemory can't read provider usage/cost). The
// UI labels it as such. Logged only on deliberate recalls (CLI search, UI submit,
// MCP), never on incremental type-ahead — so the count isn't inflated.

import { BRAIN_DB, openBrain } from "./db.js";
import type { SearchHit } from "./search.js";

export const estTokens = (chars: number): number => Math.round(chars / 4);

/** Log one deliberate recall's savings estimate. Best-effort; never throws. */
export function logRecall(hits: SearchHit[], dbPath: string = BRAIN_DB): void {
  try {
    if (!hits || !hits.length) return;
    const actualChars = hits.reduce((s, h) => s + (h.snippet ? h.snippet.length : 0), 0);
    const sessions = [...new Set(hits.map((h) => h.sessionId).filter(Boolean))];
    if (!sessions.length) return;
    const db = openBrain(dbPath);
    try {
      const placeholders = sessions.map(() => "?").join(",");
      const baseChars = Number(
        (
          db
            .prepare(`SELECT COALESCE(SUM(LENGTH(content)),0) AS c FROM messages WHERE session_id IN (${placeholders})`)
            .get(...sessions) as { c: number }
        ).c,
      );
      db.prepare("INSERT INTO recall_savings (ts, baseline_tokens, actual_tokens) VALUES (?,?,?)").run(
        new Date().toISOString(),
        estTokens(baseChars),
        estTokens(actualChars),
      );
    } finally {
      db.close();
    }
  } catch {
    /* best-effort — savings logging must never break recall */
  }
}

export interface SavingsDay {
  date: string;
  recalls: number;
  baseline: number;
  actual: number;
  avoided: number;
}
export interface SavingsReport {
  days: SavingsDay[];
  total: SavingsDay;
  since: string | null;
}

/** Per-day aggregation of recall savings, newest day first, plus the grand total. */
export function savingsByDay(dbPath: string = BRAIN_DB): SavingsReport {
  const db = openBrain(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT substr(ts,1,10) AS date, COUNT(*) AS recalls,
                COALESCE(SUM(baseline_tokens),0) AS baseline,
                COALESCE(SUM(actual_tokens),0) AS actual
         FROM recall_savings GROUP BY substr(ts,1,10) ORDER BY date DESC`,
      )
      .all() as { date: string; recalls: number; baseline: number; actual: number }[];
    const days: SavingsDay[] = rows.map((r) => ({
      date: r.date,
      recalls: r.recalls,
      baseline: r.baseline,
      actual: r.actual,
      avoided: Math.max(0, r.baseline - r.actual),
    }));
    const total: SavingsDay = {
      date: "total",
      recalls: days.reduce((s, d) => s + d.recalls, 0),
      baseline: days.reduce((s, d) => s + d.baseline, 0),
      actual: days.reduce((s, d) => s + d.actual, 0),
      avoided: days.reduce((s, d) => s + d.avoided, 0),
    };
    const since = (db.prepare("SELECT substr(MIN(ts),1,10) AS d FROM recall_savings").get() as { d: string | null }).d;
    return { days, total, since };
  } finally {
    db.close();
  }
}
