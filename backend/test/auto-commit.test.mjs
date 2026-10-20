// plan/27 §2e — the session's own uncommitted work is committed locally once it passes 300 lines: only its files, through
// the repo's pre-commit hook, never pushed. Real git in a temp folder; the transcript is a hand-made jsonl.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { autoCommit, sessionWrittenFiles } from "../../dist/docs/auto-commit.js";
import { tempDir } from "./helpers.mjs";

const git = (cwd, ...a) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.example", ...a], { cwd, encoding: "utf8", stdio: "pipe" }).trim();
const lines = (n, tag) => Array.from({ length: n }, (_, i) => `${tag} ${i}`).join("\n") + "\n";
const writeCall = (file_path, name = "Write") =>
  JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name, input: { file_path } }] } });

function repo(t) {
  const d = tempDir(t, "zemory-autocommit-");
  const remote = join(d, "remote.git"), root = join(d, "repo");
  git(d, "init", "--bare", "-b", "main", remote);
  git(d, "init", "-b", "main", root);
  for (const k of [["user.name", "t"], ["user.email", "t@t.example"], ["core.autocrlf", "false"]]) git(root, "config", ...k);
  writeFileSync(join(root, "base.txt"), "base\n");
  git(root, "add", ".");
  git(root, "commit", "-m", "base");
  git(root, "remote", "add", "origin", remote);
  git(root, "push", "origin", "main");
  return { d, root, remote };
}

test("the transcript's Write / Edit / MultiEdit / NotebookEdit calls are the session's files; a Read is not", () => {
  const text = [writeCall("a.ts"), writeCall("b.ts", "Edit"), writeCall("c.ts", "MultiEdit"),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: "r.ts" } }] } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "NotebookEdit", input: { notebook_path: "n.ipynb" } }] } }),
  ].join("\n");
  assert.deepEqual(sessionWrittenFiles(text).sort(), ["a.ts", "b.ts", "c.ts", "n.ipynb"]);
});

test("under the limit nothing is committed", (t) => {
  const { root } = repo(t);
  writeFileSync(join(root, "a.ts"), lines(100, "a"));
  const r = autoCommit(root, writeCall(join(root, "a.ts")));
  assert.equal(r.committed, false);
  assert.equal(r.lines, 101);
  assert.equal(git(root, "log", "--format=%s"), "base");
});

test("over the limit: only this session's files are committed, locally; another edit and a file outside stay as they are", (t) => {
  const { d, root, remote } = repo(t);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "a.ts"), lines(200, "a")); // new, this session
  writeFileSync(join(root, "base.txt"), lines(150, "b")); // tracked, this session
  writeFileSync(join(root, "other.ts"), lines(500, "o")); // dirty, NOT this session
  writeFileSync(join(d, "outside.ts"), lines(500, "x")); // this session, outside the repo
  const text = [writeCall(join(root, "src", "a.ts")), writeCall(join(root, "base.txt"), "Edit"), writeCall(join(d, "outside.ts"))].join("\n");
  const r = autoCommit(join(root, "src"), text); // a session in a subfolder of the repo
  assert.equal(r.committed, true, r.note);
  assert.ok(r.lines > 300);
  assert.deepEqual(git(root, "show", "--name-only", "--format=", "HEAD").split("\n").sort(), ["base.txt", "src/a.ts"]);
  assert.match(git(root, "log", "-1", "--format=%s"), /^Auto-commit: this session's uncommitted work passed 300 lines/);
  assert.equal(git(root, "status", "--porcelain"), "?? other.ts", "another session's edit is left uncommitted");
  assert.equal(git(remote, "log", "--format=%s", "main"), "base", "never pushed");
});

test("a pre-commit hook that refuses leaves everything uncommitted and says why", (t) => {
  const { root } = repo(t);
  const hook = join(root, ".git", "hooks", "pre-commit");
  writeFileSync(hook, "#!/bin/sh\necho 'secret found in a.ts' >&2\nexit 1\n");
  chmodSync(hook, 0o755);
  writeFileSync(join(root, "a.ts"), lines(400, "a"));
  const r = autoCommit(root, writeCall(join(root, "a.ts")));
  assert.equal(r.committed, false);
  assert.match(r.note, /commit refused: .*secret found/);
  assert.equal(git(root, "log", "--format=%s"), "base");
});

test("outside any git tree, or with nothing of this session uncommitted, there is nothing to do", (t) => {
  const d = tempDir(t, "zemory-autocommit-nogit-");
  assert.equal(autoCommit(d, writeCall(join(d, "a.ts"))), null);
  const { root } = repo(t);
  assert.equal(autoCommit(root, writeCall(join(root, "base.txt"))), null);
});

test("the Stop hook's door: a commit is said to the person in one line; nothing to do says nothing", async (t) => {
  const { endOfTurnAutoCommit } = await import("../../dist/memory/capture-hook.js");
  const { d, root } = repo(t);
  const tr = join(d, "session.jsonl");
  writeFileSync(join(root, "a.ts"), lines(400, "a"));
  writeFileSync(tr, writeCall(join(root, "a.ts")) + "\n");
  assert.match(endOfTurnAutoCommit({ cwd: root }, tr), /^\[zemory\] Auto-committed locally, not pushed: 401 uncommitted lines in 1 file/);
  assert.equal(endOfTurnAutoCommit({ cwd: root }, tr), "", "already committed: silent");
  const src = (await import("node:fs")).readFileSync(new URL("../src/memory/capture-hook.ts", import.meta.url), "utf8");
  assert.match(src, /if \(event === "stop" && !verdict && path\) \{\s+const note = endOfTurnAutoCommit\(payload, path\);/, "only a turn that ends clean commits");
});
