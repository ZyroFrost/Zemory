// Scoped sync/recall — a provenance TREE over the memory plus an EXCLUDE list so
// the user can leave "shared" lanes out of sync and recall WITHOUT deleting them
// (spec: docs/plan/08_scoped_sync.md). Built on the columns already stamped on
// every session (origin / host / source) — no new store, no migration. The same
// exclude list drives three surfaces: recall (search.ts), and both directions of
// sync (share.ts export + merge). Data stays in the local DB either way.

import { type MemoryDB, currentMemoryDb, openMemory } from "./db.js";
import { getScopeExclude, type ScopeLane } from "../settings.js";

export type { ScopeLane };

export interface ScopeSession {
  origin: string;
  host: string | null;
  source: string;
}

/** Stable key for a lane selector — UI toggle identity + dedup. */
export function laneKey(l: ScopeLane): string {
  return `o=${l.origin ?? ""}|h=${l.host ?? ""}|s=${l.source ?? ""}`;
}

/** Does one exclude lane match a given session? An empty lane matches nothing
 *  (guard against an all-wildcard selector silently hiding the whole memory). */
export function laneMatches(lane: ScopeLane, s: ScopeSession): boolean {
  let any = false;
  if (lane.origin !== undefined) {
    if (lane.origin !== s.origin) return false;
    any = true;
  }
  if (lane.host !== undefined) {
    if (lane.host !== (s.host ?? "")) return false;
    any = true;
  }
  if (lane.source !== undefined) {
    if (lane.source !== s.source) return false;
    any = true;
  }
  return any;
}

/** Is a session excluded by any lane in the list (default = the saved list)? */
export function isExcluded(s: ScopeSession, lanes: ScopeLane[] = getScopeExclude()): boolean {
  return lanes.some((l) => laneMatches(l, s));
}

/** Does exclude lane `l` cover (is a prefix of) node lane `n`? Used to grey out a
 *  child in the UI when an ancestor lane already excludes it. */
function laneCovers(l: ScopeLane, n: ScopeLane): boolean {
  if (l.origin !== undefined && l.origin !== n.origin) return false;
  if (l.host !== undefined && l.host !== n.host) return false;
  if (l.source !== undefined && l.source !== n.source) return false;
  return l.origin !== undefined || l.host !== undefined || l.source !== undefined;
}

/**
 * A positive SQL match for the exclude lanes against a sessions-table alias, e.g.
 * `(COALESCE(a.origin,'local')=? AND a.source=?) OR (...)`. Callers use it as-is
 * to DELETE excluded rows (export) or negated (`NOT (...)`) to skip them (merge).
 * Returns an empty match when there is nothing to exclude.
 */
export function laneSqlClause(alias: string, lanes: ScopeLane[]): { match: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  for (const l of lanes) {
    const conds: string[] = [];
    if (l.origin !== undefined) {
      conds.push(`COALESCE(${alias}.origin,'local') = ?`);
      params.push(l.origin);
    }
    if (l.host !== undefined) {
      conds.push(`COALESCE(${alias}.host,'') = ?`);
      params.push(l.host);
    }
    if (l.source !== undefined) {
      conds.push(`${alias}.source = ?`);
      params.push(l.source);
    }
    if (conds.length) parts.push(`(${conds.join(" AND ")})`);
  }
  return { match: parts.join(" OR "), params };
}

export interface ScopeNode {
  key: string; // laneKey of this node's selector (toggle identity)
  label: string;
  lane: ScopeLane; // the selector to exclude/include when this node is toggled
  sessions: number;
  messages: number;
  excluded: boolean; // this exact lane is in the exclude list
  effectiveExcluded: boolean; // excluded by this lane OR an ancestor lane
  children?: ScopeNode[];
}

interface LaneRow {
  origin: string;
  host: string;
  source: string;
  sessions: number;
  messages: number;
}

/**
 * Provenance tree for the UI: Local → machine → agent, and Web → platform, each
 * node carrying session/message counts and its current exclude state. Purely
 * derived — GROUP BY over `sessions`, then assembled in JS.
 */
