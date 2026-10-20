// A fresh `zemory init` must leave a project GUARDED, not just scaffolded (02-55: the guard is the standard). Found in
// the fresh-clone trial 2026-10-14: init stopped after the docs, so a new project had the rule core in words only — no
// read-first latch, no delete/push/secret latch — and `doctor` said nothing because it only checked repos declaring
// `protected`. Run through the real CLI on a temp repo with an isolated memory store.
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tempDir } from "./helpers.mjs";

const cli = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");
function run(cwd, dir, ...args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GLOBAL_MEMORY_DB: join(dir, "store", "gm.db") },
    timeout: 120_000,
  });
}

for (const kind of ["app", "non-app"]) {
  test(`init (${kind}) generates and wires the guard, with the section-based read-first policy`, (t) => {
    const dir = tempDir(t, "zemory-init-guard-");
    const root = join(dir, "proj");
    spawnSync("git", ["init", "-q", root]);
    const r = run(root, dir, "init", ...(kind === "non-app" ? ["--non-app"] : []));
    assert.equal(r.status, 0, r.stdout + r.stderr);
    // 20/10: a plain init builds the folder harness of a set (app → 04, non-app → 03); the guard lives in its rule's folder
    assert.match(r.stdout, kind === "non-app" ? /kit 03_IDE_NonApp_Memory/ : /kit 04_IDE_App_Memory/, "init assembles the set of its kind");
    for (const f of ["guard.cjs", "policy.json", "02-59_read-first.cjs", "precommit-guard.cjs"]) {
      assert.ok(existsSync(join(root, RULE59, f)), `init left no ${RULE59}/${f}`);
    }
    assert.ok(!existsSync(join(root, "docs", "agent", "02_RULES.md")), "no file harness beside the folder harness");
    const pol = JSON.parse(readFileSync(join(root, RULE59, "policy.json"), "utf8"));
    assert.ok(pol.read_first.required.includes("docs/agent/04_TODO.md"), JSON.stringify(pol.read_first.required));
    assert.ok(pol.read_first.required.some((f) => /\/Rule_Core_\d+_/.test(f)), "the Core laws are forced reading");
    assert.match(readFileSync(join(root, ".claude", "settings.json"), "utf8"), /guard\.cjs/, "the guard is wired into PreToolUse");
  });
}

const RULE59 = join("docs", "agent", "01_LAW", "_Rule", "01_Harness", "Rule_Gate_59_ReadFirst");

test("doctor reports a repo WITHOUT a guard even when it declares no `protected` path; with the guard it does not", (t) => {
  const dir = tempDir(t, "zemory-doctor-guard-");
  const root = join(dir, "proj");
  spawnSync("git", ["init", "-q", root]);
  assert.equal(run(root, dir, "init").status, 0);
  assert.doesNotMatch(run(root, dir, "doctor").stdout, /NO machine guard/, "a guarded repo is not reported");
  rmSync(join(root, RULE59, "guard.cjs"), { force: true });
  assert.match(run(root, dir, "doctor").stdout, /NO machine guard yet/, "a repo without the guard is reported");
});
