import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

test("relocate carries the WHOLE data cluster — secrets included — and vacates the old folder", (t) => {
  const paths = seed(t, 4);
  const dst = join(tempDir(t, "zloc-dst-"), "data");

  // Cụm thật của một kho đang sống (đo trên data/ ngày 2026-08-06).
  writeFileSync(join(paths.dir, "share.key"), "deadbeef");
  writeFileSync(join(paths.dir, "projects.json"), "{}");
  writeFileSync(join(paths.dir, "config.json"), "{}");
  for (const d of ["secrets", "backups", "browser", "imports", "logs", "cockpit", "context-guard", "models"]) {
    mkdirSync(join(paths.dir, d), { recursive: true });
    writeFileSync(join(paths.dir, d, "keep.txt"), d);
  }
  // …và những thứ CỐ Ý ở lại.
  writeFileSync(join(paths.dir, "global_memory.HONG-20260804-172300.db"), "corrupt");
  mkdirSync(join(paths.dir, "corrupt-20260803-091106"), { recursive: true });
  writeFileSync(join(paths.dir, "cli-write.lock"), "{}");

  const r = relocateMemory(dst, { paths });

  for (const name of ["share.key", "secrets", "projects.json", "config.json", "backups", "browser", "imports", "logs", "cockpit", "context-guard", "models"]) {
    assert.ok(existsSync(join(dst, name)), `${name} phải sang kho mới`);
    assert.ok(!existsSync(join(paths.dir, name)), `${name} KHÔNG được ở lại chỗ cũ`);
  }
  // Chìa là thứ quan trọng nhất: nội dung phải nguyên vẹn, không chỉ "có file".
  assert.equal(readFileSync(join(dst, "share.key"), "utf8"), "deadbeef");
  assert.equal(readFileSync(join(dst, "secrets", "keep.txt"), "utf8"), "secrets");
  // Vật chứng + khoá ôi thì ở lại, và phải được BÁO chứ không im.
  assert.ok(existsSync(join(paths.dir, "corrupt-20260803-091106")), "vật chứng giữ tại chỗ cũ");
  assert.ok(!existsSync(join(dst, "cli-write.lock")), "khoá runtime không đi theo");
  assert.ok(r.cluster.left.includes("cli-write.lock"));
  assert.ok(r.cluster.left.includes("corrupt-20260803-091106"));
  assert.ok(r.cluster.left.includes("global_memory.HONG-20260804-172300.db"));
  assert.equal(r.cluster.failed.length, 0);
  assert.ok(r.configMoved && r.modelsMoved, "hai cờ cũ vẫn đúng nghĩa");
});

test("relocate không chở nổi BÍ MẬT thì HUỶ, không dời nửa vời", (t) => {
  const paths = seed(t, 3);
  const dst = join(tempDir(t, "zloc-dst-"), "data");
  writeFileSync(join(paths.dir, "share.key"), "deadbeef");
  // Chặn đường chép: đích đã có một THƯ MỤC tên `share.key` ⇒ cpSync file→dir ném lỗi.
  // (`existsSync` ở copyCluster bỏ qua tên đã tồn tại, nên phải ép hỏng ở tầng chép.)
  mkdirSync(join(dst, "share.key", "busy"), { recursive: true });

  assert.throws(() => relocateMemory(dst, { paths, force: true }), /share\.key|secret/i);
  // Không có gì đổi: kho cũ còn nguyên, con trỏ chưa lật.
  assert.ok(existsSync(paths.db), "DB cũ còn nguyên");
  assert.ok(existsSync(join(paths.dir, "share.key")), "chìa vẫn ở chỗ cũ");
  assert.ok(!existsSync(paths.pointer), "con trỏ CHƯA lật");
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
