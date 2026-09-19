// Known-projects registry. These lock the two failures that made the tab bar
// unusable (06_CHANGES 2026-07-20): test scaffolds registering themselves, and
// the same repo appearing twice because the shell spelled the drive differently.

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import {
  deadProjectEntries,
  forgetProject,
  isScratchRoot,
  isSelfRoot,
  listKnownProjects,
  pinProject,
  pruneDeadProjects,
  rememberProject,
  selfRepoRoot,
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

// zemory's OWN repo is pinned for good and its pin button is locked (user rule 2026-09-17:
// "zemory phải luôn nằm ở đầu và nút ghim nó khóa"). The lock lives in the API, not just the
// button — every surface can reach /pin-project, so a disabled button alone guards nothing.

test("self repo is recognised, and an ordinary project is NOT", (t) => {
  sandbox(t);
  const self = selfRepoRoot();
  assert.ok(self, "selfRepoRoot must resolve when running from the built dist/");
  assert.equal(isSelfRoot(self), true);
  // Same path spelled differently must still match (registry key rules).
  assert.equal(isSelfRoot(self.toLowerCase()), true);
  assert.equal(isSelfRoot(project(t, "zemory-other-")), false);
});

test("the self repo's pin is LOCKED: unpinning is refused and the file does not change", (t) => {
  const home = sandbox(t);
  const self = selfRepoRoot();
  writeFileSync(join(home, "projects.json"), JSON.stringify({ version: 2, projects: [{ root: self, pinned: true }] }));
  assert.equal(pinProject(self, false), false, "unpinning zemory's own repo must be refused");
  const after = JSON.parse(readFileSync(join(home, "projects.json"), "utf8"));
  assert.equal(after.projects[0].pinned, true, "registry must be untouched");
});

test("the self repo comes back pinned + locked and FIRST, even when the file says otherwise", (t) => {
  const home = sandbox(t);
  const self = selfRepoRoot();
  const other = project(t, "zemory-recent-");
  // Worst case for ordering: self is stale AND flagged unpinned, the other one is pinned + fresh.
  writeFileSync(join(home, "projects.json"), JSON.stringify({ version: 2, projects: [
    { root: other, pinned: true, lastSeen: "2099-01-01T00:00:00.000Z" },
    { root: self, pinned: false, lastSeen: "2000-01-01T00:00:00.000Z" },
  ] }));
  const list = listKnownProjects();
  assert.equal(list[0].root, self, "zemory's own repo must be first");
  assert.equal(list[0].pinned, true, "and pinned regardless of the flag on disk");
  assert.equal(list[0].locked, true);
});

test("THE REVERSE: a pinned ordinary project is NOT locked and stays unpinnable", (t) => {
  const home = sandbox(t);
  const other = project(t, "zemory-plain-");
  writeFileSync(join(home, "projects.json"), JSON.stringify({ version: 2, projects: [{ root: other, pinned: true }] }));
  const [entry] = listKnownProjects();
  assert.equal(entry.locked, undefined, "only zemory's own repo may be locked");
  assert.equal(pinProject(other, false), true, "an ordinary pin must still be removable");
  assert.equal(listKnownProjects()[0].pinned, false);
});

test("bản nháp 'Dọn dự án đã mất' đếm ĐÚNG cái lượt chạy thật sẽ gỡ — kể cả mục mà danh sách đã giấu", (t) => {
  // Ca thật 2026-09-19: repo `SasinAuto` đổi tên, folder cũ mất, mục sổ nằm lại. `listKnownProjects`
  // lọc bỏ nó (đúng), nhưng bản nháp lại đếm trên chính danh sách đã lọc đó ⇒ luôn ra 0, trong khi
  // `pruneDeadProjects` đọc sổ thô và có xoá. Hộp xác nhận nói "không có gì", nút bấm thì làm việc.
  const home = sandbox(t);
  const live = project(t, "zemory-live-");
  rememberProject(live);
  const gone = join(home, "repo-da-doi-ten");
  writeFileSync(
    process.env.ZEMORY_REGISTRY_FILE,
    JSON.stringify({ version: 2, projects: [{ root: live }, { root: gone }] }),
  );
  assert.ok(!listKnownProjects().some((k) => k.root === gone), "danh sách hiển thị phải giấu mục chết");
  assert.deepEqual(deadProjectEntries(), [gone], "bản nháp phải THẤY mục mà danh sách đã giấu");
  const preview = deadProjectEntries().length;
  assert.equal(pruneDeadProjects(), preview, "nháp và thật phải cùng một con số");
  assert.deepEqual(deadProjectEntries(), [], "chạy xong thì không còn mục chết");
});
