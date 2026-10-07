// GUARD: `git push` that carries CODE with a version already on upstream is blocked (rule audit 2026-10-07).
// 02_RULES §Git: every code push carries a NEW version; docs-only pushes are exempt. Measured 2026-09-24: three commits
// all declared 3.5.0 and the other machine's selfupdate never saw the fix. No flag gets past this one.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { generateGuards } from "../../dist/docs/guard-gen.js";
import { tempDir } from "./helpers.mjs";

const git = (cwd, ...a) => {
  const r = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
};

function repo(t) {
  const base = tempDir(t, "zemory-gver-");
  const remote = join(base, "remote.git");
  git(base, "init", "-q", "--bare", remote);
  const root = join(base, "work");
  git(base, "clone", "-q", remote, root);
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  mkdirSync(join(root, "backend"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ layout: "app", docs: "docs/agent" }));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "x", version: "1.0.0" }));
  writeFileSync(join(root, "backend", "a.ts"), "export const a = 1;\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "base");
  git(root, "push", "-q", "-u", "origin", "HEAD");
  const r = generateGuards(root);
  return { root, hooks: r.hooksDir };
}
const push = (r) =>
  spawnSync(process.execPath, [join(r.hooks, "guard.cjs")], {
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "git push" } }),
    encoding: "utf8",
    cwd: r.root,
  });
const flag = (r) => writeFileSync(join(r.hooks, ".allow-push"), "user said push (test)\n");

test("code change with the SAME version as upstream ⇒ blocked even WITH the push flag", (t) => {
  const r = repo(t);
  writeFileSync(join(r.root, "backend", "a.ts"), "export const a = 2;\n");
  git(r.root, "commit", "-q", "-am", "fix");
  flag(r);
  const res = push(r);
  assert.equal(res.status, 2, "phải chặn");
  assert.match(res.stderr, /same version as .*bump the version first/);
});

test("NEGATIVE: version bumped ⇒ the flag is enough; docs-only push ⇒ no version needed", (t) => {
  const r = repo(t);
  writeFileSync(join(r.root, "backend", "a.ts"), "export const a = 2;\n");
  writeFileSync(join(r.root, "package.json"), JSON.stringify({ name: "x", version: "1.0.1" }));
  git(r.root, "commit", "-q", "-am", "fix + bump");
  flag(r);
  assert.equal(push(r).status, 0, "đã đổi số + có cờ ⇒ qua");

  const d = repo(t);
  writeFileSync(join(d.root, "docs", "agent", "05_TODO.md"), "# todo\n");
  git(d.root, "add", "docs/agent/05_TODO.md"); // only the docs file — not the generated guard wiring
  git(d.root, "commit", "-q", "-m", "docs");
  flag(d);
  const res = push(d);
  assert.equal(res.status, 0, "chỉ docs ⇒ không cần số mới: " + res.stderr);
});

test("NEGATIVE: no upstream or no package.json ⇒ the version rule does not apply (only the flag rule)", (t) => {
  const base = tempDir(t, "zemory-gver-none-");
  const root = join(base, "solo");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  git(base, "init", "-q", root);
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ layout: "app", docs: "docs/agent" }));
  writeFileSync(join(root, "a.txt"), "x");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "x");
  const r = { root, hooks: generateGuards(root).hooksDir };
  flag(r);
  assert.equal(push(r).status, 0);
});
