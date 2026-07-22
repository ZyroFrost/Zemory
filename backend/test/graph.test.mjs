// Code graph builder — the derived import graph behind the project Graph sub-tab.
// Deterministic, 0 LLM: nodes = source files, edges = intra-project imports.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { HUB_FANIN, buildCodeGraph, fileImpact, graphFitness } from "../../dist/memory/graph/graph.js";
import { enrichGraphSymbols, resolveCalls } from "../../dist/memory/graph/graph-symbols.js";
import { tempDir } from "./helpers.mjs";

/** A tiny project: a → b → c, plus an orphan and an external import (ignored). */
function scaffold(t) {
  const root = tempDir(t, "zemory-graph-");
  mkdirSync(join(root, "backend", "src", "core"), { recursive: true });
  writeFileSync(join(root, "backend", "src", "a.ts"), `import { b } from "./b.js";\nimport fs from "node:fs";\nexport function a(){ return b(); }\n`);
  writeFileSync(join(root, "backend", "src", "b.ts"), `import { c } from "./core/c.js";\nexport const b = () => c();\n`);
  writeFileSync(join(root, "backend", "src", "core", "c.ts"), `export class C {}\n`);
  writeFileSync(join(root, "backend", "src", "lonely.ts"), `const x = 1;\n`);
  return root;
}

test("nodes = source files, edges = resolved intra-project imports", (t) => {
  const root = scaffold(t);
  const g = buildCodeGraph(root);
  assert.equal(g.stats.files, 4, "four source files");
  // a→b, b→c ; the node:fs import is external and must NOT be an edge.
  const has = (from, to) => g.edges.some((e) => e.from === from && e.to === to);
  assert.ok(has("backend/src/a.ts", "backend/src/b.ts"), "a imports b");
  assert.ok(has("backend/src/b.ts", "backend/src/core/c.ts"), "b imports c (resolves ./core/c.js → c.ts)");
  assert.equal(g.edges.length, 2, "exactly two intra-project edges (external import excluded)");
});

test("fan-in / fan-out are counted, and top-level symbols are extracted", (t) => {
  const root = scaffold(t);
  const g = buildCodeGraph(root);
  const c = g.nodes.find((n) => n.id === "backend/src/core/c.ts");
  assert.equal(c.fanIn, 1, "c is imported once");
  assert.equal(c.fanOut, 0, "c imports nothing");
  assert.ok(c.symbols.includes("C"), "class C is a top-level symbol");
  const a = g.nodes.find((n) => n.id === "backend/src/a.ts");
  assert.ok(a.symbols.includes("a"), "function a is a symbol");
});

test("orphans = files with no imports in or out", (t) => {
  const root = scaffold(t);
  const g = buildCodeGraph(root);
  assert.deepEqual(g.orphans, ["backend/src/lonely.ts"], "only the lonely file is an orphan");
});

test("each node carries the standard slot of its folder", (t) => {
  const root = scaffold(t);
  const g = buildCodeGraph(root);
  const c = g.nodes.find((n) => n.id === "backend/src/core/c.ts");
  assert.equal(c.slot, "core", "core/ maps to the 'core' slot");
});

test("Python projects graph too: dotted imports resolve, def/class are symbols", (t) => {
  const root = tempDir(t, "zemory-pygraph-");
  mkdirSync(join(root, "backend", "app", "services"), { recursive: true });
  writeFileSync(join(root, "backend", "app", "main.py"), `from app.services.orders import handle\nimport os\n\ndef main():\n    return handle()\n`);
  writeFileSync(join(root, "backend", "app", "services", "orders.py"), `class Order:\n    pass\n\ndef handle():\n    return Order()\n`);
  writeFileSync(join(root, "backend", "app", "services", "__init__.py"), ``);
  const g = buildCodeGraph(root);
  const has = (from, to) => g.edges.some((e) => e.from === from && e.to === to);
  assert.ok(
    has("backend/app/main.py", "backend/app/services/orders.py"),
    "main imports services.orders (suffix-resolved across the package root)",
  );
  assert.equal(g.edges.filter((e) => e.from === "backend/app/main.py").length, 1, "the `import os` stdlib import is not an edge");
  const orders = g.nodes.find((n) => n.id === "backend/app/services/orders.py");
  assert.ok(orders.symbols.includes("Order") && orders.symbols.includes("handle"), "class + def are symbols");
});

