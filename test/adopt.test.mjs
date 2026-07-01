import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { ensureHarness, freshHarness } from "../dist/adopt.js";
import { tempDir } from "./helpers.mjs";

test("ensureHarness honors a custom docs path inside docs", (t) => {
  const root = tempDir(t, "zemory-adopt-");
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(
    join(root, "docs", ".harness.json"),
    JSON.stringify({ docs: "docs/custom-agent", adapters: {}, thresholds: {} }),
  );

  ensureHarness(root);

  assert.equal(existsSync(join(root, "docs", "custom-agent", "01_RULES.md")), true);
  assert.equal(existsSync(join(root, "docs", "plan", "00_build_plan.md")), true);
});

test("freshHarness backs up both agent docs and plan", (t) => {
  const root = tempDir(t, "zemory-fresh-");
  ensureHarness(root);
  writeFileSync(join(root, "docs", "plan", "custom.md"), "# Keep me\n");

  const result = freshHarness(root);

  assert.ok(result.renamedTo);
  assert.ok(result.renamedPlanTo);
  assert.equal(existsSync(join(result.renamedPlanTo, "custom.md")), true);
  assert.equal(existsSync(join(root, "docs", "plan", "00_build_plan.md")), true);
});
