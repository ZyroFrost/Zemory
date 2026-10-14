// Rule gate COVERAGE (plan/27 §3): every rule registers what it is — `gate:` (has a gate) · `gate-todo:` (gateable, not
// built) · nothing inside the core (judgement, not gateable). Only a rule registered as gateable whose gate is NOT really
// in place in the repo is a gap; judgement rules are never counted. The gate is checked for real: the guard wired, the
// rule's own hook file present and listed in the policy, the pre-commit wired.
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { generateGuards } from "../../dist/docs/guard-gen.js";
import { ruleCoverage } from "../../dist/docs/rule-core.js";
import { repoGates } from "../../dist/docs/repo-gates.js";
import { tempDir } from "./helpers.mjs";

const RULES = [
  "# R",
  "## Lõi",
  "<!-- zemory:core:start · t -->",
  "- `02-3` **Judge.** say each step",
  "- `02-13` **Red.** break the code <!-- gate-todo: remind on a new test file -->",
  "<!-- zemory:core:end -->",
  "## Gated",
  "- `02-10` **Delete.** ask first <!-- gate: guard -->",
  "- `02-26` **Diacritics.** write them <!-- gate: guard -->",
  "- `02-25` **SQL.** one way <!-- gate: guard -->",
  "- `02-5` **Scratch.** dies <!-- gate: hook:precommit-guard -->",
  "- `02-37` **Plan.** small <!-- gate: validate -->",
  "",
].join("\n");

function repo(t) {
  const root = tempDir(t, "zemory-cov-");
  const agent = join(root, "docs", "agent");
  mkdirSync(agent, { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ layout: "app", docs: "docs/agent" }));
  writeFileSync(join(agent, "02_RULES.md"), RULES);
  spawnSync("git", ["init", "-q", root]);
  const { hooksDir } = generateGuards(root);
  return { root, agent, hooksDir };
}

test("a fully guarded repo: every gateable rule is hooked; the judgement rule is not counted; 02-25 without a store is n/a", (t) => {
  const s = repo(t);
  const c = ruleCoverage(s.root, s.agent);
  assert.equal(c.judgement, 1, "02-3 is judgement — registered, never a gap");
  assert.equal(c.gateable, 5, "02-10 · 02-26 · 02-5 · 02-37 + the gate-todo 02-13 (02-25 has no SQL store here ⇒ n/a)");
  assert.equal(c.hooked, 4);
  assert.deepEqual(c.missing.map((m) => m.id), ["02-13"], "only the rule registered as gateable with no gate built");
});

test("a gate that is registered but NOT really in place is a gap: hook file gone, hook unlisted, guard unwired, pre-commit gone", (t) => {
  const s = repo(t);
  rmSync(join(s.hooksDir, "02-26_vi-diacritics.cjs"));
  assert.match(ruleCoverage(s.root, s.agent).missing.find((m) => m.id === "02-26")?.why ?? "", /missing/);
  generateGuards(s.root);
  const pol = JSON.parse(readFileSync(join(s.hooksDir, "policy.json"), "utf8"));
  pol.rule_hooks = pol.rule_hooks.filter((h) => !h.file.startsWith("02-26_"));
  writeFileSync(join(s.hooksDir, "policy.json"), JSON.stringify(pol));
  assert.match(ruleCoverage(s.root, s.agent).missing.find((m) => m.id === "02-26")?.why ?? "", /not in policy/);
  rmSync(join(s.root, ".git", "hooks", "pre-commit"));
  assert.ok(ruleCoverage(s.root, s.agent).missing.some((m) => m.id === "02-5"), "pre-commit gone ⇒ 02-5 has no gate");
  writeFileSync(join(s.root, ".claude", "settings.json"), "{}");
  const c = ruleCoverage(s.root, s.agent);
  assert.ok(c.missing.some((m) => m.id === "02-10" && /guard not wired/.test(m.why)), "an unwired guard gates nothing");
  assert.ok(!c.missing.some((m) => m.id === "02-3"), "a judgement rule is never a gap, whatever else is broken");
});

test("repoGates counts a coverage gap, and a repo whose only open item is coverage still shows it", (t) => {
  const s = repo(t);
  const g = repoGates(s.root, "R");
  assert.equal(g.rules.missing.length, 1);
  assert.ok(g.gaps >= 1);
  writeFileSync(join(s.agent, "02_RULES.md"), RULES.replace(" <!-- gate-todo: remind on a new test file -->", ""));
  assert.equal(repoGates(s.root, "R").rules.missing.length, 0, "02-13 re-registered as judgement ⇒ no longer a gap");
});
