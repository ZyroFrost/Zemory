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
  assert.match(text, /- \[ \] `case-index` \(1\) title of case-index → fix case-index\n {2}- content\/README\.md: no row for tasks\/A\//);
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

test("sync rewrites the router half of AGENTS.md from the set (a repo that changed set kept the old one); the trigger rows stay", (t) => {
  const base = tempDir(t, "zemory-kitsync-cli-");
  const root = join(base, "Dept_XY");
  mkdirSync(root, { recursive: true });
  const db = join(base, "t.db");
  run(root, ["init", "--kit", "05"], db);
  const p = join(root, "AGENTS.md");
  const fresh = readFileSync(p, "utf8");
  const stale = fresh.replace(/hệ \*\*[^*]+\*\*/, "hệ **NON-APP**").replace(/`zemory init --kit \d+`/, "`zemory init --kit 02`")
    + "| việc riêng của repo | `.claude/skills/own-thing/SKILL.md` |\n";
  writeFileSync(p, stale);
  const out = run(root, ["sync"], db);
  const now = readFileSync(p, "utf8");
  assert.match(out, /AGENTS\.md: the router half rewritten/);
  assert.doesNotMatch(now, /--kit 02`/, "the init command is the set's again");
  assert.ok(now.startsWith(fresh.split("\n## Mở khi trúng trigger")[0]), "the router half equals the set's");
  assert.match(now, /own-thing\/SKILL\.md/, "a trigger row the repo added stays");
  assert.doesNotMatch(run(root, ["sync"], db), /router half rewritten/, "a second pass has nothing to rewrite");
});

test("a department repo's git is its local backup: the guard blocks push and remote add, conform reports a remote (Dept_IT)", async (t) => {
  const { spawnSync } = await import("node:child_process");
  const { gitRemoteFindings } = await import("../../dist/docs/case-checks.js");
  const base = tempDir(t, "zemory-kitsync-git-");
  const root = join(base, "Dept_XY");
  mkdirSync(root, { recursive: true });
  run(root, ["init", "--kit", "05"], join(base, "t.db"));
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  const guard = join(root, "docs/agent/01_LAW/_Rule/01_Harness/Rule_Gate_59_ReadFirst/guard.cjs");
  const ask = (command) => spawnSync(process.execPath, [guard], { input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }), cwd: root, encoding: "utf8" });
  for (const cmd of ["git push origin main", "git remote add origin https://example.com/x.git", "git -C . push"]) {
    const r = ask(cmd);
    assert.equal(r.status, 2, `must be blocked: ${cmd}`);
    assert.match(r.stderr, /LOCAL BACKUP/);
  }
  assert.doesNotMatch(ask('git commit -m "push the backup"').stderr, /LOCAL BACKUP/, "NEGATIVE: a commit (even saying push) is the backup itself");
  assert.deepEqual(gitRemoteFindings(root), [], "no remote: nothing to report");
  git("remote", "add", "origin", "https://example.com/x.git");
  assert.equal(gitRemoteFindings(root).length, 1, "a remote on a local-backup repo is reported");
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

test("sync completes the lines a slot requires in a line-list file and drops the old ones; other files are left to conform", async (t) => {
  // 2026-10-19: BIZ · IC · MKT · OPS all lacked docs/.harness-state and *.cmd eol=crlf, and still blocked docs/hooks/.allow-*
  const { fixSlotLines } = await import("../../dist/docs/kit-sync.js");
  const root = tempDir(t, "zemory-slotlines-");
  write(root, "docs/.harness.json", JSON.stringify({ docs: "docs/agent" }));
  write(root, "docs/agent/02_STRUCTURE/_Slot/Root_141_Stignore/gate.json", JSON.stringify({ conform: {
    contains: { ".stignore": ["docs/.harness-state", "data"] }, absent: { ".stignore": ["docs/hooks/.allow-"] } } }));
  write(root, "docs/agent/02_STRUCTURE/_Slot/Root_086_Gitattributes/gate.json", JSON.stringify({ conform: {
    contains: { ".gitattributes": ["*.cmd text eol=crlf", "*.bat text eol=crlf"], "README.md": "never added" } } }));
  write(root, ".stignore", "data\r\ndocs/hooks/.allow-*\r\n\r\n// zemory:stignore-allow:start · x\r\n!/tasks\r\n*\r\n// zemory:stignore-allow:end\r\n");
  write(root, ".gitattributes", "* text=auto\n*.cmd text eol=crlf\n");
  write(root, "README.md", "# x\n");
  assert.deepEqual(fixSlotLines(root, false).sort(), [".gitattributes: + *.bat text eol=crlf", ".stignore: + docs/.harness-state", ".stignore: - docs/hooks/.allow-*"]);
  assert.match(readFileSync(join(root, ".stignore"), "utf8"), /allow-/, "a dry run writes nothing");
  fixSlotLines(root, true);
  const st = readFileSync(join(root, ".stignore"), "utf8");
  assert.ok(st.indexOf("docs/.harness-state") < st.indexOf("zemory:stignore-allow:start"), "the required line sits above the allow block");
  assert.ok(!st.includes("docs/hooks/.allow-") && !/[^\r]\n/.test(st), "the old line is gone, CRLF kept");
  assert.equal(readFileSync(join(root, ".gitattributes"), "utf8"), "* text=auto\n*.cmd text eol=crlf\n*.bat text eol=crlf\n");
  assert.equal(readFileSync(join(root, "README.md"), "utf8"), "# x\n", "a file that is not a line list is the repo's to write");
  assert.deepEqual(fixSlotLines(root, true), [], "a second pass changes nothing");
});
