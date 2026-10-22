// The fitness of a graph does not depend on the order its files were walked in. A Docker mount lists a folder in a
// different order than NTFS does, and the parity checker (plan/30 §3e) read the first five isolated files as a path diff.
import assert from "node:assert/strict";
import test from "node:test";

const { graphFitness } = await import("../../dist/memory/graph/graph.js");

const node = (id, fanIn, fanOut) => ({ id, fanIn, fanOut });
function graph(order) {
  const nodes = [
    node("src/a.ts", 0, 0), node("src/b.ts", 0, 0), node("src/c.ts", 0, 0), node("src/d.ts", 0, 0),
    node("src/e.ts", 0, 0), node("src/f.ts", 0, 0), node("src/g.ts", 0, 0),
    node("src/hub1.ts", 9, 0), node("src/hub2.ts", 9, 0), node("src/util.ts", 0, 2), node("src/x.ts", 0, 1),
  ];
  const edges = [
    { from: "src/util.ts", to: "src/x.ts" }, { from: "src/util.ts", to: "src/hub1.ts" }, { from: "src/x.ts", to: "src/hub2.ts" },
  ];
  return { nodes: order(nodes), edges: order(edges) };
}

test("graphFitness gives the same answer whatever order the walk produced", () => {
  const forward = graphFitness(graph((a) => a));
  const reversed = graphFitness(graph((a) => [...a].reverse()));
  assert.deepEqual(reversed, forward);
  assert.match(forward.metrics.find((m) => m.metric === "isolated_pct").detail, /src\/a\.ts, src\/b\.ts, src\/c\.ts, src\/d\.ts, src\/e\.ts, …/);
});
