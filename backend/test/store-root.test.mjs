// Gốc KHO tách khỏi thư mục MÁY NÀY (plan/25 §1a).
//
// Hai nhóm ca, hai cách chạy — CỐ Ý, không phải tuỳ tiện:
//  · Nhóm A (phân giải con trỏ) chạy trong TIẾN TRÌNH CON với HOME giả, vì `db.ts` đọc
//    `~/.zemory/location.json` THẬT. Chạy in-process là vừa đọc nhầm kho của máy, vừa
//    xanh/đỏ theo trạng thái máy người chạy (bẫy đã trả giá 11/09).
//  · Nhóm B (dời kho) chạy in-process vì `relocateStore` nhận `paths` tiêm vào.
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { relocateMemory, relocateStore } from "../../dist/memory/relocate.js";
import { tempDir } from "./helpers.mjs";

const DIST = new URL("../../dist", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

/** Phân giải đường trong một tiến trình con có HOME giả mang đúng con trỏ này. */
function resolveWithPointer(t, pointer) {
  const home = tempDir(t, "zsr-home-");
  mkdirSync(join(home, ".zemory"), { recursive: true });
  writeFileSync(join(home, ".zemory", "location.json"), JSON.stringify(pointer), "utf8");
  const code =
    'const db = await import("file://" + process.env.Z_DIST + "/memory/db.js");\n' +
    "process.stdout.write(JSON.stringify({ machine: db.currentMemoryDir(), store: db.currentStoreRoot(), dbPath: db.currentMemoryDb() }));\n";
  const env = { ...process.env, Z_DIST: DIST, HOME: home, USERPROFILE: home };
  delete env.GLOBAL_MEMORY_DB; // env override thắng con trỏ — phải gỡ, nếu không mọi ca xanh giả
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8", env });
  if (r.status !== 0) throw new Error("con lỗi: " + String(r.stderr).slice(0, 600));
  return JSON.parse(r.stdout);
}

// ── Nhóm A — phân giải con trỏ ───────────────────────────────────────────────

test("con trỏ KHÔNG có memoryRoot ⇒ kho nằm trong thư mục máy (bố cục cũ chạy y như cũ)", (t) => {
  const dataDir = tempDir(t, "zsr-data-");
  const got = resolveWithPointer(t, { dataDir });
  assert.equal(got.machine, dataDir);
  assert.equal(got.store, dataDir, "vắng memoryRoot ⇒ hai gốc trùng nhau");
  assert.equal(got.dbPath, join(dataDir, "global_memory.db"));
});

test("có memoryRoot ⇒ kho đi theo nó, thư mục máy Ở LẠI dataDir", (t) => {
  const dataDir = tempDir(t, "zsr-data-");
  const memoryRoot = tempDir(t, "zsr-store-");
  const got = resolveWithPointer(t, { dataDir, memoryRoot });
  assert.equal(got.store, memoryRoot, "kho theo memoryRoot");
  assert.equal(got.machine, dataDir, "chìa/browser/models vẫn ở thư mục máy");
  assert.equal(got.dbPath, join(memoryRoot, "global_memory.db"));
});

test("CA ÂM — memoryRoot LỒNG trong dataDir ⇒ bỏ qua, giữ bố cục một-thư-mục", (t) => {
  const dataDir = tempDir(t, "zsr-data-");
  const nested = join(dataDir, "global-memory");
  mkdirSync(nested, { recursive: true });
  const got = resolveWithPointer(t, { dataDir, memoryRoot: nested });
  assert.equal(got.store, dataDir, "lồng nhau ⇒ 'cái gì đi' mơ hồ ⇒ từ chối tách");
  assert.equal(got.machine, dataDir);
});

// ── Nhóm B — dời kho ─────────────────────────────────────────────────────────

/** Thư mục máy có đủ cụm: kho + kênh + chìa + phiên trình duyệt + model + bản sao lưu. */
function seedSingleFolder(t, n = 4) {
  const home = tempDir(t, "zsr-h-");
  const dir = tempDir(t, "zsr-one-");
  const db = join(dir, "global_memory.db");
  const conn = openMemory(db);
  conn.prepare("INSERT INTO sessions (id, source, origin) VALUES ('s1','test','local')").run();
  const ins = conn.prepare("INSERT INTO messages (session_id, uuid, role, content) VALUES ('s1',?,?,?)");
  for (let i = 0; i < n; i++) ins.run("u" + i, "user", "tin " + i);
  conn.close();
  mkdirSync(join(dir, "files", "images"), { recursive: true });
  writeFileSync(join(dir, "files", "images", "a.png"), "anh", "utf8");
  mkdirSync(join(dir, "channel"), { recursive: true });
  writeFileSync(join(dir, "channel", "global_memory.enc"), "KHUC", "utf8");
  writeFileSync(join(dir, "share.key"), "chia-bi-mat", "utf8");
  mkdirSync(join(dir, "secrets"), { recursive: true });
  writeFileSync(join(dir, "secrets", "vault.enc"), "ket", "utf8");
  mkdirSync(join(dir, "browser", "chatgpt"), { recursive: true });
  writeFileSync(join(dir, "browser", "chatgpt", "Cookies"), "phien-dang-nhap", "utf8");
  mkdirSync(join(dir, "models"), { recursive: true });
  writeFileSync(join(dir, "models", "weight.onnx"), "w", "utf8");
  mkdirSync(join(dir, "backups"), { recursive: true });
  writeFileSync(join(dir, "backups", "b1.db"), "b", "utf8");
  return { dir, storeRoot: dir, db, pointer: join(home, "location.json"), home, pinned: false };
}

test("relocateStore dời ĐÚNG kho + kênh, và ghi memoryRoot", (t) => {
  const paths = seedSingleFolder(t, 4);
  const dst = join(tempDir(t, "zsr-dst-"), "global-memory");

  const r = relocateStore(dst, { paths });

  assert.equal(r.messages, 4, "số tin khớp trước-sau");
  assert.ok(existsSync(join(dst, "global_memory.db")), "kho sang chỗ mới");
  assert.ok(existsSync(join(dst, "channel", "global_memory.enc")), "khúc kênh đi theo kho");
  // files/ PHẢI đi cùng: nó là kho tệp (plan/25 §1). Bỏ sót nó thì lượt dời sau để lại
  // toàn bộ ảnh/tài liệu ở chỗ cũ mà không ai báo — đúng kiểu hỏng im lặng của copyCluster.
  assert.ok(existsSync(join(dst, "files", "images", "a.png")), "kho tệp đi theo kho");
  const moved = openMemory(join(dst, "global_memory.db"));
  assert.equal(moved.prepare("SELECT COUNT(*) c FROM messages").get().c, 4);
  moved.close();
  const ptr = JSON.parse(readFileSync(paths.pointer, "utf8"));
  assert.equal(ptr.memoryRoot, resolve(dst));
  assert.equal(ptr.dataDir, paths.dir, "dataDir GIỮ NGUYÊN — thư mục máy không dời");
  assert.ok(r.backup && existsSync(r.backup), "bản cũ giữ làm .bak, không xoá");
});

test("CA ÂM BẮT BUỘC — chìa · két · phiên trình duyệt · model · bản sao lưu KHÔNG đi theo kho", (t) => {
  const paths = seedSingleFolder(t, 3);
  const dst = join(tempDir(t, "zsr-dst-"), "global-memory");

  relocateStore(dst, { paths });

  for (const left of ["share.key", "secrets", "browser", "models", "backups"]) {
    assert.ok(existsSync(join(paths.dir, left)), `${left} phải Ở LẠI thư mục máy`);
    assert.ok(!existsSync(join(dst, left)), `${left} KHÔNG được nằm trong gốc kho (HP điều 14)`);
  }
  // Đo thẳng vào nội dung, không chỉ tên: một bản chép rỗng vẫn làm existsSync xanh.
  assert.equal(readFileSync(join(paths.dir, "share.key"), "utf8"), "chia-bi-mat");
});

test("CA ÂM — danh tính kênh đời cũ trong channel/ KHÔNG được theo kho sang máy khác", (t) => {
  const paths = seedSingleFolder(t, 2);
  // Bố cục đời trước: khoá riêng nằm ở <dir>/channel/identity. Đo trên máy thật 2026-09-14:
  // một lượt dời kho bê nguyên nó vào gốc kho ⇒ ai cầm kho dựng được máy giả danh.
  mkdirSync(join(paths.dir, "channel", "identity"), { recursive: true });
  writeFileSync(join(paths.dir, "channel", "identity", "device.key"), "khoa-rieng", "utf8");
  writeFileSync(join(paths.dir, "channel", "identity", "device.crt"), "chung-chi", "utf8");
  const dst = join(tempDir(t, "zsr-dst-"), "global-memory");

  relocateStore(dst, { paths });

  assert.ok(existsSync(join(dst, "channel")), "khúc kênh vẫn sang kho");
  assert.ok(!existsSync(join(dst, "channel", "identity")), "danh tính KHÔNG được nằm trong gốc kho");
  // Đo theo NỘI DUNG, không theo tên thư mục: một bản sao đặt tên khác vẫn là rò.
  const leaked = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (readFileSync(p, "utf8").includes("khoa-rieng")) leaked.push(p);
    }
  };
  walk(dst);
  assert.deepEqual(leaked, [], "không byte nào của khoá riêng còn trong gốc kho");
  assert.ok(existsSync(join(paths.dir, "secrets", "channel")), "danh tính lùi về secrets/ của máy này");
});

