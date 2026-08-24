// Memory promotion (#12, Phase 2 — user approved 2026-08-24): find user corrections
// and decisions that REPEAT across sessions in the episodic store, and PROPOSE
// promoting them to a durable rule. Proposal only — zemory never writes a rule
// itself (điều 3: no auto-summary source; the user says yes, the agent edits docs).
//
// 0-LLM by construction (điều 6): the pipeline is marker-regex → vectors ALREADY
// in the index (cosine measures meaning, generates nothing) → deterministic greedy
// clustering (id-ordered, so the same store always yields the same clusters).
//
// Why "repeats across ≥2 SESSIONS", not just "repeats": the same complaint said
// three times inside one conversation is one incident, not a pattern. A correction
// the user had to re-state in a different session is exactly the thing that should
// have been a rule already — that is the promotion signal.
//
// The curated lane (#13, source `claude-code-memory`) closes the loop: a cluster
// whose meaning already matches a distilled memory fact is marked COVERED, so the
// report surfaces only the gap — corrections repeated in transcripts that nobody
// ever wrote down.

import { openMemory, currentMemoryDb } from "./db.js";
import { vectorsByRowid } from "./vectors.js";

/** Correction/decision markers (VN + EN). Deliberately conservative: this is a
 *  RECALL filter for candidates, precision comes from the repeat+cluster stages. */
