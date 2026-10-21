// Rule_Gate_85 on an EXISTING part (plan/29 §14f): adding a law (a 🔴 line) needs a version above the last commit, and the
// store is found from the absolute path, so a repo of the workspace writing into zemory's HS is held by its own guard too.
// The two halves the gate.json examples cannot reach (their temp folders are no git repo, and they live under one root).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { RULE_HOOKS } from "../../dist/docs/rule-hooks-src.js";
import { tempDir } from "./helpers.mjs";

const requireHere = createRequire(import.meta.url);
const git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", windowsHide: true });
const put = (root, rel, text) => { const p = join(root, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); return p; };

function load(t) {
  const dir = tempDir(t, "zemory-85hook-");
  const f = put(dir, "hook.cjs", RULE_HOOKS.find((h) => h.file === "02-85_propose-checked.cjs").source);
  return requireHere(f).check;
}

/** A zemory repo whose HS holds one law and one skill at version 2 (committed), and a department repo beside it. */
function workspace(t) {
  const base = tempDir(t, "zemory-85ws-");
  const zem = join(base, "Zemory");
  put(zem, "docs_template/_Store/01_LAW/_Rule/03_Safety/Rule_Gate_10_DestructiveOps/Rule_Gate_10_DestructiveOps.md",
    "---\nid: Rule_10\n---\n# Rule_Gate_10_DestructiveOps Destructive operations\n");
  const skill = put(zem, "docs_template/_Store/03_SKILLS/Skill_PBI_Demo/Skill_PBI_Demo.md",
    "---\nid: Skill_PBI_Demo\nversion: 2\nchecked: [Rule_Gate_10_DestructiveOps]\n---\n# demo\n\n- step one\n\n## Implements\n- `Rule_Gate_10_DestructiveOps`\n");
  git(zem, "init", "-q");
  git(zem, "config", "user.email", "t@t");
  git(zem, "config", "user.name", "t");
  git(zem, "add", "-A");
  git(zem, "commit", "-q", "-m", "v2");
  const dept = join(base, "Dept_X");
  mkdirSync(join(dept, "docs", "hooks"), { recursive: true });
  return { skill, dept };
}

const POLICY = { rules_file: "docs/agent/01_LAW/_Rule", flags_dir: "docs/hooks", flags: {} };
const RED = "- step one\n- \u{1F534} **Every box offers Select all.**";

test("a new law in an existing skill keeps the committed version: blocked, even when another repo writes it", (t) => {
  const check = load(t);
  const { skill, dept } = workspace(t);
  const msg = check({ tool_name: "Edit", tool_input: { file_path: skill, old_string: "- step one", new_string: RED } }, dept, POLICY);
  assert.ok(msg, "the department repo's guard sees zemory's HS by the absolute path");
  assert.match(String(msg), /version above 2/);
});

test("the same law with the version raised in the same edit goes through", (t) => {
  const check = load(t);
  const { skill, dept } = workspace(t);
  const msg = check({ tool_name: "MultiEdit", tool_input: { file_path: skill, edits: [
    { old_string: "version: 2", new_string: "version: 3" },
    { old_string: "- step one", new_string: RED },
  ] } }, dept, POLICY);
  assert.equal(msg, null);
});

test("a file outside any HS is never judged", (t) => {
  const check = load(t);
  const { dept } = workspace(t);
  const f = put(dept, "docs/notes.md", "- step one\n");
  assert.equal(check({ tool_name: "Edit", tool_input: { file_path: f, old_string: "- step one", new_string: RED } }, dept, POLICY), null);
});
