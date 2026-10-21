// The store read cache of `zemory sync` (store.ts withStoreReadCache, measured 2026-10-21: a region sync spent 181 of
// 369 s reading the same store parts again for every repo). A part below the cached folder is read once for the length of
// the call; a part anywhere else (the repo copies a sync writes) is always read fresh; nothing is cached after the call.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { readPart, readPartFiles, withStoreReadCache } from "../../dist/docs/store.js";
import { tempDir } from "./helpers.mjs";

const SKILLS = "03_SKILLS";

function skill(dir, version, body = "steps") {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nid: Skill_T\nname: t\nversion: ${version}\n---\n\n${body}\n`);
}

test("inside the cache a store part is read once; a repo part and a read after the call are fresh", (t) => {
  const root = tempDir(t, "zemory-store-cache-");
  const base = join(root, "tpl");
  const inStore = join(base, "store", SKILLS, "Skill_T");
  const inRepo = join(root, "repo", "harness", SKILLS, "Skill_T");
  skill(inStore, 1);
  skill(inRepo, 1);

  withStoreReadCache(() => {
    assert.equal(String(readPart(inStore, SKILLS).meta.version), "1");
    assert.equal(readPartFiles(inStore).get("SKILL.md").includes("version: 1"), true);
    skill(inStore, 2, "changed");
    skill(inRepo, 2, "changed");
    // the store part keeps what was read first: nothing in a sync writes there
    assert.equal(String(readPart(inStore, SKILLS).meta.version), "1");
    assert.equal(readPartFiles(inStore).get("SKILL.md").includes("version: 1"), true);
    // the repo copy is read fresh: sync writes it and reads it back in the same call
    assert.equal(String(readPart(inRepo, SKILLS).meta.version), "2");
    assert.equal(readPartFiles(inRepo).get("SKILL.md").includes("changed"), true);
  }, base);

  // once the call is over the store is read fresh again
  assert.equal(String(readPart(inStore, SKILLS).meta.version), "2");
  assert.equal(readPartFiles(inStore).get("SKILL.md").includes("changed"), true);
});

test("a cached file map is a copy: a caller changing it does not change the next read", (t) => {
  const root = tempDir(t, "zemory-store-cache-");
  const base = join(root, "tpl");
  const inStore = join(base, "store", SKILLS, "Skill_T");
  skill(inStore, 1);
  withStoreReadCache(() => {
    readPartFiles(inStore).delete("SKILL.md");
    assert.equal(readPartFiles(inStore).has("SKILL.md"), true);
  }, base);
});

test("a folder that only starts with the cached folder's name is not inside it", (t) => {
  const root = tempDir(t, "zemory-store-cache-");
  const base = join(root, "tpl");
  const beside = join(root, "tpl_old", SKILLS, "Skill_T");
  skill(beside, 1);
  withStoreReadCache(() => {
    readPart(beside, SKILLS);
    skill(beside, 2);
    assert.equal(String(readPart(beside, SKILLS).meta.version), "2");
  }, base);
});