test("a missing root fails open to an empty graph", () => {
  const g = buildCodeGraph(join(tempDir({ after: () => {} }, "zemory-nope-"), "does-not-exist"));
  assert.equal(g.stats.files, 0);
  assert.deepEqual(g.nodes, []);
});

// ── Phase A (plan 13 §9): impact + fitness ──────────────────────────────────

test("fileImpact resolves fuzzy paths and reports direct + transitive importers", (t) => {
  const root = scaffold(t);
  const g = buildCodeGraph(root);
  // Bare name resolves; c is imported by b directly, and a reaches it via b.
  const r = fileImpact(g, "c.ts");
  assert.equal(r.file, "backend/src/core/c.ts", "bare basename resolves to the one match");
  assert.deepEqual(r.importers, ["backend/src/b.ts"], "direct importer");
  assert.deepEqual(r.transitiveImporters, ["backend/src/a.ts"], "a reaches c through b");
  assert.equal(r.isHub, false, "fan-in 1 is not a hub");
  // Windows-style input also resolves.
  assert.equal(fileImpact(g, "backend\\src\\b.ts").file, "backend/src/b.ts");
  // Unknown files return null, never throw.
  assert.equal(fileImpact(g, "ghost.ts").file, null);
});

test("fileImpact reports ambiguity as candidates instead of guessing", (t) => {
  const root = scaffold(t);
  writeFileSync(join(root, "backend", "src", "core", "b.ts"), "export const b2 = 1;\n");
  const g = buildCodeGraph(root);
  const r = fileImpact(g, "b.ts");
  assert.equal(r.file, null, "ambiguous query must not pick silently");
  assert.equal(r.candidates.length, 2, "both b.ts files offered");
});

test("graphFitness: healthy fixture passes every gate", (t) => {
  const root = scaffold(t);
  const f = graphFitness(buildCodeGraph(root));
  assert.equal(f.passed, true);
  for (const m of f.metrics) assert.equal(m.passed, true, m.metric + " should pass on the tiny fixture");
  assert.deepEqual(f.hubs, [], "no file reaches hub fan-in");
});

test("graphFitness flags a hub once fan-in crosses the threshold", (t) => {
  const root = tempDir(t, "zemory-graph-hub-");
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "hub.ts"), "export const hub = 1;\n");
  for (let i = 0; i < HUB_FANIN; i++) {
    writeFileSync(join(root, "src", `user${i}.ts`), 'import { hub } from "./hub.js";\nexport const u = hub;\n');
  }
  const f = graphFitness(buildCodeGraph(root));
  assert.equal(f.hubs.length, 1, "hub.ts is a hub");
  assert.equal(f.hubs[0].id, "src/hub.ts");
  assert.equal(f.hubs[0].fanIn, HUB_FANIN);
});

// ── Phase B (plan 13 §9): tree-sitter symbol enrichment ─────────────────────

