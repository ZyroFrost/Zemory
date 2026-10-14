// Plan invariants with a machine latch (plan/27 §0b): the rules a plan states as "never" get a guard branch, so the
// block itself names the rule instead of the agent having to have read the plan.
//   HP 3   - no hand-typed DELETE / UPDATE / DROP on the source rows (sessions / messages) of the memory store;
//   HP 2/7 - the memory store, the share key and runtime data never go into a cloud folder, nor into git;
//   the machine's real Syncthing (REST on 8384) is not written to;
//   an internal network address never enters a tracked file.
// Each latch is checked from both sides: the case it exists for is blocked FOR THAT REASON, and the look-alike next
// to it (a read, a derived table, a data-free copy, a removal from git, a test file) is not blocked by it.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { generateGuards } from "../../dist/docs/guard-gen.js";
import { tempDir } from "./helpers.mjs";

function repo(t) {
  const root = tempDir(t, "zemory-inv-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ layout: "app", docs: "docs/agent" }));
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  return { root, git, hooksDir: generateGuards(root).hooksDir };
}

function fire(hooksDir, tool_name, tool_input) {
  const r = spawnSync(process.execPath, [join(hooksDir, "guard.cjs")], {
    input: JSON.stringify({ tool_name, tool_input }),
    encoding: "utf8",
  });
  return { blocked: r.status === 2, say: `${r.stdout}${r.stderr}` };
}

test("HP 3: a hand-typed DELETE / UPDATE / DROP on sessions or messages of the store is blocked; reads and derived tables are not", (t) => {
  const { hooksDir } = repo(t);
  for (const cmd of [
    `sqlite3 global_memory.db "DELETE FROM messages WHERE id = 1"`,
    `sqlite3 global_memory.db "UPDATE sessions SET title = 'x'"`,
    `sqlite3 global_memory.db "DROP TABLE IF EXISTS messages"`,
    `node -e "new (require('better-sqlite3'))('global_memory.db').exec('delete from sessions')"`,
  ]) {
    const r = fire(hooksDir, "Bash", { command: cmd });
    assert.equal(r.blocked, true, `slipped through: ${cmd}`);
    assert.match(r.say, /HP 3/, `blocked for the wrong reason: ${cmd}\n${r.say}`);
  }
  for (const cmd of [
    `sqlite3 global_memory.db "SELECT count(*) FROM messages"`,
    `sqlite3 global_memory.db "DELETE FROM vec_chunks"`,
    `sqlite3 other.db "DELETE FROM messages"`,
  ]) {
    assert.doesNotMatch(fire(hooksDir, "Bash", { command: cmd }).say, /HP 3/, `blocked wrongly: ${cmd}`);
  }
});

test("HP 2, 7: copying the store / share key / data into a cloud folder is blocked; other copies are not blocked by it", (t) => {
  const { hooksDir } = repo(t);
  for (const cmd of [
    `cp global_memory.db "C:/Users/u/OneDrive - Company/backup/"`,
    `Copy-Item data -Destination "D:/Dropbox/x" -Recurse`,
    `robocopy global-memory "C:/Users/u/Google Drive/gm" /E`,
    `cp share.key ~/iCloudDrive/`,
  ]) {
    const r = fire(hooksDir, "Bash", { command: cmd });
    assert.equal(r.blocked, true, `slipped through: ${cmd}`);
    assert.match(r.say, /HP 2, 7/, `blocked for the wrong reason: ${cmd}\n${r.say}`);
  }
  for (const cmd of [`cp global_memory.db backup/`, `cp notes.md "C:/Users/u/OneDrive/"`, `cp database.md OneDrive/`]) {
    assert.doesNotMatch(fire(hooksDir, "Bash", { command: cmd }).say, /HP 2, 7/, `blocked wrongly: ${cmd}`);
  }
});

test("the real Syncthing REST (8384) is not written to; reading it and another port pass", (t) => {
  const { hooksDir } = repo(t);
  for (const cmd of [
    `curl -X POST -H "X-API-Key: k" http://127.0.0.1:8384/rest/system/restart`,
    `curl -s --request PATCH localhost:8384/rest/config/folders/x -d "{}"`,
    `Invoke-RestMethod -Uri http://127.0.0.1:8384/rest/config -Method Put -Body $b`,
  ]) {
    const r = fire(hooksDir, "Bash", { command: cmd });
    assert.equal(r.blocked, true, `slipped through: ${cmd}`);
    assert.match(r.say, /Syncthing/, `blocked for the wrong reason: ${cmd}\n${r.say}`);
  }
  for (const cmd of [`curl -s http://127.0.0.1:8384/rest/system/status`, `curl -X POST http://127.0.0.1:18384/rest/system/restart`]) {
    assert.equal(fire(hooksDir, "Bash", { command: cmd }).blocked, false, `blocked wrongly: ${cmd}`);
  }
});

test("an internal address written into a tracked file is blocked; documentation ranges, ignored files and tests pass", (t) => {
  const { root, hooksDir } = repo(t);
  writeFileSync(join(root, ".gitignore"), "local/\n");
  const w = (rel, content) => fire(hooksDir, "Write", { file_path: join(root, rel), content });
  for (const [rel, content] of [["notes.md", "server at 192.168.1.20 port 80"], ["cfg.json", '{"host":"172.20.3.4"}']]) {
    const r = w(rel, content);
    assert.equal(r.blocked, true, `slipped through: ${rel}`);
    assert.match(r.say, /internal network address/, r.say);
  }
  assert.equal(w("notes.md", "server at 192.0.2.10").blocked, false, "a documentation range must pass");
  assert.equal(w("notes.md", "version 10.0.1").blocked, false, "a version number must pass");
  assert.equal(w("local/hosts.md", "192.168.1.20").blocked, false, "a git-ignored file must pass");
  assert.equal(w("backend/test/x.test.mjs", "192.168.1.20").blocked, false, "a test fixture must pass");
  // An Edit that keeps an address already there is not a NEW address.
  const e = fire(hooksDir, "Edit", { file_path: join(root, "old.md"), old_string: "at 192.168.1.20", new_string: "at 192.168.1.20 (old)" });
  assert.doesNotMatch(e.say, /internal network address/);
});

test("pre-commit: data / the store / model weights in staging exit 1; code and removing such a file exit 0", (t) => {
  const { root, git, hooksDir } = repo(t);
  const run = () => spawnSync(process.execPath, [join(hooksDir, "precommit-guard.cjs")], { cwd: root, encoding: "utf8" });
  writeFileSync(join(root, "app.ts"), "export {};\n");
  git("add", "app.ts");
  assert.equal(run().status, 0, "clean staging must pass");
  for (const rel of ["data/rows.json", "global_memory.db", "models/m.onnx", "global-memory/x.txt"]) {
    mkdirSync(join(root, rel, ".."), { recursive: true });
    writeFileSync(join(root, rel), "x");
    git("add", "-f", rel);
    const out = run();
    assert.equal(out.status, 1, `slipped through: ${rel}`);
    assert.match(out.stderr, new RegExp(rel.replace(/[.]/g, "\\.")), "must name the file");
    git("rm", "-q", "--cached", rel);
  }
  // Removing an already-tracked store file from git must stay possible.
  writeFileSync(join(root, "old.db"), "x");
  spawnSync("git", ["-c", "core.hooksPath=/dev/null", "add", "-f", "old.db"], { cwd: root });
  spawnSync("git", ["-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "seed"], { cwd: root });
  git("rm", "-q", "--cached", "old.db");
  assert.equal(run().status, 0, "removing a store file from git must pass");
});
