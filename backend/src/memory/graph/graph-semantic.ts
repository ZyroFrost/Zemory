// Semantic overlay for the code graph (plan 13 §4 — the INFERRED hazard class).
// For each source file, its nearest neighbours by embedding cosine become
// `semantic_neighbor` edges. Strictly labeled kind:"inferred" — it must NEVER
// masquerade as a declared import/call edge (HP điều 13, the invariant this whole
// two-class split exists to protect).
//
// OFF THE DAEMON THREAD BY CONSTRUCTION: this runs only inside the `graph export`
// CLI process (opt-in --semantic), never in a daemon request handler — embedding
// is ONNX and would freeze /ping (the bug fixed 2026-07-21). Fail-open (HP điều 9):
// no model → no vectors → zero semantic edges, the declared graph stands alone.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { embedBatch } from "../embed.js";
import type { CodeGraph } from "./graph.js";

export interface SemanticEdge {
  from: string;
  to: string;
  type: "semantic_neighbor";
  kind: "inferred";
  score: number;
}

const MAX_CHARS = 4000; // cap per file — enough to characterize, bounds embed cost
const TOP_K = 3; // neighbours per file — a cutoff, not a hairball
const THRESHOLD = 0.6; // min cosine to count as "related" (tune with data)

/** Compute semantic-neighbour edges over a code graph. Async + ONNX-bound — call
 *  only from a CLI process, not the daemon event loop. */
export async function semanticEdges(g: CodeGraph): Promise<SemanticEdge[]> {
  const files = g.nodes;
  if (files.length < 2) return [];
  const texts = files.map((n) => {
    try {
      return readFileSync(join(g.root, n.id), "utf8").slice(0, MAX_CHARS);
    } catch {
      return "";
    }
  });
  // Chunked: embedBatch does NOT batch internally — one call = one forward pass
  // over every text, and a large repo would balloon that (the "batch 16" lesson,
  // changelog 2026-07-11). 16 file-heads per pass keeps memory bounded.
  const vecs: (number[] | null)[] = [];
  try {
    for (let i = 0; i < texts.length; i += 16) {
      vecs.push(...(await embedBatch(texts.slice(i, i + 16))));
    }
  } catch {
    return []; // fail-open: embedding unavailable
  }
  // embed.ts returns unit-normalized vectors (plan 05), so dot product = cosine.
  const vv = vecs.map((v, i) => (texts[i] ? v : null));
  if (!vv.some((v) => v)) return []; // no model / everything failed → no overlay

  const seen = new Set<string>();
  const edges: SemanticEdge[] = [];
  for (let i = 0; i < files.length; i++) {
    const vi = vv[i];
    if (!vi) continue;
    const sims: { j: number; s: number }[] = [];
    for (let j = 0; j < files.length; j++) {
      if (i === j) continue;
      const vj = vv[j];
      if (!vj) continue;
      let dot = 0;
      const n = Math.min(vi.length, vj.length);
      for (let k = 0; k < n; k++) dot += vi[k] * vj[k];
      if (dot >= THRESHOLD) sims.push({ j, s: dot });
    }
    sims.sort((a, b) => b.s - a.s);
    for (const { j, s } of sims.slice(0, TOP_K)) {
      // Undirected: one edge per pair, low id first.
      const a = files[i].id;
      const b = files[j].id;
      const [from, to] = a < b ? [a, b] : [b, a];
      const key = `${from}|${to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from, to, type: "semantic_neighbor", kind: "inferred", score: Math.round(s * 1000) / 1000 });
    }
  }
  return edges;
}
