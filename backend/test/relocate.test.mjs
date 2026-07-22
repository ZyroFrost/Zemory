import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { relocateMemory, storageInfo, looksLikeCloudSync } from "../../dist/memory/relocate.js";
import { tempDir } from "./helpers.mjs";

/** Build a throwaway memory at <dir>/global_memory.db with N messages; return paths. */
function seed(t, n = 5) {
  const home = tempDir(t, "zloc-home-");
  const src = tempDir(t, "zloc-src-");
  const db = join(src, "global_memory.db");
  const conn = openMemory(db);
  conn.prepare("INSERT INTO sessions (id, source, origin) VALUES ('s1','test','local')").run();
  const ins = conn.prepare("INSERT INTO messages (session_id, uuid, role, content) VALUES ('s1',?,?,?)");
  for (let i = 0; i < n; i++) ins.run("u" + i, "user", "message " + i);
  conn.close();
  return { dir: src, db, pointer: join(home, "location.json"), home, pinned: false };
}

test("relocateMemory moves + verifies the DB, writes the pointer, keeps a .bak", (t) => {
  const paths = seed(t, 7);
  const dst = join(tempDir(t, "zloc-dst-"), "data");

  const r = relocateMemory(dst, { paths });

  assert.equal(r.pointerOnly, false);
  assert.equal(r.messages, 7, "row count carried across");
  assert.ok(existsSync(join(dst, "global_memory.db")), "DB exists at new dir");
  // pointer now points at the new dir
  const ptr = JSON.parse(readFileSync(paths.pointer, "utf8"));
  assert.equal(ptr.dataDir, resolve(dst));
  // old DB retained as a backup (non-destructive)
  assert.ok(r.backup && existsSync(r.backup), "old DB kept as .bak");
  assert.ok(!existsSync(paths.db), "old DB path vacated (renamed to .bak)");
  // the moved DB really holds the rows
  const moved = openMemory(join(dst, "global_memory.db"));
  assert.equal(moved.prepare("SELECT COUNT(*) c FROM messages").get().c, 7);
  moved.close();
});

test("relocateMemory refuses a cloud-synced target unless forced", (t) => {
  const paths = seed(t, 3);
  assert.ok(looksLikeCloudSync("G:\\My Drive\\zemory"));
  assert.ok(looksLikeCloudSync("C:\\Users\\x\\OneDrive\\zemory"));
  assert.ok(!looksLikeCloudSync("D:\\Zyro\\Tool\\Zemory\\data"));
  assert.throws(() => relocateMemory("G:\\My Drive\\zemory", { paths }), /cloud-synced/i);
  // old DB untouched after a refusal
  assert.ok(existsSync(paths.db));
});

test("relocateMemory with no DB yet only sets the pointer (pointerOnly)", (t) => {
  const home = tempDir(t, "zloc-home-");
  const src = tempDir(t, "zloc-src-");
  const paths = { dir: src, db: join(src, "global_memory.db"), pointer: join(home, "location.json"), home, pinned: false };
  const dst = join(tempDir(t, "zloc-dst-"), "data");

  const r = relocateMemory(dst, { paths });
  assert.equal(r.pointerOnly, true);
  assert.ok(existsSync(paths.pointer), "pointer written for next launch");
  assert.equal(JSON.parse(readFileSync(paths.pointer, "utf8")).dataDir, resolve(dst));
});

test("relocateMemory is disabled while GLOBAL_MEMORY_DB pins the location", (t) => {
  const paths = { ...seed(t, 2), pinned: true };
  assert.throws(() => relocateMemory(join(tempDir(t, "zloc-dst-"), "data"), { paths }), /pins the DB location/i);
});

test("storageInfo reports dir, source, cloud flag", (t) => {
  const paths = seed(t, 1);
  const info = storageInfo(paths);
  assert.equal(info.dir, paths.dir);
  assert.equal(info.exists, true);
  assert.equal(info.source, "default", "no pointer file yet → default");
  assert.equal(info.onCloud, false);
  assert.equal(info.pinnedByEnv, false);
});
