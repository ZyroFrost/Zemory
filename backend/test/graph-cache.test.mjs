// Daemon graph cache — serves the same build until the SOURCE actually changes.
// A wrong signature or compare silently serves a STALE graph (renders fine and
// lies), the same invisible-failure class the testing doctrine names.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { clearCodeGraphCache, getCodeGraph } from "../../dist/brain/graph/graph-cache.js";
import { sourceSignature } from "../../dist/brain/graph/graph.js";
import { tempDir } from "./helpers.mjs";

function scaffold(t) {
  const root = tempDir(t, "zemory-gcache-");
  mkdirSync(join(root, "backend", "src"), { recursive: true });
  writeFileSync(join(root, "backend", "src", "a.ts"), `import { b } from "./b.js";\nexport const a = () => b();\n`);
  writeFileSync(join(root, "backend", "src", "b.ts"), `export const b = () => 1;\n`);
  return root;
}

test("unchanged source → the IDENTICAL cached object; clearCodeGraphCache forces a rebuild", async (t) => {
  clearCodeGraphCache();
  const root = scaffold(t);
  const first = await getCodeGraph(root);
  const second = await getCodeGraph(root);
  assert.equal(second.graph, first.graph, "cache hit must return the same object, not a re-parse");
  clearCodeGraphCache();
  const third = await getCodeGraph(root);
  assert.notEqual(third.graph, first.graph, "clearing the cache must force a fresh build");
  assert.equal(third.graph.stats.files, first.graph.stats.files, "the rebuild sees the same source");
});

test("adding a source file changes the signature and the next call rebuilds with it", async (t) => {
  clearCodeGraphCache();
  const root = scaffold(t);
  const before = await getCodeGraph(root);
  const sigBefore = sourceSignature(root);
  writeFileSync(join(root, "backend", "src", "c.ts"), `export const c = 3;\n`);
  const sigAfter = sourceSignature(root);
  assert.notEqual(sigAfter, sigBefore, "file count is part of the signature");
  const after = await getCodeGraph(root);
  assert.notEqual(after.graph, before.graph, "changed signature must invalidate the cache");
  assert.equal(after.graph.stats.files, before.graph.stats.files + 1, "the new file is in the rebuilt graph");
});
