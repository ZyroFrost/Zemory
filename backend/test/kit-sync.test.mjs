// `zemory sync` on a kit repo IS the update from the store (user 2026-10-19: "khi cần t chỉ gọi sync"), and what the pass
// cannot fix lands in the repo's TODO ledger as a block the next session reads. One implementation behind the CLI and the
// app's button (docs/kit-sync.ts, constitution article 17).

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { STANDARD_TODO_END, STANDARD_TODO_START, writeStandardTodo } from "../../dist/docs/kit-sync.js";
import { retiredNameFindings } from "../../dist/docs/case-checks.js";
import { tempDir } from "./helpers.mjs";

function write(root, rel, body = "x\n") {
  const p = join(root, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, body);
}

const item = (check, samples) => ({ check, level: "blocking", title: `title of ${check}`, samples, count: samples.length, fix: `fix ${check}` });

/** A file-harness repo is enough for the ledger writer: it finds the TODO through the marker. */
function ledgerRepo(t, body, eol = "\n") {
  const root = tempDir(t, "zemory-kitsync-");
  write(root, "docs/.harness.json", JSON.stringify({ docs: "docs/agent", profile: "non-app" }));
  write(root, "docs/agent/05_TODO.md", body.split("\n").join(eol));
  return root;
}
const ledger = (root) => readFileSync(join(root, "docs/agent/05_TODO.md"), "utf8");

test("the off-standard block goes under the ledger's first heading; the repo's own lines stay byte for byte", (t) => {
  const own = "# Dept_XY — TODO\n\n## Việc mở\n- [ ] a\n";
  const root = ledgerRepo(t, own);
  const r = writeStandardTodo(root, [item("case-index", ["content/README.md: no row for tasks/A/"])]);
  assert.equal(r.state, "written");
  const text = ledger(root);
  assert.ok(text.startsWith("# Dept_XY — TODO\n\n" + STANDARD_TODO_START), "right under the heading");
  assert.match(text, /- \[ \] `case-index` \(1\) title of case-index: content\/README\.md: no row for tasks\/A\/ → fix case-index/);
  assert.ok(text.endsWith(STANDARD_TODO_END + "\n\n## Việc mở\n- [ ] a\n"), "the repo's section follows untouched");
});

test("a second pass replaces the block (never a second copy), and an unchanged pass writes nothing", (t) => {
  const root = ledgerRepo(t, "# Dept_XY — TODO\n\n## Việc mở\n- [ ] a\n");
  writeStandardTodo(root, [item("case-index", ["a"]), item("ledger-title", ["b"])]);
  const r2 = writeStandardTodo(root, [item("ledger-title", ["b"])]);
  assert.equal(r2.state, "written");
  const text = ledger(root);
  assert.equal(text.split(STANDARD_TODO_START).length - 1, 1, "one block");
  assert.doesNotMatch(text, /case-index/, "a finding the repo fixed leaves the block");
  assert.equal(writeStandardTodo(root, [item("ledger-title", ["b"])]).state, "unchanged");
});

test("on the standard the block leaves and the ledger is what the repo wrote, exactly", (t) => {
  const own = "# Dept_XY — TODO\n\n## Việc mở\n- [ ] a\n";
  const root = ledgerRepo(t, own);
  writeStandardTodo(root, [item("case-index", ["a"])]);
  assert.equal(writeStandardTodo(root, []).state, "removed");
  assert.equal(ledger(root), own);
});

test("a CRLF ledger stays CRLF (rule 24 keeps line endings)", (t) => {
  const own = "# Dept_XY — TODO\n\n## Việc mở\n- [ ] a\n";
  const root = ledgerRepo(t, own, "\r\n");
  writeStandardTodo(root, [item("case-index", ["a"])]);
  const text = ledger(root);
  assert.equal(text.replace(/\r\n/g, "").includes("\n"), false, "no bare LF");
  writeStandardTodo(root, []);
  assert.equal(ledger(root), own.split("\n").join("\r\n"));
});

test("NEGATIVE: retired-harness-name does not report the block it fed (its fix text names the old files)", (t) => {
  const root = tempDir(t, "zemory-kitsync-");
  write(root, "docs/.harness.json", JSON.stringify({ docs: "docs/agent", profile: "non-app" }));
  write(root, "docs/agent/01_LAW/_Rule/01_Harness/Rule_Gate_59_ReadFirst/Rule_Gate_59_ReadFirst.md", "---\nid: Rule_Gate_59_ReadFirst\nversion: 1\n---\n# r\n");
  write(root, "docs/agent/04_TODO.md", "# Dept_XY — TODO\n\n## Việc mở\n");
  writeStandardTodo(root, [item("retired-harness-name", ["docs/plan/a.md: 02_RULES"])]);
  assert.match(readFileSync(join(root, "docs/agent/04_TODO.md"), "utf8"), /02_RULES/, "the block quotes the finding");
  assert.deepEqual(retiredNameFindings(root), []);
  write(root, "docs/agent/04_TODO.md", readFileSync(join(root, "docs/agent/04_TODO.md"), "utf8") + "- [ ] xem 02_RULES\n");
  assert.deepEqual(retiredNameFindings(root), ["docs/agent/04_TODO.md: 02_RULES"], "the repo's own line outside the block still counts");
});

// The real CLI on a repo assembled from the real store (set 05), in a temp folder with a temp memory store.
const cli = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const run = (cwd, args, db) => execFileSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", env: { ...process.env, GLOBAL_MEMORY_DB: db } });

test("plain `zemory sync` in a kit repo puts back a part that fell behind, and lists what is off the standard in the TODO", (t) => {
  const base = tempDir(t, "zemory-kitsync-cli-");
  const root = join(base, "Dept_XY");
  mkdirSync(root, { recursive: true });
  const db = join(base, "t.db");
  run(root, ["init", "--kit", "05"], db);
  const skill = join(root, "docs/agent/03_SKILLS/Skill_Task_Case");
  assert.ok(existsSync(skill), "the set assembled the skill");
  rmSync(skill, { recursive: true, force: true });
  write(root, "tasks/XY_Monthly_Sales/spec.md", "# no front block\n");
  const out = run(root, ["sync"], db);
  assert.ok(existsSync(skill), "plain sync assembled it again: " + out.slice(0, 400));
  const todo = readFileSync(join(root, "docs/agent/04_TODO.md"), "utf8");
  assert.match(todo, /`case-header`/, "the spec without a front block is listed for the repo's session");
});

test("NEGATIVE: `zemory sync --root <other repo>` without --apply writes nothing there", (t) => {
  const base = tempDir(t, "zemory-kitsync-cli-");
  const root = join(base, "Dept_XY");
  mkdirSync(root, { recursive: true });
  const db = join(base, "t.db");
  run(root, ["init", "--kit", "05"], db);
  const skill = join(root, "docs/agent/03_SKILLS/Skill_Task_Case");
  rmSync(skill, { recursive: true, force: true });
  const out = run(base, ["sync", "--root", root], db);
  assert.ok(!existsSync(skill), "another repo is written only with --apply");
  assert.match(out, /DRY-RUN/);
  run(base, ["sync", "--root", root, "--apply"], db);
  assert.ok(existsSync(skill), "--apply writes it");
});