test("CA ÂM — đích LỒNG với thư mục máy ⇒ TỪ CHỐI, không đụng gì", (t) => {
  const paths = seedSingleFolder(t, 2);
  const dst = join(paths.dir, "global-memory");

  assert.throws(() => relocateStore(dst, { paths }), /overlaps this machine's folder/);
  assert.ok(existsSync(paths.db), "kho cũ còn nguyên");
  assert.ok(!existsSync(paths.pointer), "con trỏ chưa bị ghi");
});

test("relocateMemory GIỮ NGUYÊN memoryRoot đang có (không kéo kho về lại)", (t) => {
  const paths = seedSingleFolder(t, 2);
  const storeDst = join(tempDir(t, "zsr-store-"), "global-memory");
  relocateStore(storeDst, { paths });

  // Sau khi tách, dời tiếp THƯ MỤC MÁY sang chỗ khác.
  const after = { ...paths, storeRoot: storeDst, db: join(storeDst, "global_memory.db") };
  const machineDst = join(tempDir(t, "zsr-mach-"), "data");
  relocateMemory(machineDst, { paths: after });

  const ptr = JSON.parse(readFileSync(paths.pointer, "utf8"));
  assert.equal(ptr.dataDir, resolve(machineDst), "thư mục máy đã dời");
  assert.equal(ptr.memoryRoot, resolve(storeDst), "gốc kho KHÔNG bị lượt dời kia xoá mất");
});

test("CA ÂM — kho dời giữa chừng: tiến trình đang chạy phải THEO SANG, không đẻ kho rỗng ở đường cũ", (t) => {
  // Sự cố thật 2026-09-14: một daemon chạy từ TRƯỚC lượt dời vẫn ghi vào đường cũ, đẻ ra
  // `global_memory.db` 0 tin bên cạnh bản `.bak`. Gốc: `ingest.ts` lấy mặc định từ HẰNG
  // `MEMORY_DB` — đóng băng lúc nạp module — thay vì `currentMemoryDb()` đọc lại con trỏ.
  const home = tempDir(t, "zsr-h2-");
  mkdirSync(join(home, ".zemory"), { recursive: true });
  const oldDir = tempDir(t, "zsr-old-");
  const newDir = tempDir(t, "zsr-new-");
  const ptr = join(home, ".zemory", "location.json");
  writeFileSync(ptr, JSON.stringify({ dataDir: oldDir }), "utf8");

  // Con nạp module TRƯỚC, rồi con trỏ đổi, rồi mới hỏi đường — đúng thứ tự của sự cố.
  const code =
    'const db = await import("file://" + process.env.Z_DIST + "/memory/db.js");\n' +
    'const ing = await import("file://" + process.env.Z_DIST + "/memory/ingest.js");\n' +
    'const fs = await import("node:fs");\n' +
    "fs.writeFileSync(process.env.Z_PTR, JSON.stringify({ dataDir: process.env.Z_NEW }));\n" +
    "const info = ing.memoryInfo();\n" +
    "process.stdout.write(JSON.stringify({ resolved: db.currentMemoryDb(), used: info.dbPath }));\n";
  const env = { ...process.env, Z_DIST: DIST, HOME: home, USERPROFILE: home, Z_PTR: ptr, Z_NEW: newDir };
  delete env.GLOBAL_MEMORY_DB;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8", env });
  if (r.status !== 0) throw new Error("con lỗi: " + String(r.stderr).slice(0, 600));
  const got = JSON.parse(r.stdout);

  assert.equal(got.used, join(newDir, "global_memory.db"), "phải theo con trỏ MỚI");
  assert.ok(!existsSync(join(oldDir, "global_memory.db")), "KHÔNG được đẻ kho ở đường cũ");
});
