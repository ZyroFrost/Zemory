// Recency-aware recall. Agents kept surfacing STALE memory because ranking was
// relevance-only; this blends a time-decay weight so the newest RELEVANT item
// wins, and older ones surface only further down — with a FLOOR so a strongly
// relevant old item is never dropped (it just ranks below fresher peers).
//
// Default ON. Disable per call (`--no-recency` / opts.recency=false) or globally
// (ZEMORY_RECENCY=0) when you want pure-relevance / historical search.
// Half-life is configurable via ZEMORY_RECALL_HALFLIFE_DAYS (default 30 days).

const HALFLIFE_DAYS = (() => {
  const v = Number(process.env.ZEMORY_RECALL_HALFLIFE_DAYS);
  return Number.isFinite(v) && v > 0 ? v : 30;
})();
const FLOOR = 0.15;

/** Recency ON? per-call `force` wins; else ZEMORY_RECENCY env; else default ON. */
export function recencyEnabled(force?: boolean): boolean {
  if (force !== undefined) return force;
  const v = process.env.ZEMORY_RECENCY?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  if (v === "1" || v === "true" || v === "on") return true;
  return true;
}

/**
 * Time-decay weight in [FLOOR, 1]: 1 at age 0, 0.5 at one half-life, floored so
 * an old-but-very-relevant hit still appears. Unknown/unparseable age → neutral.
 * `nowMs` is injected (not read from the clock) so callers/tests stay deterministic.
 */
export function recencyFactor(timestamp: string | null | undefined, nowMs: number): number {
  if (!timestamp) return 0.5;
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return 0.5;
  const ageDays = Math.max(0, (nowMs - t) / 86_400_000);
  return Math.max(FLOOR, Math.pow(0.5, ageDays / HALFLIFE_DAYS));
}

/**
 * Re-rank items ALREADY in relevance order by `relevancePos × recency`, where
 * relevancePos = 1/(1+i). That harmonic curve keeps deep-tail (low-relevance)
 * items from leaping to the top just for being recent, while letting comparably
 * relevant items reorder by freshness. Stable-ish: ties keep input order.
 */
export function blendRecency<T>(
  items: T[],
  timestampOf: (item: T) => string | null | undefined,
  enabled: boolean,
  nowMs: number = Date.now(),
): T[] {
  if (!enabled || items.length < 2) return items;
  return items
    .map((item, i) => ({ item, i, score: (1 / (1 + i)) * recencyFactor(timestampOf(item), nowMs) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.item);
}
