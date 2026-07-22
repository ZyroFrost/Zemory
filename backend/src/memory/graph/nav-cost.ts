// Navigation cost — what zemory's structure actually BUYS, in tokens.
//
// zemory's core claim (HP điều 1 + 03_STRUCTURE §1) is that a harness index +
// folder tree + code graph + global memory let an agent go STRAIGHT to the right
// place instead of sweeping the whole project. This module MEASURES that claim.
//
// HONESTY CONTRACT (HP điều 12). We do NOT emit a "you saved N tokens" figure —
// that is a counterfactual (nobody knows what an agent WOULD have read). What we
// emit is a comparison of TWO CONCRETE, COMPUTED READING STRATEGIES over the same
// repo, both sides measured from real bytes on disk / real rows in the memory:
//   • sweep  — read everything you'd have to read to answer the question blind
//   • routed — read only what the index / graph / memory hands back
// Every number below is a sum of real file sizes or real message lengths. The one
// modelling assumption ("blind = read it all") is stated in the label, not hidden.
//
// Deterministic, 0 LLM (HP điều 6). Fail-open (HP điều 9): a missing docs file or
// an unreadable memory degrades that one lane to `available: false`, never throws.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type CodeGraph, buildCodeGraph } from "./graph.js";
import { DEFAULT_SEARCH_LIMIT, SNIPPET_MAX_CHARS } from "../search.js";
import { currentMemoryDb, openMemory } from "../db.js";

/** Chars→tokens, the same ÷4 estimate used everywhere else in the cockpit. */
const tok = (chars: number): number => Math.round(chars / 4);

/** One question, priced both ways. */
export interface NavLane {
  /** Reading everything needed to answer it without an index. */
  sweepTokens: number;
  /** Reading only what zemory hands back. */
  routedTokens: number;
  /** sweep / routed — how many times leaner the routed path is (0 if N/A). */
  ratio: number;
  /** False when this lane can't be measured here (missing docs / empty memory). */
  available: boolean;
  /** Short, human-readable note about what was actually counted. */
  detail: string;
}

export interface NavCost {
  root: string;
  /** "where do I change X?" — index routing vs reading the source tree. */
  locate: NavLane;
  /** "what does changing this file hit?" — graph fan-in vs reading every file. */
  impact: NavLane;
  /** "what happened in earlier sessions?" — memory recall vs re-reading them. */
  recall: NavLane;
  /** Raw inputs, so the UI can show what the numbers were built from. */
  basis: { files: number; sourceTokens: number; sessions: number };
}

const NA: NavLane = { sweepTokens: 0, routedTokens: 0, ratio: 0, available: false, detail: "" };

function lane(sweep: number, routed: number, detail: string): NavLane {
  if (sweep <= 0 || routed <= 0) return { ...NA, detail };
  return {
    sweepTokens: sweep,
    routedTokens: routed,
    ratio: Math.round((sweep / routed) * 10) / 10,
    available: true,
    detail,
  };
}

/**
 * Size of the routing table — 03_STRUCTURE §4 ("what am I changing → which
 * slot"), the exact text an agent reads to route without grepping. Falls back to
 * the whole file when the section markers aren't found, and to 0 when the harness
 * doc is absent (project not wired yet).
 */
export function routingTableChars(root: string): number {
  const file = join(root, "docs", "agent", "03_STRUCTURE.md");
  if (!existsSync(file)) return 0;
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return 0;
  }
  const start = text.indexOf("\n## 4.");
  if (start < 0) return text.length; // no §4 marker → the agent reads the doc
  const end = text.indexOf("\n## 5.", start + 1);
  return (end < 0 ? text.slice(start) : text.slice(start, end)).length;
}

/**
 * Prior captured context for THIS project: total message chars + session count.
 * Same project-root normalization the recall path uses (search.ts).
 */
function priorContext(root: string, dbPath?: string): { chars: number; sessions: number } {
  try {
    const db = openMemory(dbPath ?? currentMemoryDb());
    try {
      const row = db
        .prepare(
          `SELECT COALESCE(SUM(LENGTH(m.content)), 0) AS chars, COUNT(DISTINCT s.id) AS sessions
             FROM messages m JOIN sessions s ON s.id = m.session_id
            WHERE lower(replace(s.project_root, '\\', '/')) = lower(replace(?, '\\', '/'))`,
        )
        .get(root) as { chars: number; sessions: number } | undefined;
      return { chars: Number(row?.chars ?? 0), sessions: Number(row?.sessions ?? 0) };
    } finally {
      db.close();
    }
  } catch {
    return { chars: 0, sessions: 0 }; // memory optional — fail open (HP điều 9)
  }
}

/**
 * Price the three navigation questions for a project.
 *
 * `graph` may be passed in when the caller already built it (the cockpit does),
 * so the Graph sub-tab doesn't walk the tree twice.
 */
export function buildNavCost(root: string, opts: { graph?: CodeGraph; dbPath?: string } = {}): NavCost {
  const graph = opts.graph ?? buildCodeGraph(root);
  const sourceTokens = tok(graph.stats.bytes);

  // ── "where do I change X?" ────────────────────────────────────────────────
  // Blind: you read the source to find where the concern lives. Routed: you read
  // the routing table, which names the slot directly. Both then open the SAME
  // target file, so that shared cost cancels and is excluded from both sides.
  const routingChars = routingTableChars(root);
  const locate = lane(
    sourceTokens,
    tok(routingChars),
    "sweep = every source file · routed = 03_STRUCTURE §4 routing table",
  );

  // ── "what does changing this file hit?" ───────────────────────────────────
  // Blind: imports live inside files, so finding every importer means opening
  // every file. Routed: the graph already holds the answer — the fan-in list.
  let impact = { ...NA, detail: "no import edges yet" } as NavLane;
  if (graph.nodes.length) {
    const hottest = graph.nodes.reduce((a, b) => (b.fanIn > a.fanIn ? b : a));
    // The answer an agent actually receives: the importer paths for that file.
    const importers = graph.edges.filter((e) => e.to === hottest.id).map((e) => e.from);
    const answerChars = importers.reduce((n, id) => n + id.length + 1, hottest.id.length);
    impact = lane(
      sourceTokens,
      tok(answerChars),
      `sweep = open every file to read its imports · routed = graph fan-in for ${hottest.label} (${hottest.fanIn})`,
    );
  }

  // ── "what happened in earlier sessions?" ──────────────────────────────────
  // Blind: re-read this project's prior transcripts. Routed: one recall returns
  // capped snippets (full messages open on demand — progressive disclosure).
  const prior = priorContext(root, opts.dbPath);
  const recall = lane(
    tok(prior.chars),
    tok(DEFAULT_SEARCH_LIMIT * SNIPPET_MAX_CHARS),
    `sweep = re-read ${prior.sessions} prior session(s) · routed = one recall (${DEFAULT_SEARCH_LIMIT} snippets)`,
  );

  return {
    root,
    locate,
    impact,
    recall,
    basis: { files: graph.stats.files, sourceTokens, sessions: prior.sessions },
  };
}
