// Savings ledger — forward-only, honest. Each DELIBERATE retrieval logs an
// ESTIMATE of tokens avoided per FEATURE: instead of re-loading the whole source
// (baseline), the feature surfaced a targeted slice (actual). avoided ≈ baseline −
// actual. Tokens ≈ chars/4. A targeted-retrieval EFFICIENCY estimate under a
// STATED assumption ("without it you'd load the whole source" — an upper bound),
// NOT a verified bill saving (zemory can't read provider usage/cost). Logged only
// on deliberate retrievals (CLI/MCP/UI-submit), never type-ahead. Per-feature so
// the report can show one column per feature + a total column.

import { BRAIN_DB, openBrain } from "./db.js";

export const estTokens = (chars: number): number => Math.round(chars / 4);

/** Minimal shape a retrieval hit needs for savings: which session it came from +
 *  the text that was actually served. SearchHit satisfies this structurally. */
export type SavedSlice = { sessionId: string; snippet: string };

/** Feature column order in the report (measurable token-saving features). */
const FEATURE_ORDER = ["recall", "digest", "compress"];

/**
 * Log one deliberate retrieval's savings estimate for a feature. Best-effort;
 * never throws. `hits` carry a sessionId + the served text (snippet) — baseline
 * is the full token count of the source session(s) those hits came from.
 */
export function logRecall(hits: SavedSlice[], query = "", dbPath: string = BRAIN_DB, feature = "recall"): void {
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
      db.prepare(
        "INSERT INTO recall_savings (ts, baseline_tokens, actual_tokens, query, hits, feature) VALUES (?,?,?,?,?,?)",
      ).run(new Date().toISOString(), estTokens(baseChars), estTokens(actualChars), query.slice(0, 200), hits.length, feature);
    } finally {
      db.close();
    }
  } catch {
    /* best-effort — savings logging must never break retrieval */
  }
}

/**
 * Log the "digest lane" saving: the agent read the thin per-session DIGEST
 * instead of loading the whole session. baseline = full session messages,
 * actual = the digest_text actually surfaced. One event per digest recall.
 */
export function logDigestRecall(sessionIds: string[], query = "", dbPath: string = BRAIN_DB): void {
  try {
    const sessions = [...new Set((sessionIds || []).filter(Boolean))];
    if (!sessions.length) return;
    const db = openBrain(dbPath);
    try {
      const ph = sessions.map(() => "?").join(",");
      const baseChars = Number(
        (
          db
            .prepare(`SELECT COALESCE(SUM(LENGTH(content)),0) AS c FROM messages WHERE session_id IN (${ph})`)
            .get(...sessions) as { c: number }
        ).c,
      );
      const actualChars = Number(
        (
          db
            .prepare(`SELECT COALESCE(SUM(LENGTH(digest_text)),0) AS c FROM session_digest WHERE session_id IN (${ph})`)
            .get(...sessions) as { c: number }
        ).c,
      );
      db.prepare(
        "INSERT INTO recall_savings (ts, baseline_tokens, actual_tokens, query, hits, feature) VALUES (?,?,?,?,?,?)",
      ).run(new Date().toISOString(), estTokens(baseChars), estTokens(actualChars), query.slice(0, 200), sessions.length, "digest");
    } finally {
      db.close();
    }
  } catch {
    /* best-effort */
  }
}

/** One row of the pivot: a day (or the grand total). Each feature cell shows a
 *  SAVING % = avoided/baseline. `byFeature[f]` = tokens avoided, `baseByFeature[f]`
 *  = baseline tokens for feature f (so the UI can render % = avoided/baseline). */
export interface PivotRow {
  date: string;
  recalls: number;
  byFeature: Record<string, number>; // tokens avoided per feature
  baseByFeature: Record<string, number>; // baseline tokens per feature
  avoided: number; // total tokens avoided (row)
  baseline: number; // total baseline tokens (row) → total % = avoided/baseline
}
export interface RecallEvent {
  ts: string;
  feature: string;
  query: string | null;
  hits: number | null;
  baseline: number;
  actual: number;
  avoided: number;
}
export interface SavingsReport {
  features: string[]; // feature columns present, ordered
  days: PivotRow[]; // newest day first
  total: PivotRow; // grand total row (last)
  since: string | null;
  recent: RecallEvent[]; // last individual retrievals (per message)
}

const orderFeatures = (fs: string[]): string[] => {
  const known = FEATURE_ORDER.filter((f) => fs.includes(f));
  const extra = fs.filter((f) => !FEATURE_ORDER.includes(f)).sort();
  return [...known, ...extra];
};

/** Per-day × per-feature pivot of savings, newest day first, plus a grand total. */
export function savingsByDay(dbPath: string = BRAIN_DB): SavingsReport {
  const db = openBrain(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT substr(ts,1,10) AS date, feature, COUNT(*) AS recalls,
                COALESCE(SUM(baseline_tokens),0) AS base,
                COALESCE(SUM(baseline_tokens - actual_tokens),0) AS avoided
         FROM recall_savings GROUP BY date, feature ORDER BY date DESC`,
      )
      .all() as { date: string; feature: string; recalls: number; base: number; avoided: number }[];

    const features = orderFeatures([...new Set(rows.map((r) => r.feature || "recall"))]);
    const dayMap = new Map<string, PivotRow>();
    const totalByFeature: Record<string, number> = {};
    const totalBaseByFeature: Record<string, number> = {};
    let totalRecalls = 0;
    let totalAvoided = 0;
    let totalBaseline = 0;
    for (const r of rows) {
      const f = r.feature || "recall";
      const av = Math.max(0, r.avoided);
      const base = Math.max(0, r.base);
      let day = dayMap.get(r.date);
      if (!day) {
        day = { date: r.date, recalls: 0, byFeature: {}, baseByFeature: {}, avoided: 0, baseline: 0 };
        dayMap.set(r.date, day);
      }
      day.byFeature[f] = (day.byFeature[f] ?? 0) + av;
      day.baseByFeature[f] = (day.baseByFeature[f] ?? 0) + base;
      day.recalls += r.recalls;
      day.avoided += av;
      day.baseline += base;
      totalByFeature[f] = (totalByFeature[f] ?? 0) + av;
      totalBaseByFeature[f] = (totalBaseByFeature[f] ?? 0) + base;
      totalRecalls += r.recalls;
      totalAvoided += av;
      totalBaseline += base;
    }
    const days = [...dayMap.values()];
    const total: PivotRow = {
      date: "total",
      recalls: totalRecalls,
      byFeature: totalByFeature,
      baseByFeature: totalBaseByFeature,
      avoided: totalAvoided,
      baseline: totalBaseline,
    };
    const since = (db.prepare("SELECT substr(MIN(ts),1,10) AS d FROM recall_savings").get() as { d: string | null }).d;
    const recent: RecallEvent[] = (
      db
        .prepare(
          "SELECT ts, feature, query, hits, baseline_tokens AS baseline, actual_tokens AS actual FROM recall_savings ORDER BY id DESC LIMIT 25",
        )
        .all() as {
        ts: string;
        feature: string | null;
        query: string | null;
        hits: number | null;
        baseline: number;
        actual: number;
      }[]
    ).map((r) => ({ ...r, feature: r.feature || "recall", avoided: Math.max(0, r.baseline - r.actual) }));
    return { features, days, total, since, recent };
  } finally {
    db.close();
  }
}