test("enrichGraphSymbols upgrades TS symbols to AST accuracy (kind + line)", async (t) => {
  const root = tempDir(t, "zemory-graph-ast-");
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "src", "shop.ts"),
    [
      'import { helper } from "./helper.js";', // L1
      "export class Cart {",                    // L2 class
      "  total(): number { return 1; }",        // L3 method
      "}",
      "export function checkout(): void {}",    // L5 function
      "export const pay = () => helper();",     // L6 arrow const
      "function hidden(){ const inner = () => 1; return inner; }", // L7 — inner must NOT appear
      "",
    ].join("\n"),
  );
  writeFileSync(join(root, "src", "helper.ts"), "export const helper = () => 2;\n");
  const g = buildCodeGraph(root);
  const n = await enrichGraphSymbols(g);
  // HARD assert — no silent skip. The runtime/grammar pair is pinned (0.20.8);
  // if this fails the pair broke, which is exactly what must show up red.
  assert.ok(n >= 1, "tree-sitter must enrich (pinned web-tree-sitter@0.20.8 + tree-sitter-wasms)");
  const shop = g.nodes.find((x) => x.id === "src/shop.ts");
  const by = Object.fromEntries(shop.symbolsDetail.map((s) => [s.name, s]));
  assert.deepEqual({ kind: by.Cart.kind, line: by.Cart.line }, { kind: "class", line: 2 });
  assert.deepEqual({ kind: by["Cart.total"].kind, line: by["Cart.total"].line }, { kind: "method", line: 3 });
  assert.deepEqual({ kind: by.checkout.kind, line: by.checkout.line }, { kind: "function", line: 5 });
  assert.deepEqual({ kind: by.pay.kind, line: by.pay.line }, { kind: "function", line: 6 });
  assert.ok(by.hidden, "top-level hidden fn is a symbol");
  assert.ok(!by.inner, "nested helpers inside a function body are noise — excluded");
  assert.ok(shop.symbols.includes("Cart.total"), "names list follows the AST detail");
});

test("enrichGraphSymbols handles Python defs, methods, and decorated defs", async (t) => {
  const root = tempDir(t, "zemory-graph-astpy-");
  mkdirSync(join(root, "app"), { recursive: true });
  writeFileSync(
    join(root, "app", "orders.py"),
    ["class Order:",                       // L1 class
     "    def total(self):",               // L2 method
     "        return 1",
     "",
     "def handle():",                      // L5 function
     "    def inner():",                   // nested — excluded
     "        pass",
     "    return inner",
     ""].join("\n"),
  );
  const g = buildCodeGraph(root);
  const n = await enrichGraphSymbols(g);
  assert.ok(n >= 1, "python grammar must load and enrich");
  const f = g.nodes.find((x) => x.id === "app/orders.py");
  const names = f.symbolsDetail.map((s) => s.name);
  assert.deepEqual(names.sort(), ["Order", "Order.total", "handle"], "class + method + top-level def, no nested");
  const m = f.symbolsDetail.find((s) => s.name === "Order.total");
  assert.deepEqual({ kind: m.kind, line: m.line }, { kind: "method", line: 2 });
});

test("enrichGraphSymbols fails open: unparsable file keeps its regex symbols", async (t) => {
  const root = tempDir(t, "zemory-graph-astfail-");
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "ok.ts"), "export function fine(){}\n");
  const g = buildCodeGraph(root);
  const before = [...g.nodes.find((x) => x.id === "src/ok.ts").symbols];
  // Simulate the file vanishing between build and enrich (read error path).
  const ghost = { ...g, root: join(root, "gone") };
  const n = await enrichGraphSymbols(ghost);
  assert.equal(n, 0, "nothing enriched when files cannot be read");
  assert.deepEqual(ghost.nodes.find((x) => x.id === "src/ok.ts").symbols, before, "regex symbols untouched");
});

// ── Phase C (plan 13 §9): name-match call edges + confidence ────────────────

