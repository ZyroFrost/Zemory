import assert from "node:assert/strict";
import test from "node:test";
import { createRuntime } from "../../dist/core/runtime.js";

const context = (adapters) => ({
  projectRoot: "C:\\demo",
  docsDir: "C:\\demo\\docs\\agent",
  config: { docs: "docs/agent", adapters, thresholds: {} },
  log: () => {},
});

test("runtime resolves one configured provider per capability", () => {
  const runtime = createRuntime(context({ memory: "global", search: "keyword" }));
  assert.deepEqual(
    runtime.registry.all().map((provider) => `${provider.provides}:${provider.name}`),
    ["memory:global", "search:keyword", "harness:docs", "health:core"],
  );
});

test("runtime rejects an unknown configured provider", () => {
  assert.throws(
    () => createRuntime(context({ memory: "missing" })),
    /Unknown provider "missing" for memory/,
  );
});
