// plan/27 §2f — a self-update over local edits asks instead of stopping, and never loses a local version. Runs on real
// git: a bare origin, a clone that is the "install", a second clone that pushes the update.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { localChangePlan, parsePorcelain, restoreKept, setAsideClashes } from "../../dist/update/local-changes.js";
import { tempDir } from "./helpers.mjs";

// core.autocrlf off: a machine-wide `true` would turn every checkout into CRLF and the byte comparisons below with it
const git = (cwd, ...a) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.example", "-c", "core.autocrlf=false", ...a], { cwd, encoding: "utf8", stdio: "pipe" }).trim();
const put = (root, rel, text) => {
  mkdirSync(join(root, rel, ".."), { recursive: true });
  writeFileSync(join(root, rel), text);
};
const read = (root, rel) => readFileSync(join(root, rel), "utf8");

/** origin with a.txt b.txt c.txt; `install` cloned from it; `upstream` pushes a commit changing a.txt b.txt and adding n.txt. */
function setup(t) {
  const d = tempDir(t, "zemory-selfupd-");
  const origin = join(d, "origin.git"), install = join(d, "install"), upstream = join(d, "upstream");
  git(d, "init", "--bare", "-b", "main", origin);
  git(d, "clone", origin, upstream);
  for (const f of ["a.txt", "b.txt", "c.txt"]) put(upstream, f, `${f} v1\n`);
  git(upstream, "add", ".");
  git(upstream, "commit", "-m", "v1");
  git(upstream, "push", "origin", "HEAD:main");
  git(d, "clone", origin, install);
  for (const r of [install, upstream]) git(r, "config", "core.autocrlf", "false"); // the module's own git calls read this
  put(upstream, "a.txt", "a.txt v2\n");
  put(upstream, "b.txt", "b.txt v2\n");
  put(upstream, "n.txt", "n.txt new\n");
  git(upstream, "add", ".");
  git(upstream, "commit", "-m", "v2");
  git(upstream, "push", "origin", "HEAD:main");
  return { install };
}

test("porcelain: a rename keeps its new path, a quoted path loses its quotes", () => {
  assert.deepEqual(parsePorcelain(" M a.txt\nR  old.txt -> new.txt\n?? \"sp ace.txt\"\n"), [
    { code: " M", path: "a.txt" },
    { code: "R ", path: "new.txt" },
    { code: "??", path: "sp ace.txt" },
  ]);
});

test("a clean tree has nothing to ask", (t) => {
  const { install } = setup(t);
  assert.deepEqual(localChangePlan(install), { ok: true, dirty: [], clash: [] });
});

test("only the edits the update also changes are clashes; keep wins over the new version, take gets it, nothing is lost", (t) => {
  const { install } = setup(t);
  put(install, "a.txt", "a.txt LOCAL\n"); // clash, answered keep
  put(install, "b.txt", "b.txt LOCAL\n"); // clash, answered take
  put(install, "c.txt", "c.txt LOCAL\n"); // not touched by the update
  put(install, "n.txt", "n.txt LOCAL untracked\n"); // untracked, the update adds the same path
  const plan = localChangePlan(install);
  assert.equal(plan.ok, true, plan.error);
  assert.deepEqual(plan.clash.map((c) => c.path).sort(), ["a.txt", "b.txt", "n.txt"]);
  assert.equal(plan.dirty.length, 4);

  const dir = setAsideClashes(install, plan.clash, ["a.txt", "n.txt"], "stamp");
  git(install, "pull", "--ff-only"); // goes through: no clash left in the tree
  assert.deepEqual(restoreKept(install, dir).sort(), ["a.txt", "n.txt"]);

  assert.equal(read(install, "a.txt"), "a.txt LOCAL\n", "keep: the local version sits on top of the update");
  assert.equal(read(install, "b.txt"), "b.txt v2\n", "take: the new version");
  assert.equal(read(install, join("data", "selfupdate-keep", "stamp", "b.txt")), "b.txt LOCAL\n", "take: the local version is still kept aside");
  assert.equal(read(install, "c.txt"), "c.txt LOCAL\n", "an edit the update does not touch rides through the pull");
  assert.equal(read(install, "n.txt"), "n.txt LOCAL untracked\n");
  assert.equal(git(install, "log", "-1", "--format=%s"), "v2");
});

test("without setting the clashes aside the pull refuses — the latch is what makes it go through", (t) => {
  const { install } = setup(t);
  put(install, "a.txt", "a.txt LOCAL\n");
  git(install, "fetch", "--quiet");
  assert.throws(() => git(install, "pull", "--ff-only"), /overwritten|would be/i);
  assert.equal(read(install, "a.txt"), "a.txt LOCAL\n");
});

test("the updater outside the daemon restores from the manifest right after the pull, before npm runs", () => {
  const s = readFileSync(new URL("../scripts/selfupdate-run.mjs", import.meta.url), "utf8");
  const pull = s.indexOf('step("git pull --ff-only"'), restore = s.indexOf("if (KEEP_DIR) restoreKept(!pulled)"), npmI = s.indexOf('npm(["install"])');
  assert.ok(pull > 0 && restore > pull && npmI > restore, "order: pull → restore → npm install");
  assert.match(s, /const files = all \? \[\.\.\.m\.keep, \.\.\.m\.take\] : m\.keep;/, "same manifest semantics as update/local-changes.ts");
  const ui = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  assert.match(ui, /\.\.\.\(keepDir \? \["--keep-dir", keepDir\] : \[\]\)/, "the daemon hands the folder to the updater");
});

test("a failed pull puts every clash back, keep and take alike", (t) => {
  const { install } = setup(t);
  put(install, "a.txt", "a.txt LOCAL\n");
  put(install, "b.txt", "b.txt LOCAL\n");
  const plan = localChangePlan(install);
  const dir = setAsideClashes(install, plan.clash, ["a.txt"], "stamp");
  assert.equal(read(install, "b.txt"), "b.txt v1\n", "set aside: the tree holds HEAD's version for the pull");
  restoreKept(install, dir, true);
  assert.equal(read(install, "a.txt"), "a.txt LOCAL\n");
  assert.equal(read(install, "b.txt"), "b.txt LOCAL\n");
  assert.ok(existsSync(join(dir, "manifest.json")));
});
