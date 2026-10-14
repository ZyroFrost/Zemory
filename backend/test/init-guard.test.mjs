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
    assert.match(r.stdout, /guard: /, "init reports the guard step");
    for (const f of ["guard.cjs", "policy.json", "02-59_read-first.cjs", "precommit-guard.cjs"]) {
      assert.ok(existsSync(join(root, "docs", "hooks", f)), `init left no docs/hooks/${f}`);
    }
    const pol = JSON.parse(readFileSync(join(root, "docs", "hooks", "policy.json"), "utf8"));
    assert.deepEqual(pol.read_first.required, ["docs/agent/05_TODO.md"]);
    assert.equal(pol.read_first.sections[0].file, "docs/agent/02_RULES.md");
    assert.match(readFileSync(join(root, ".claude", "settings.json"), "utf8"), /guard\.cjs/, "the guard is wired into PreToolUse");
    assert.match(readFileSync(join(root, "docs", "agent", "02_RULES.md"), "utf8"), /zemory:core:start/, "the rule set carries the core");
  });
}

test("doctor reports a repo WITHOUT a guard even when it declares no `protected` path; with the guard it does not", (t) => {
  const dir = tempDir(t, "zemory-doctor-guard-");
  const root = join(dir, "proj");
  spawnSync("git", ["init", "-q", root]);
  assert.equal(run(root, dir, "init").status, 0);
  assert.doesNotMatch(run(root, dir, "doctor").stdout, /NO machine guard/, "a guarded repo is not reported");
  rmSync(join(root, "docs", "hooks"), { recursive: true, force: true });
  assert.match(run(root, dir, "doctor").stdout, /NO machine guard yet/, "a repo without the guard is reported");
});
