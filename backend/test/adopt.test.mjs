import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { ensureHarness, freshHarness } from "../../dist/docs/adopt.js";
import { loadContext } from "../../dist/core/config.js";
import { validate } from "../../dist/docs/validate.js";
import { tempDir } from "./helpers.mjs";

test("ensureHarness honors a custom docs path inside docs", (t) => {
  const root = tempDir(t, "zemory-adopt-");
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(
    join(root, "docs", ".harness.json"),
    JSON.stringify({ docs: "docs/custom-agent", adapters: {}, thresholds: {} }),
  );

  ensureHarness(root);

  assert.equal(existsSync(join(root, "docs", "custom-agent", "02_RULES.md")), true);
  assert.equal(existsSync(join(root, "docs", "custom-agent", "01_CONSTITUTION.md")), true);
  assert.equal(existsSync(join(root, "docs", "plan", "00_overview.md")), true);
});

test("ensureHarness(root, 'non-app') scaffolds the NON-APP tree (its own 03 + profile in config)", (t) => {
  const root = tempDir(t, "zemory-nonapp-scaffold-");
  const r = ensureHarness(root, "non-app");
  // The whole standard set lands (this regressed once: profile "non-app" mapped to
  // a folder that did not exist, so ZERO docs were copied).
  assert.ok(r.added.includes("03_STRUCTURE.md"), "the standard docs are scaffolded, not silently skipped");
  const struct = readFileSync(join(root, "docs", "agent", "03_STRUCTURE.md"), "utf8");
  assert.match(struct, /hệ NON-APP/, "scaffolds the NON-APP structure standard, not the app one");
  assert.match(struct, /KÉO \/ ĐIỀN \/ UPLOAD/, "carries the non-app file-automation model");
  const skills = readFileSync(join(root, "docs", "agent", "04_SKILLS.md"), "utf8");
  assert.ok(skills.includes("## pull") && skills.includes("## fill") && skills.includes("## upload"));
  // The profile is persisted so validate/scaffold agree on later runs.
  const cfg = JSON.parse(readFileSync(join(root, "docs", ".harness.json"), "utf8"));
  assert.equal(cfg.profile, "non-app");
});

test("ensureHarness() with no profile scaffolds the APP tree (unchanged default)", (t) => {
  const root = tempDir(t, "zemory-app-scaffold-");
  ensureHarness(root);
  const struct = readFileSync(join(root, "docs", "agent", "03_STRUCTURE.md"), "utf8");
  assert.match(struct, /hệ APP/, "default scaffold is the app standard");
  // App stays the IMPLICIT default — no profile key written (validate's non-app hint depends on this).
  const cfg = JSON.parse(readFileSync(join(root, "docs", ".harness.json"), "utf8"));
  assert.equal(cfg.profile, undefined, "app profile is implicit — no profile key");
});

test("ensureHarness renames every older-generation doc to the current numbering (legacy chains)", (t) => {
  const root = tempDir(t, "zemory-legacy-");
  const agentDir = join(root, "docs", "agent");
  mkdirSync(agentDir, { recursive: true });
  // gen-2 folder (pre-constitution): 01_RULES/02_STRUCTURE/03_TODO/04_CHANGES
  writeFileSync(join(agentDir, "01_RULES.md"), "# old rules\n");
  writeFileSync(join(agentDir, "02_STRUCTURE.md"), "# old structure\n");
  writeFileSync(join(agentDir, "03_TODO.md"), "# old todo\n");
  writeFileSync(join(agentDir, "04_CHANGES.md"), "# old changes\n");

  ensureHarness(root);

  // Renamed in place (content preserved), then missing constitution + skills gap-fill.
  assert.equal(readFileSync(join(agentDir, "02_RULES.md"), "utf8"), "# old rules\n");
  assert.equal(readFileSync(join(agentDir, "03_STRUCTURE.md"), "utf8"), "# old structure\n");
  assert.equal(readFileSync(join(agentDir, "05_TODO.md"), "utf8"), "# old todo\n");
  assert.equal(readFileSync(join(agentDir, "06_CHANGES.md"), "utf8"), "# old changes\n");
  assert.equal(existsSync(join(agentDir, "01_CONSTITUTION.md")), true, "constitution gap-filled from template");
  assert.equal(existsSync(join(agentDir, "04_SKILLS.md")), true, "skills gap-filled from template");
  for (const gone of ["01_RULES.md", "02_STRUCTURE.md", "03_TODO.md", "04_CHANGES.md"]) {
    assert.equal(existsSync(join(agentDir, gone)), false, `${gone} no longer present under its old name`);
  }
});

test("ensureHarness renames a gen-3 folder (04_TODO/05_CHANGES) to the current numbering", (t) => {
  const root = tempDir(t, "zemory-gen3-");
  const agentDir = join(root, "docs", "agent");
  mkdirSync(agentDir, { recursive: true });
  // gen-3 folder (pre-skills, 2026-07-14..18): full set minus 04_SKILLS.
  writeFileSync(join(agentDir, "01_CONSTITUTION.md"), "# c\n");
  writeFileSync(join(agentDir, "02_RULES.md"), "# r\n");
  writeFileSync(join(agentDir, "03_STRUCTURE.md"), "# s\n");
  writeFileSync(join(agentDir, "04_TODO.md"), "# gen3 todo\n");
  writeFileSync(join(agentDir, "05_CHANGES.md"), "# gen3 changes\n");

  ensureHarness(root);

  assert.equal(readFileSync(join(agentDir, "05_TODO.md"), "utf8"), "# gen3 todo\n");
  assert.equal(readFileSync(join(agentDir, "06_CHANGES.md"), "utf8"), "# gen3 changes\n");
  assert.equal(existsSync(join(agentDir, "04_SKILLS.md")), true, "skills gap-filled from template");
  assert.equal(existsSync(join(agentDir, "04_TODO.md")), false, "old 04_TODO renamed away");
  assert.equal(existsSync(join(agentDir, "05_CHANGES.md")), false, "old 05_CHANGES renamed away");
});

test("freshHarness backs up both agent docs and plan", (t) => {
  const root = tempDir(t, "zemory-fresh-");
  ensureHarness(root);
  writeFileSync(join(root, "docs", "plan", "custom.md"), "# Keep me\n");

  const result = freshHarness(root);

  assert.ok(result.renamedTo);
  assert.ok(result.renamedPlanTo);
  assert.equal(existsSync(join(result.renamedPlanTo, "custom.md")), true);
  assert.equal(existsSync(join(root, "docs", "plan", "00_overview.md")), true);
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
