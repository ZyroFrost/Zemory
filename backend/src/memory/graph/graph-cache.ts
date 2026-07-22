// Per-project code-graph cache for the daemon (plan 13/14). Building the graph
// re-reads + parses every source file, and enrichment runs tree-sitter over them;
// the cockpit hit that TWICE per graph-tab open (/code-graph AND /nav-cost) and
// again on every poll. Cache the enriched graph + fitness per project root, keyed
// by a cheap source signature (file count + newest mtime) so a rebuild happens
// only when a file actually changed. Daemon-scoped in-memory (a CLI process is
// short-lived and gains nothing from caching, so it keeps calling buildCodeGraph).

import { buildCodeGraph, graphFitness, sourceSignature, type CodeGraph, type GraphFitness } from "./graph.js";
import { enrichGraphSymbols } from "./graph-symbols.js";

interface Entry {
  sig: string;
  graph: CodeGraph;
  fitness: GraphFitness;
}

const cache = new Map<string, Entry>();

/**
 * Get the enriched code graph + fitness for a project, reusing the cached build
 * when the source hasn't changed. Enrichment (tree-sitter) is fail-open inside
 * enrichGraphSymbols, so this never throws for that reason.
 */
export async function getCodeGraph(root: string): Promise<{ graph: CodeGraph; fitness: GraphFitness }> {
  let sig: string;
  try {
    sig = sourceSignature(root);
  } catch {
    sig = ""; // signature failed → always rebuild (never serve a stale graph)
  }
  const hit = cache.get(root);
  if (hit && sig && hit.sig === sig) return { graph: hit.graph, fitness: hit.fitness };
  const graph = buildCodeGraph(root);
  await enrichGraphSymbols(graph);
  const fitness = graphFitness(graph);
  cache.set(root, { sig, graph, fitness });
  return { graph, fitness };
}

/** Drop cached graphs (tests / explicit rebuild). */
export function clearCodeGraphCache(): void {
  cache.clear();
}