async function callFixture(t, files) {
  const root = tempDir(t, "zemory-graph-calls-");
  mkdirSync(join(root, "src"), { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(join(root, "src", name), body);
  const g = buildCodeGraph(root);
  const n = await enrichGraphSymbols(g);
  assert.ok(n >= 1, "AST layer must be live for call-edge tests");
  return { g, edges: resolveCalls(g) };
}

test("bare call to a uniquely-defined function → one 'inferred' edge with the enclosing fn", async (t) => {
  const { edges } = await callFixture(t, {
    "a.ts": 'import { beta } from "./b.js";\nexport function alpha(){ return beta(); }\n',
    "b.ts": "export function beta(){ return 1; }\n",
  });
  assert.deepEqual(
    edges.map((e) => ({ from: e.fromFile, fn: e.fromSymbol, to: e.toSymbol, conf: e.confidence })),
    [{ from: "src/a.ts", fn: "alpha", to: "beta", conf: "inferred" }],
  );
});

test("member call x.foo() matches ONLY methods; new Class() reaches the class", async (t) => {
  const { edges } = await callFixture(t, {
    "svc.ts": "export class Svc {\n  work(){ return 1; }\n}\nexport function log(){}\n",
    "use.ts": 'import { Svc } from "./svc.js";\nexport function go(){ const s = new Svc(); console.log(s); return s.work(); }\n',
  });
  const pairs = edges.map((e) => `${e.fromSymbol}->${e.toSymbol}`).sort();
  assert.deepEqual(pairs, ["go->Svc", "go->Svc.work"], "s.work() → method; new Svc() → class");
  // console.log must NOT edge to the project's plain function log() — member
  // calls never match bare functions (that receiver is a guess).
  assert.ok(!edges.some((e) => e.toSymbol === "log"), "member .log() does not hit the bare log()");
});

test("an ambiguous name yields 'textual' edges to each candidate; >4 defs are skipped", async (t) => {
  const files = {
    "x1.ts": "export function dup(){}\n",
    "x2.ts": "export function dup(){}\n",
    "caller.ts": 'export function c(){ dup(); noisy(); }\n',
  };
  for (let i = 0; i < 5; i++) files[`n${i}.ts`] = "export function noisy(){}\n";
  const { edges } = await callFixture(t, files);
  const dup = edges.filter((e) => e.toSymbol === "dup");
  assert.equal(dup.length, 2, "one edge per candidate definition");
  assert.ok(dup.every((e) => e.confidence === "textual"), "ambiguous match is honestly 'textual'");
  assert.ok(!edges.some((e) => e.toSymbol === "noisy"), "a name defined 5× carries no signal — skipped");
});

test("repeated calls merge into one edge with a count; recursion is dropped", async (t) => {
  const { edges } = await callFixture(t, {
    "a.ts": 'import { beta } from "./b.js";\nexport function alpha(){ beta(); beta(); return alpha; }\nexport function loop(){ return loop(); }\n',
    "b.ts": "export function beta(){}\n",
  });
  const ab = edges.find((e) => e.fromSymbol === "alpha" && e.toSymbol === "beta");
  assert.equal(ab.count, 2, "two call sites, one merged edge");
  assert.ok(!edges.some((e) => e.fromSymbol === "loop" && e.toSymbol === "loop"), "self-recursion is noise");
});

test("Python attribute calls resolve to methods with enclosing defs", async (t) => {
  const { edges } = await callFixture(t, {
    "orders.py": "class Order:\n    def total(self):\n        return 1\n\ndef handle(o):\n    return o.total()\n",
  });
  const e = edges.find((x) => x.toSymbol === "Order.total");
  assert.ok(e, "o.total() reaches the method");
  assert.deepEqual({ from: e.fromSymbol, conf: e.confidence }, { from: "handle", conf: "inferred" });
});

test("REGRESSION (CALM's measured bug): call-looking text inside a template literal makes no edge", async (t) => {
  const { edges } = await callFixture(t, {
    "schema.ts": 'export function build(){ return `SELECT count(*) FROM x; INSERT INTO y VALUES (run(1)); -- helper() call in SQL`; }\n',
    "real.ts": "export function helper(){}\nexport function run(n){ return n; }\n",
  });
  assert.deepEqual(edges, [], "string content must never fabricate call edges");
});

test("graphFitness: a util file importing logic is a slot-boundary violation", (t) => {
  const root = tempDir(t, "zemory-graph-util-");
  mkdirSync(join(root, "src", "util"), { recursive: true });
  mkdirSync(join(root, "src", "services"), { recursive: true });
  writeFileSync(join(root, "src", "services", "logic.ts"), "export const run = () => 1;\n");
  writeFileSync(join(root, "src", "util", "helper.ts"), 'import { run } from "../services/logic.js";\nexport const h = run;\n');
  const f = graphFitness(buildCodeGraph(root));
  const m = f.metrics.find((x) => x.metric === "util_violations");
  assert.equal(m.passed, false, "util reaching into services must fail the gate");
  assert.deepEqual(f.utilViolations, [{ from: "src/util/helper.ts", to: "src/services/logic.ts" }]);
  assert.equal(f.passed, false, "one failing metric fails the whole gate");
});
