// Semantic overlay — the INFERRED hazard class. The invariant locked here is
// HP điều 13: every semantic edge must be labeled kind:"inferred" and can never
// masquerade as declared. Model-dependent parts use the repo's standard
// skip-if-model-unavailable pattern (vectors.test.mjs); the model-free branch
// is hard-asserted.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { buildCodeGraph } from "../../dist/brain/graph/graph.js";
import { semanticEdges } from "../../dist/brain/graph/graph-semantic.js";
import { tempDir } from "./helpers.mjs";

test("fewer than two files → no overlay, hard-asserted (no model needed)", async () => {
  const edges = await semanticEdges({ root: "X:/nowhere", nodes: [], edges: [], orphans: [], stats: { files: 0, edges: 0, slots: 0, bytes: 0 } });
  assert.deepEqual(edges, [], "an empty graph must produce zero semantic edges");
});

test("every semantic edge is kind:'inferred' + type:'semantic_neighbor', undirected-deduped", async (t) => {
  const root = tempDir(t, "zemory-gsem-");
  mkdirSync(join(root, "src"), { recursive: true });
  // Two near-identical files (should be neighbours if the model runs) + one unrelated.
  writeFileSync(join(root, "src", "user_store.ts"), `// user storage helpers\nexport function saveUser(u){ return db.put('user', u); }\nexport function loadUser(id){ return db.get('user', id); }\n`);
  writeFileSync(join(root, "src", "user_cache.ts"), `// user cache helpers\nexport function cacheUser(u){ return mem.put('user', u); }\nexport function cachedUser(id){ return mem.get('user', id); }\n`);
  writeFileSync(join(root, "src", "totally_other.ts"), `export const PI = 3.14159;\n`);
  const g = buildCodeGraph(root);
  const edges = await semanticEdges(g);
  if (edges.length === 0) {
    console.log("  skipped (model unavailable — fail-open returned no overlay)");
    return;
  }
  for (const e of edges) {
    assert.equal(e.kind, "inferred", "semantic edges must NEVER claim the declared class (HP điều 13)");
    assert.equal(e.type, "semantic_neighbor");
    assert.ok(e.from < e.to, "undirected edges are stored low-id-first (deduped)");
    assert.ok(e.score >= 0.6 && e.score <= 1, "score must sit within the threshold..1 band");
  }
});
