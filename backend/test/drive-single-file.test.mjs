// MỘT KHO CHÍNH TRÊN DRIVE, ghi bằng cách NỐI THÊM (user chốt 2026-08-12).
//
// Lối cũ (series theo máy) khiến mỗi máy đẻ một baseline riêng của cùng một kho đã hội tụ —
// đo trên Drive thật: 13 file / 2,9 GB, trong đó hai baseline 331 MB + 336 MB gần như trùng
// nội dung. Lối mới: đúng MỘT file, mỗi lượt sync nối thêm một khối nhỏ vào cuối.
//
// Bốn bất biến khoá ở đây, và cái thứ ba là cái đắt nhất nếu sai:
//   ① thư mục Drive luôn chỉ có MỘT file kho chính;
//   ② hai máy ghi xen kẽ thì KHÔNG bên nào mất tin;
//   ③ ghi thêm là GHI THÊM THẬT — byte của khối cũ không đổi (nếu viết lại cả file thì mỗi
//      lượt sync tốn nguyên 336 MB đường truyền, đúng thứ lối này sinh ra để tránh);
//   ④ không có gì mới ⇒ KHÔNG chạm file.

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { openMemory } from "../../dist/memory/db.js";
import { syncDrive, writeMemoryShareKey } from "../../dist/memory/share.js";
import { tempDir } from "./helpers.mjs";

function sandboxHome(t) {
  const home = tempDir(t, "zemory-single-home-");
  const save = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME, GLOBAL_MEMORY_DB: process.env.GLOBAL_MEMORY_DB };
  for (const k of ["HOME", "USERPROFILE", "APPDATA", "XDG_CONFIG_HOME"]) process.env[k] = home;
  delete process.env.GLOBAL_MEMORY_DB;
  t.after(() => { for (const k of Object.keys(save)) { if (save[k] === undefined) delete process.env[k]; else process.env[k] = save[k]; } });
}

let seq = 0;
function addMessages(dbPath, n, tag) {
  const db = openMemory(dbPath);
  try {
    const sid = `s${++seq}`;
    db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run(sid, "claude-code", "local", "C:\\proj", "PC");
    const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
    for (let i = 0; i < n; i++) ins.run(sid, `${sid}-${tag}-${i}`, "user", `tin ${tag} ${i} ${"x".repeat(40)}`, "2026-01-01T00:00:00Z");
  } finally {
    db.close();
  }
}
const msgCount = (dbPath) => { const db = openMemory(dbPath); try { return db.prepare("SELECT COUNT(*) c FROM messages").get().c; } finally { db.close(); } };
const encFiles = (dir) => readdirSync(dir).filter((f) => f.endsWith(".enc"));

function setup(t) {
  sandboxHome(t);
  const root = tempDir(t, "zemory-single-");
  const dir = join(root, "drive");
  mkdirSync(dir);
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);
  return { dir, keyPath, dbA: join(root, "a.db"), dbB: join(root, "b.db") };
}

test("hai máy ghi xen kẽ vào ĐÚNG MỘT file, không bên nào mất tin", async (t) => {
  const { dir, keyPath, dbA, dbB } = setup(t);

  addMessages(dbA, 5, "A1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  assert.deepEqual(encFiles(dir), ["global_memory.enc"], "sau lượt sync đầu chỉ được có MỘT file");

  // Máy B: chưa biết gì, phải nhận đủ 5 tin của A rồi mới đẩy phần của mình.
  addMessages(dbB, 3, "B1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" });
  assert.equal(msgCount(dbB), 8, "B phải có cả tin của A lẫn của mình");
  assert.deepEqual(encFiles(dir), ["global_memory.enc"], "B ghi vào CÙNG file, không đẻ file mới");

  // A sync lại: nhận phần của B.
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  assert.equal(msgCount(dbA), 8, "A phải nhận được tin của B từ chính file đó");

  // Vòng thứ hai — chỗ mà lối cũ đẻ thêm file cho mỗi máy.
  addMessages(dbA, 2, "A2");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" });
  assert.equal(msgCount(dbB), 10);
  assert.deepEqual(encFiles(dir), ["global_memory.enc"], "vẫn đúng một file sau 5 lượt sync");
});

test("NỐI THÊM thật: byte của khối cũ không đổi, file chỉ dài ra", async (t) => {
  const { dir, keyPath, dbA, dbB } = setup(t);
  const main = join(dir, "global_memory.enc");

  addMessages(dbA, 5, "A1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  const before = readFileSync(main);

  addMessages(dbB, 3, "B1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" });
  const after = readFileSync(main);

  assert.ok(after.length > before.length, "file phải DÀI RA");
  assert.deepEqual(
    after.subarray(0, before.length),
    before,
    "phần đầu phải NGUYÊN VẸN từng byte — viết lại cả file là mất trọn ý nghĩa của nối thêm",
  );
});

test("không có gì mới ⇒ KHÔNG chạm file", async (t) => {
  const { dir, keyPath, dbA } = setup(t);
  const main = join(dir, "global_memory.enc");

  addMessages(dbA, 4, "A1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  const size = statSync(main).size;

  const r = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  assert.equal(r.push.kind, "none", "không có tin mới thì không được ghi gì");
  assert.equal(statSync(main).size, size, "kích thước phải y nguyên");
});

test("máy khác đang ghi ⇒ TỪ CHỐI kèm câu chỉ đường, không ghi đè lặng lẽ", async (t) => {
  const { dir, keyPath, dbA, dbB } = setup(t);
  addMessages(dbA, 2, "A1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });

  // Giả lập máy khác đang giữ khoá (tươi).
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(dir, "global_memory.sync.lock"), JSON.stringify({ host: "MAY-KHAC", pid: 1, at: new Date().toISOString() }));

  addMessages(dbB, 2, "B1");
  await assert.rejects(
    () => syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" }),
    /MAY-KHAC/,
    "phải nói RÕ máy nào đang giữ, để người dùng biết chờ ai",
  );
});
