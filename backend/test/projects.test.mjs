// Known-projects registry. These lock the two failures that made the tab bar
// unusable (06_CHANGES 2026-07-20): test scaffolds registering themselves, and
// the same repo appearing twice because the shell spelled the drive differently.

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import {
  forgetProject,
  isScratchRoot,
  listKnownProjects,
  pinProject,
  pruneDeadProjects,
  rememberProject,
} from "../../dist/projects.js";
import { tempDir } from "./helpers.mjs";

/** A registry file of its own + a real project root, so nothing touches ~/.zemory. */
function sandbox(t) {
  const home = tempDir(t, "zemory-reg-");
  const prev = process.env.ZEMORY_REGISTRY_FILE;
  const prevAllow = process.env.ZEMORY_REGISTRY_ALLOW_TMP;
  process.env.ZEMORY_REGISTRY_FILE = join(home, "projects.json");
  // Project roots live under tmp in tests, so opt into registering them.
  process.env.ZEMORY_REGISTRY_ALLOW_TMP = "1";
  t.after(() => {
    if (prev === undefined) delete process.env.ZEMORY_REGISTRY_FILE;
    else process.env.ZEMORY_REGISTRY_FILE = prev;
    if (prevAllow === undefined) delete process.env.ZEMORY_REGISTRY_ALLOW_TMP;
    else process.env.ZEMORY_REGISTRY_ALLOW_TMP = prevAllow;
  });
  return home;
}

/** Minimal "set up" project — listKnownProjects only keeps wired-up roots. */
function project(t, prefix) {
  const root = tempDir(t, prefix);
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent" }));
  return root;
}

test("scratch roots are never registered (test scaffolds stop polluting the picker)", (t) => {
  sandbox(t);
  delete process.env.ZEMORY_REGISTRY_ALLOW_TMP; // the real-world default
  const root = project(t, "zemory-scratch-");
  assert.equal(isScratchRoot(root), true, "a temp dir must count as scratch");
  rememberProject(root);
  assert.equal(listKnownProjects().length, 0, "scratch roots must not enter the registry");
});

test("the same root spelled two ways is ONE project (Windows case folding)", (t) => {
  sandbox(t);
  const root = project(t, "zemory-case-");
  const flipped = root[0] === root[0].toUpperCase()
    ? root[0].toLowerCase() + root.slice(1)
    : root[0].toUpperCase() + root.slice(1);
  rememberProject(root);
  rememberProject(flipped);
  const list = listKnownProjects();
  assert.equal(list.length, process.platform === "win32" ? 1 : 2, "win32 folds case; posix does not");
});

test("pinned projects sort ahead of recent ones", (t) => {
  sandbox(t);
  const older = project(t, "zemory-a-");
  const newer = project(t, "zemory-b-");
  rememberProject(older);
  rememberProject(newer);
  assert.equal(listKnownProjects()[0].root, newer, "most recent leads by default");
  assert.equal(pinProject(older, true), true);
  const list = listKnownProjects();
  assert.equal(list[0].root, older, "a pinned project leads regardless of recency");
  assert.equal(list[0].pinned, true);
});

test("forgetProject drops it from the picker WITHOUT touching the project itself", (t) => {
  sandbox(t);
  const root = project(t, "zemory-forget-");
  rememberProject(root);
  assert.equal(listKnownProjects().length, 1);
  assert.equal(forgetProject(root), true);
  assert.equal(listKnownProjects().length, 0);
  // The harness on disk is the whole point: removing a tab must not delete files.
  assert.equal(JSON.parse(String(readFileSync(join(root, "docs", ".harness.json")))).docs, "docs/agent");
});

test("pruneDeadProjects removes roots that are gone or no longer set up", (t) => {
  const home = sandbox(t);
  const alive = project(t, "zemory-alive-");
  rememberProject(alive);
  // A root that never existed — exactly what a deleted scratch dir looks like.
  writeFileSync(
    join(home, "projects.json"),
    JSON.stringify({ version: 2, projects: [{ root: alive }, { root: join(home, "ghost") }] }),
  );
  assert.equal(pruneDeadProjects(), 1);
  const list = listKnownProjects();
  assert.equal(list.length, 1);
  assert.equal(list[0].root, alive);
});

test("a v1 registry (bare string[]) still loads after the upgrade", (t) => {
  const home = sandbox(t);
  const root = project(t, "zemory-v1-");
  writeFileSync(join(home, "projects.json"), JSON.stringify([root]));
  const list = listKnownProjects();
  assert.equal(list.length, 1);
  assert.equal(list[0].root, root);
});
