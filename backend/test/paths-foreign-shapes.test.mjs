// `paths check` — five shapes `_DB_DataWarehouse` measured as false "dead" (2026-10-07: 111 → 1 after these rules):
//   ① a top folder that is not the repo's (SharePoint library · another machine · inside a .pbix) · ② `%~dp0` in a .cmd ·
//   ③ a regex (`webhook_fabi\.py`, `a/\|b/`) · ④ named only to say NOT to use it · ⑤ a folder the repo DECLARES as a
//   standard written for other repos (`pathCheck.dictionary`). Every rule has its NEGATIVE: real rot must stay dead.
import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { pathsCheck } from "../../dist/docs/paths.js";
import { tempDir } from "./helpers.mjs";

function repo(t, { git = false, dictionary } = {}) {
  const root = join(tempDir(t, "zemory-pfs-"), "RepoA");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  const cfg = { docs: "docs/agent", adapters: {}, thresholds: {}, ...(dictionary ? { pathCheck: { dictionary } } : {}) };
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify(cfg));
  for (const f of ["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS", "05_TODO", "06_CHANGES"]) writeFileSync(join(root, "docs", "agent", `${f}.md`), `# ${f}\n`);
  if (git) {
    const g = (...a) => execFileSync("git", ["-C", root, "-c", "user.email=t@t", "-c", "user.name=t", ...a], { windowsHide: true, stdio: "ignore" });
    g("init", "-q");
    mkdirSync(join(root, "pipelines"), { recursive: true });
    writeFileSync(join(root, "pipelines", "old.py"), "#\n");
    g("add", "-A");
    g("commit", "-q", "-m", "a");
    rmSync(join(root, "pipelines"), { recursive: true, force: true });
    g("add", "-A");
    g("commit", "-q", "-m", "b — the top folder pipelines/ is gone");
  }
  return { root, cfg };
}
// The scan set of a git repo is `git ls-files` — a doc must be in the index, as in a real repo.
const track = (root) => execFileSync("git", ["-C", root, "add", "-A"], { windowsHide: true, stdio: "ignore" });
const run = (root, cfg) => pathsCheck({ projectRoot: root, docsDir: join(root, "docs", "agent"), config: cfg, log() {} });
const reason = (r, text) => r.unresolved.find((h) => h.text === text)?.reason;
const dead = (r) => r.dead.map((h) => h.text);

test("① a top folder this repo never had (not on disk, not in git) is not judged", (t) => {
  const { root, cfg } = repo(t, { git: true });
  writeFileSync(join(root, "docs", "plan", "01.md"), "- `Data-Lake/OPS/OPS_Target.xlsx`\n- `Project\\Company\\`\n");
  track(root);
  const r = run(root, cfg);
  assert.equal(reason(r, "Data-Lake/OPS/OPS_Target.xlsx"), "foreign-top");
  assert.equal(reason(r, "Project\\Company\\"), "foreign-top");
});

test("① NEGATIVE: a top folder the repo ONCE had (deleted in git) is still judged DEAD", (t) => {
  const { root, cfg } = repo(t, { git: true });
  writeFileSync(join(root, "docs", "plan", "01.md"), "- `pipelines/old.py`\n");
  track(root);
  assert.deepEqual(dead(run(root, cfg)), ["pipelines/old.py"]);
});

test("① NEGATIVE: a repo without git history keeps the old judgement (no vocabulary to read)", (t) => {
  const { root, cfg } = repo(t);
  writeFileSync(join(root, "docs", "plan", "01.md"), "- `Data-Lake/OPS/OPS_Target.xlsx`\n");
  assert.deepEqual(dead(run(root, cfg)), ["Data-Lake/OPS/OPS_Target.xlsx"]);
});

test("② `%~dp0` resolves from the .cmd's own folder and is judged for real", (t) => {
  const { root, cfg } = repo(t);
  mkdirSync(join(root, "bin"), { recursive: true });
  mkdirSync(join(root, "tasks", "T", "pipeline"), { recursive: true });
  writeFileSync(join(root, "tasks", "T", "pipeline", "a.py"), "#\n");
  writeFileSync(join(root, "bin", "run.cmd"), '@echo off\r\npython "%~dp0..\\tasks\\T\\pipeline\\a.py"\r\npython "%~dp0..\\tasks\\T\\pipeline\\gone.py"\r\n');
  const r = run(root, cfg);
  assert.deepEqual(dead(r).map((s) => s.replace(/.*\\tasks/, "tasks")), ["tasks\\T\\pipeline\\gone.py"], "the live one is ok, the missing one is dead");
});

test("③ a regex is not a path; NEGATIVE: an ordinary relative path still is", (t) => {
  const { root, cfg } = repo(t);
  writeFileSync(join(root, "docs", "plan", "01.md"), "- `webhook_fabi\\.py`\n- `docs/agent/archive/\\|attic/`\n- `docs/gone.md`\n");
  const r = run(root, cfg);
  assert.equal(reason(r, "webhook_fabi\\.py"), "regex");
  assert.equal(reason(r, "docs/agent/archive/\\|attic/"), "regex");
  assert.deepEqual(dead(r), ["docs/gone.md"]);
});

test("④ named only to say NOT to use it; NEGATIVE: the same path without the negation is dead", (t) => {
  const { root, cfg } = repo(t);
  writeFileSync(join(root, "docs", "plan", "01.md"), "KHÔNG tách `docs/dictionary.md`\nxem `docs/other.md`\n");
  const r = run(root, cfg);
  assert.equal(reason(r, "docs/dictionary.md"), "negated");
  assert.deepEqual(dead(r), ["docs/other.md"]);
});

test("⑤ a DECLARED dictionary folder: relative paths name other repos' places; NEGATIVE: undeclared folders are judged", (t) => {
  const { root, cfg } = repo(t, { dictionary: ["content/standard"] });
  mkdirSync(join(root, "content", "standard"), { recursive: true });
  mkdirSync(join(root, "content", "other"), { recursive: true });
  writeFileSync(join(root, "content", "standard", "DEPT.md"), "chạy `docs/plan/01_source_map.md`\n");
  writeFileSync(join(root, "content", "other", "X.md"), "chạy `docs/plan/01_source_map.md`\n");
  const r = run(root, cfg);
  assert.equal(r.unresolved.find((h) => h.file === "content/standard/DEPT.md")?.reason, "dictionary");
  assert.deepEqual(r.dead.map((h) => h.file), ["content/other/X.md"]);
});