export const CORRECTION_RE =
  /(đừng|dung co|không được|khong duoc|cấm|tuyệt đối không|từ nay|tu nay|lần sau|lan sau|nhớ là|nho la|phải luôn|luôn luôn|user chốt|chốt:|sai rồi|sai roi|làm lại|đã bảo|da bao|do not|don't|never (do|use|write|push|delete)|always (ask|use|run|check)|stop (doing|using)|from now on|remember to)/i;

/** Tool dumps captured under role=user — never a human voice (search.ts doctrine). */
const TOOL_RESULT_PREFIX = /^\s*\[tool_result\]/;

/** Host-injected boilerplate stored under role=user — measured live 2026-08-24:
 *  `<local-command-caveat>` (252×), `<ide_opened_file>`, `<INSTRUCTIONS>` and pasted
 *  "# AGENTS.md instructions" blocks all carry "DO NOT…" phrasings and cluster hard.
 *  A human correction never opens with an angle-bracket tag. */
const HOST_INJECTED_PREFIX = /^\s*(<[a-z_-]+[ >]|# AGENTS\.md instructions)/i;

export interface PromoteMsg {
  id: number;
  content: string;
  sessionId: string;
  project: string | null;
  ts: string | null;
}

export interface PromotionCandidate {
  /** The message closest to the cluster centroid — the most typical phrasing. */
  representative: PromoteMsg;
  count: number;
  sessions: number;
  projects: string[];
  /** Anchor message ids — drill down with `memory show <id>` to verify (điều 8). */
  anchors: number[];
  lastSeen: string | null;
  /** Best-matching curated memory fact (≥ coveredSim) — already written down. */
  covered: { title: string; sim: number } | null;
}

export interface PromotionReport {
  scanned: number;
  withVector: number;
  clusters: number;
  candidates: PromotionCandidate[];
  /** Every measurement that could not run — said out loud, not folded into "clean". */
  notes: string[];
}

export interface PromoteOptions {
  dbPath?: string;
  /** Cluster admission: cosine to centroid. */
  clusterSim?: number;
  /** "Already curated" threshold vs the claude-code-memory lane. */
  coveredSim?: number;
  /** Minimum messages in a cluster. */
  minRepeat?: number;
  /** Minimum DISTINCT sessions in a cluster. */
  minSessions?: number;
  limit?: number;
}

const DEFAULTS = { clusterSim: 0.8, coveredSim: 0.8, minRepeat: 3, minSessions: 2, limit: 20 };

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function normalize(v: Float64Array): Float32Array {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const inv = s > 0 ? 1 / Math.sqrt(s) : 0;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] * inv;
  return out;
}

export interface Cluster<T> {
  members: T[];
  centroid: Float32Array;
}

/**
 * Deterministic greedy clustering: items in the given order, each joins the
 * best-matching existing centroid ≥ sim, else opens a cluster. Centroid is the
 * normalized running mean. Same input order → same clusters, every run.
 */
export function clusterByCosine<T>(
  items: { key: T; vec: Float32Array }[],
  sim: number,
): Cluster<T>[] {
  const clusters: { members: T[]; sum: Float64Array; centroid: Float32Array }[] = [];
  for (const it of items) {
    let best = -1;
    let bestSim = sim;
    for (let c = 0; c < clusters.length; c++) {
      const s = dot(clusters[c].centroid, it.vec);
      if (s >= bestSim) {
        bestSim = s;
        best = c;
      }
    }
    if (best >= 0) {
      const cl = clusters[best];
      cl.members.push(it.key);
      for (let i = 0; i < it.vec.length && i < cl.sum.length; i++) cl.sum[i] += it.vec[i];
      cl.centroid = normalize(cl.sum);
    } else {
      const sum = new Float64Array(it.vec.length);
      for (let i = 0; i < it.vec.length; i++) sum[i] = it.vec[i];
      clusters.push({ members: [it.key], sum, centroid: normalize(sum) });
    }
  }
  return clusters.map((c) => ({ members: c.members, centroid: c.centroid }));
}

/** Human-voice correction candidates from the episodic store (marker-filtered). */
export function correctionCandidates(dbPath: string = currentMemoryDb()): PromoteMsg[] {
  const db = openMemory(dbPath);
  try {
    // Length bounds: a correction is a sentence, not a pasted log. Curated lane is
    // excluded — those are already distilled; they serve as the COVERED reference.
    const rows = db
      .prepare(
        `SELECT m.id, m.content, m.session_id AS sessionId, s.project_root AS project, m.timestamp AS ts
         FROM messages m JOIN sessions s ON s.id = m.session_id
         WHERE m.role = 'user' AND m.tool_name IS NULL
           AND s.source != 'claude-code-memory'
           AND length(m.content) BETWEEN 15 AND 1500
         ORDER BY m.id`,
      )
      .all() as PromoteMsg[];
    return rows.filter(
      (r) => !TOOL_RESULT_PREFIX.test(r.content) && !HOST_INJECTED_PREFIX.test(r.content) && CORRECTION_RE.test(r.content),
    );
  } finally {
    db.close();
  }
}

/** Curated facts (#13 lane) with their vectors — the "already written down" reference. */
function curatedReference(dbPath: string): { rows: number; withVec: { title: string; vec: Float32Array }[] } {
  const db = openMemory(dbPath);
  let rows: { id: number; title: string | null }[];
  try {
    rows = db
      .prepare(
        `SELECT m.id, s.title
         FROM messages m JOIN sessions s ON s.id = m.session_id
         WHERE s.source = 'claude-code-memory'`,
      )
      .all() as { id: number; title: string | null }[];
  } finally {
    db.close();
  }
  const vecs = vectorsByRowid(rows.map((r) => r.id), dbPath);
  const withVec: { title: string; vec: Float32Array }[] = [];
  for (const r of rows) {
    const v = vecs.get(r.id);
    if (v) withVec.push({ title: r.title ?? `#${r.id}`, vec: v });
  }
  return { rows: rows.length, withVec };
}

export function promotionReport(opts: PromoteOptions = {}): PromotionReport {
  const dbPath = opts.dbPath ?? currentMemoryDb();
  const cfg = { ...DEFAULTS, ...opts };
  const notes: string[] = [];

  const cands = correctionCandidates(dbPath);
  const byId = new Map(cands.map((c) => [c.id, c]));

  let vecs: Map<number, Float32Array>;
  try {
    vecs = vectorsByRowid(cands.map((c) => c.id), dbPath);
  } catch (e) {
    // Fail-open (điều 9): no vector layer → no clustering. Say so instead of
    // pretending an empty report means "no repeated corrections".
    notes.push(`vector layer unavailable (${e instanceof Error ? e.message : "error"}) — cannot cluster; report is empty, NOT clean`);
    return { scanned: cands.length, withVector: 0, clusters: 0, candidates: [], notes };
  }
  const items = cands
    .filter((c) => vecs.has(c.id))
    .map((c) => ({ key: c.id, vec: vecs.get(c.id)! }));
  if (items.length < cands.length) {
    notes.push(`${cands.length - items.length}/${cands.length} candidates have no vector yet (run \`memory embed\`) — they are not represented`);
  }

  const clusters = clusterByCosine(items, cfg.clusterSim);
  let curated: { title: string; vec: Float32Array }[] = [];
  let curatedRows = 0;
  try {
    const cu = curatedReference(dbPath);
    curated = cu.withVec;
    curatedRows = cu.rows;
  } catch {
    notes.push("curated lane unreadable — coverage check skipped");
  }
  // "No facts" and "facts not embedded yet" are different truths — measured live
  // 2026-08-24: 153 curated facts freshly ingested, 0 embedded, and the first draft
  // of this note said "curated lane empty". A lying note next to an honest report
  // poisons the whole report.
  if (curatedRows === 0) notes.push("curated lane empty — coverage check has nothing to compare against");
  else if (curated.length === 0)
    notes.push(`curated lane has ${curatedRows} fact(s) but none embedded yet — coverage check blind until \`memory embed\` catches up`);

  const out = buildCandidates(clusters, byId, vecs, curated, cfg);
  return {
    scanned: cands.length,
    withVector: items.length,
    clusters: clusters.length,
    candidates: out.slice(0, cfg.limit),
    notes,
  };
}

/**
 * Cluster → ranked proposals. Pure (no DB) so the repeat/session thresholds are
 * testable with hand-built vectors instead of a live vector index.
 */
export function buildCandidates(
  clusters: Cluster<number>[],
  byId: Map<number, PromoteMsg>,
  vecs: Map<number, Float32Array>,
  curated: { title: string; vec: Float32Array }[],
  cfg: { coveredSim: number; minRepeat: number; minSessions: number },
): PromotionCandidate[] {
  const out: PromotionCandidate[] = [];
  for (const cl of clusters) {
    const members = cl.members.map((id) => byId.get(id)!).filter(Boolean);
    const sessions = new Set(members.map((m) => m.sessionId));
    if (members.length < cfg.minRepeat || sessions.size < cfg.minSessions) continue;

    // Representative = member closest to the centroid (most typical phrasing).
    let rep = members[0];
    let repSim = -Infinity;
    for (const m of members) {
      const v = vecs.get(m.id);
      if (!v) continue;
      const s = dot(cl.centroid, v);
      if (s > repSim) {
        repSim = s;
        rep = m;
      }
    }

    let covered: PromotionCandidate["covered"] = null;
    for (const cu of curated) {
      const s = dot(cl.centroid, cu.vec);
      if (s >= cfg.coveredSim && (!covered || s > covered.sim)) covered = { title: cu.title, sim: s };
    }

    out.push({
      representative: rep,
      count: members.length,
      sessions: sessions.size,
      projects: [...new Set(members.map((m) => m.project).filter((p): p is string => !!p))],
      anchors: members.map((m) => m.id),
      lastSeen: members.reduce<string | null>((a, m) => (m.ts && (!a || m.ts > a) ? m.ts : a), null),
      covered,
    });
  }
  out.sort((a, b) => b.sessions - a.sessions || b.count - a.count || (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""));
  return out;
}