export function scopeTree(dbPath: string = currentMemoryDb(), lanes: ScopeLane[] = getScopeExclude()): ScopeNode[] {
  const db: MemoryDB = openMemory(dbPath);
  let rows: LaneRow[];
  try {
    rows = db
      .prepare(
        `SELECT COALESCE(origin,'local') AS origin,
                COALESCE(host,'')         AS host,
                source,
                COUNT(*)                       AS sessions,
                COALESCE(SUM(message_count),0) AS messages
           FROM sessions
          GROUP BY COALESCE(origin,'local'), COALESCE(host,''), source`,
      )
      .all() as LaneRow[];
  } finally {
    db.close();
  }

  const mark = (lane: ScopeLane): { excluded: boolean; effectiveExcluded: boolean } => ({
    excluded: lanes.some((l) => laneKey(l) === laneKey(lane)),
    effectiveExcluded: lanes.some((l) => laneCovers(l, lane)),
  });

  const originOrder = ["local", "web"];
  const out: ScopeNode[] = [];
  for (const origin of [...originOrder, ...[...new Set(rows.map((r) => r.origin))].filter((o) => !originOrder.includes(o))]) {
    const orows = rows.filter((r) => r.origin === origin);
    if (!orows.length) continue;
    const originLane: ScopeLane = { origin };
    const originNode: ScopeNode = {
      key: laneKey(originLane),
      label: origin === "local" ? "Local (agents)" : origin === "web" ? "Web chat" : origin,
      lane: originLane,
      sessions: sum(orows, "sessions"),
      messages: sum(orows, "messages"),
      ...mark(originLane),
      children: [],
    };

    if (origin === "local") {
      // Local → machine → agent
      for (const host of [...new Set(orows.map((r) => r.host))].sort()) {
        const hrows = orows.filter((r) => r.host === host);
        const hostLane: ScopeLane = { origin, host };
        const hostNode: ScopeNode = {
          key: laneKey(hostLane),
          label: host || "(unknown machine)",
          lane: hostLane,
          sessions: sum(hrows, "sessions"),
          messages: sum(hrows, "messages"),
          ...mark(hostLane),
          children: hrows
            .slice()
            .sort((a, b) => b.sessions - a.sessions)
            .map((r) => {
              const lane: ScopeLane = { origin, host, source: r.source };
              return {
                key: laneKey(lane),
                label: r.source,
                lane,
                sessions: r.sessions,
                messages: r.messages,
                ...mark(lane),
              };
            }),
        };
        originNode.children!.push(hostNode);
      }
    } else {
      // Web → platform (source), flat. Aggregate across machines so one platform
      // is ONE node (a bundle merged from another PC stamps its own host, but the
      // lane we exclude is per-platform, not per-machine).
      const bySource = new Map<string, { sessions: number; messages: number }>();
      for (const r of orows) {
        const acc = bySource.get(r.source) ?? { sessions: 0, messages: 0 };
        acc.sessions += r.sessions;
        acc.messages += r.messages;
        bySource.set(r.source, acc);
      }
      for (const [source, acc] of [...bySource.entries()].sort((a, b) => b[1].sessions - a[1].sessions)) {
        const lane: ScopeLane = { origin, source };
        originNode.children!.push({
          key: laneKey(lane),
          label: source,
          lane,
          sessions: acc.sessions,
          messages: acc.messages,
          ...mark(lane),
        });
      }
    }
    out.push(originNode);
  }
  return out;
}

function sum(rows: LaneRow[], k: "sessions" | "messages"): number {
  return rows.reduce((n, r) => n + Number(r[k] || 0), 0);
}

/** Toggle a lane in the exclude list; returns the new list. Pure — caller persists. */
export function toggleLane(lanes: ScopeLane[], lane: ScopeLane, exclude: boolean): ScopeLane[] {
  const key = laneKey(lane);
  const without = lanes.filter((l) => laneKey(l) !== key);
  return exclude ? [...without, lane] : without;
}
