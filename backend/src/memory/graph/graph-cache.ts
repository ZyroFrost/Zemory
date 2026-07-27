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
  /** ISO time this graph was actually parsed — UI hiện ra để user biết đang xem
   *  bản build lúc nào (cache có thể sống lâu; xem số cũ mà tưởng mới là bẫy thật). */
  builtAt: string;
}

const cache = new Map<string, Entry>();

/**
 * Get the enriched code graph + fitness for a project, reusing the cached build
 * when the source hasn't changed. Enrichment (tree-sitter) is fail-open inside
 * enrichGraphSymbols, so this never throws for that reason.
 */
// THUẦN ĐỌC — cố ý không ghi gì. Bản đầu tôi gọi recordFitness() ngay trong đây, và
// nó ghi thẳng vào global_memory.db THẬT của user mỗi lần test dựng một repo tạm
// (đo: 10 hàng rác `zemory-gcache-*` sau một vòng gate). Một hàm ĐỌC graph không được
// phép mutate trạng thái toàn cục. Việc ghi nhật ký chuyển sang đúng nơi quan sát
// được "project này vừa đổi code": endpoint /code-graph của daemon. `sig` trả ra ngoài
// để nơi đó tự chống trùng.
export async function getCodeGraph(root: string): Promise<{ graph: CodeGraph; fitness: GraphFitness; builtAt: string; sig: string }> {
  let sig: string;
  try {
    sig = sourceSignature(root);
  } catch {
    sig = ""; // signature failed → always rebuild (never serve a stale graph)
  }
  const hit = cache.get(root);
  if (hit && sig && hit.sig === sig) return { graph: hit.graph, fitness: hit.fitness, builtAt: hit.builtAt, sig };
  const graph = buildCodeGraph(root);
  await enrichGraphSymbols(graph);
  const fitness = graphFitness(graph);
  const builtAt = new Date().toISOString();
  cache.set(root, { sig, graph, fitness, builtAt });
  return { graph, fitness, builtAt, sig };
}

/** Drop cached graphs (tests / explicit rebuild). */
export function clearCodeGraphCache(): void {
  cache.clear();
}
