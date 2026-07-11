import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { ensureHarness, freshHarness } from "../../dist/adopt.js";
import { loadContext } from "../../dist/core/config.js";
import { validate } from "../../dist/validate.js";
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

test("validate enforces the APP standard by default (warns on missing backend/frontend)", (t) => {
  const root = tempDir(t, "zemory-profile-app-");
  ensureHarness(root);
  writeFileSync(join(root, "AGENTS.md"), "# app\n");
  const rep = validate(loadContext(root));
  const msgs = rep.issues.map((i) => i.msg).join("\n");
  assert.match(msgs, /own code not under/);
  assert.doesNotMatch(msgs, /non-app/i);
});

test("validate with profile non-app checks deliverables, never asks for backend/frontend", (t) => {
  const root = tempDir(t, "zemory-profile-nonapp-");
  ensureHarness(root);
  writeFileSync(join(root, "AGENTS.md"), "# powerbi project\n");
  const cfgPath = join(root, "docs", ".harness.json");
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  cfg.profile = "non-app";
  writeFileSync(cfgPath, JSON.stringify(cfg));

  // No deliverable yet → warn about that (and ONLY that kind of structure issue).
  let rep = validate(loadContext(root));
  let msgs = rep.issues.map((i) => i.msg).join("\n");
  assert.match(msgs, /no deliverable folder/);
  assert.doesNotMatch(msgs, /backend|frontend/);

  // With reports/ the non-app requirement is satisfied.
  mkdirSync(join(root, "reports"));
  rep = validate(loadContext(root));
  msgs = rep.issues.map((i) => i.msg).join("\n");
  assert.doesNotMatch(msgs, /no deliverable folder/);
  assert.match(msgs, /non-app §7.*reports\//);
});

test("validate hints at the non-app profile when there is no code but a deliverable exists", (t) => {
  const root = tempDir(t, "zemory-profile-hint-");
  ensureHarness(root);
  writeFileSync(join(root, "AGENTS.md"), "# bi\n");
  mkdirSync(join(root, "reports"));
  const rep = validate(loadContext(root));
  const msgs = rep.issues.map((i) => i.msg).join("\n");
  assert.match(msgs, /"profile": "non-app"/);
});
