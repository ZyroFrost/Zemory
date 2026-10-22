// The disk half of the cockpit's /code-graph, run in a worker thread (jobs/fnworker) so the daemon keeps answering while
// a repo is read. Natively a build is a second; through a Docker mount of a Windows drive every file operation is a 9p
// round trip, and the same synchronous build held the daemon's event loop for minutes - /ping went dark and the cockpit
// would not load (measured 2026-10-22: the main thread sat in p9_client_rpc while a repo graph was built).
// Pure data in, pure data out (structured clone): the daemon keeps the cache and adds the store-side layers.

import { buildCodeGraph, graphFitness, sourceSignature, type CodeGraph, type GraphFitness } from "./graph.js";
import { enrichGraphSymbols, resolveCalls } from "./graph-symbols.js";
import { buildSeamEdges, type SeamEdge } from "./graph-seam.js";
import { buildStandardGraph } from "./graph-standard.js";

export interface CallEdgeAgg {
  from: string;
  to: string;
  count: number;
  confidence: string;
}

export interface CodeGraphParts {
  sig: string;
  /** the graph without its call sites (raw material for the CLI, never rendered) */
  graph: CodeGraph;
  fitness: GraphFitness;
  builtAt: string;
  calls: CallEdgeAgg[];
  seams: SeamEdge[];
  standard: ReturnType<typeof buildStandardGraph> | null;
}

/** `{ same: true }` when the source signature is still `knownSig` (the daemon's cached build stands); else a fresh build. */
export async function codeGraphDisk(root: string, knownSig: string | null): Promise<{ same: true; sig: string } | ({ same: false } & CodeGraphParts)> {
  let sig: string;
  try {
    sig = sourceSignature(root);
  } catch {
    sig = ""; // no signature: always rebuild (never serve a stale graph)
  }
  if (sig && knownSig && sig === knownSig) return { same: true, sig };
  const graph = buildCodeGraph(root);
  await enrichGraphSymbols(graph);
  const fitness = graphFitness(graph);
  const builtAt = new Date().toISOString();
  // calls: one edge per FILE pair (many call sites = one edge with a count), no self-call, none where an import edge exists
  const calls: CallEdgeAgg[] = [];
  let seams: SeamEdge[] = [];
  try {
    const seen = new Set(graph.edges.map((e) => `${e.from}\u0000${e.to}`));
    const agg = new Map<string, CallEdgeAgg>();
    for (const c of resolveCalls(graph)) {
      if (c.fromFile === c.toFile) continue;
      const key = `${c.fromFile}\u0000${c.toFile}`;
      if (seen.has(key)) continue;
      const cur = agg.get(key);
      if (cur) {
        cur.count += c.count;
        if (cur.confidence === "textual" && c.confidence === "inferred") cur.confidence = "inferred";
      } else agg.set(key, { from: c.fromFile, to: c.toFile, count: c.count, confidence: c.confidence });
    }
    calls.push(...agg.values());
    seams = buildSeamEdges(root, graph.nodes);
  } catch {
    /* fail-open (article 9): no tree-sitter still leaves the imports lane */
  }
  let standard: CodeGraphParts["standard"] = null;
  try {
    standard = buildStandardGraph(root, graph.nodes.map((n) => ({ id: n.id, slot: n.slot })));
  } catch {
    /* fail-open: the code graph stands without the standard's layer */
  }
  const lean: CodeGraph = { ...graph, nodes: graph.nodes.map(({ callSites: _cs, ...n }) => n as CodeGraph["nodes"][number]) };
  return { same: false, sig, graph: lean, fitness, builtAt, calls, seams, standard };
}
