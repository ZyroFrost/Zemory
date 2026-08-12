// ĐƯỜNG CỨU HỘ PHẢI CHỞ CẢ CHỈ MỤC VECTOR.
//
// Lỗ tìm được 2026-08-11 (audit mặt ③): `salvageVectors` là hàm DUY NHẤT không-phải-kiểu trong
// 567 export mà KHÔNG AI GỌI. Nó không phải rác — `salvageMemory` tự ghi *"KHÔNG dựng lại
// FTS/vector ở đây — gọi …"*, tức cố ý để phần vector cho người gọi, mà `commands/memory.ts` gọi
// mỗi vế đầu rồi dừng, và câu dặn cuối bảo người dùng đi `memory embed --all`.
//
// Giá của việc đó KHÔNG nhỏ: kho này đã hỏng HAI LẦN, và dựng lại chỉ mục hiện là **~55 giờ máy**
// (43 giờ đợt 768 chiều + 12–16 giờ lớp tool). Đoạn code viết ra để tránh đúng chuyện đó thì nằm
// im — và không cổng nào kêu, vì "không gọi một hàm" chẳng làm gì đỏ cả.
//
// Test này KHÔNG giả lập hỏng ở tầng trang đĩa (không dựng được một cách tất định). Nó soi đúng
// thứ đã thiếu: **vế chở vector có được nối vào không**, và **nó có fail-open không** khi kho
// nguồn chưa từng nhúng.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const sqliteVec = require("sqlite-vec");

const { salvageMemory, salvageVectors, vectorDimsOf } = await import("../../dist/memory/salvage.js");
const { openMemory } = await import("../../dist/memory/db.js");

const DIMS = 4; // nhỏ cho nhanh — điều đang soi là ĐƯỜNG ĐI, không phải chất lượng vector

function scratch(t) {
  const dir = mkdtempSync(join(tmpdir(), "zemory-salvage-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * Kho nguồn dựng bằng CHÍNH schema của app (`openMemory`), không tự bịa bảng.
 *
 * Lần đầu tôi viết tay `CREATE TABLE` cho gọn và nó ĐỎ: `salvageMemory` dựng đích bằng
 * `openMemory` (schema thật), rồi chép theo TÊN CỘT của nguồn — nguồn bịa cột (`ts` thay vì
 * `timestamp`) là INSERT vào đích gãy ngay. Fixture lệch schema thật thì nó soi một cái không
 * tồn tại; dùng đúng schema là test bám vào thứ sản phẩm thật sự chạy.
 */
function seedStore(path, { withVectors = true } = {}) {
  openMemory(path).close(); // dựng schema thật rồi đóng, phần dưới mở lại bằng driver trần
  const db = new Database(path);
  db.prepare("INSERT INTO sessions(id,source,project_root,started_at) VALUES (?,?,?,?)").run(
    "s1", "claude-code", "/tmp/p", "2026-08-11",
  );
  const ins = db.prepare("INSERT INTO messages(id,session_id,uuid,role,content,timestamp) VALUES (?,?,?,?,?,?)");
  for (let i = 1; i <= 5; i++) ins.run(i, "s1", `u${i}`, "user", `noi dung ${i}`, "2026-08-11");

  if (withVectors) {
    sqliteVec.load(db);
    db.exec(`CREATE TABLE vec_config (dims INTEGER NOT NULL); INSERT INTO vec_config VALUES (${DIMS});`);
    db.exec(`CREATE VIRTUAL TABLE vec_chunks USING vec0(embedding float[${DIMS}])`);
    // `safeIntegers` + BigInt là BẮT BUỘC: better-sqlite3 mặc định trả số nguyên dạng `number`
    // (float64) và vec0 từ chối thẳng — *"Only integers are allowed for primary key values"*.
    // Đúng bẫy ③ mà chú thích của `salvageVectors` đã ghi; test này dẫm phải ngay lần chạy đầu,
    // tức chú thích đó chính xác và đáng giữ.
    db.defaultSafeIntegers(true);
    const put = db.prepare("INSERT INTO vec_chunks(rowid, embedding) VALUES (?, ?)");
    for (let i = 1; i <= 5; i++) put.run(BigInt(i), Buffer.from(new Float32Array([i, i + 1, i + 2, i + 3]).buffer));
    db.defaultSafeIntegers(false);
  }
  db.close();
}

function countVectors(path) {
  const db = new Database(path, { readonly: true });
  try {
    return db.prepare("SELECT COUNT(*) n FROM vec_chunks_rowids").get().n;
  } catch {
    return 0; // chưa có bảng vector nào
  } finally {
    db.close();
  }
}

test("vectorDimsOf đọc được số chiều, và trả 0 khi kho chưa từng nhúng", (t) => {
  const dir = scratch(t);
  const withVec = join(dir, "co-vector.db");
  const noVec = join(dir, "khong-vector.db");
  seedStore(withVec);
  seedStore(noVec, { withVectors: false });

  assert.equal(vectorDimsOf(withVec), DIMS);
  assert.equal(vectorDimsOf(noVec), 0, "không có vec_config ⇒ 0, KHÔNG được ném lỗi");
  assert.equal(vectorDimsOf(join(dir, "khong-ton-tai.db")), 0, "file không có ⇒ 0 (fail-open)");
});

test("cứu hộ CHỞ ĐƯỢC chỉ mục vector — đây là vế trước 2026-08-11 không ai gọi", (t) => {
  const dir = scratch(t);
  const src = join(dir, "nguon.db");
  const out = join(dir, "cuu.db");
  seedStore(src);
  assert.equal(countVectors(src), 5, "kho nguồn phải có 5 vector để phép thử có nghĩa");

  const r = salvageMemory(src, out);
  assert.ok(r.copied >= 5, `phải vét được dòng nguồn, copied=${r.copied}`);
  assert.equal(countVectors(out), 0, "salvageMemory CỐ Ý không chở vector — nếu ca này đỏ thì giả định của test đã cũ");

  const v = salvageVectors(src, out, vectorDimsOf(src));
  assert.equal(v.copied, 5, `phải chép đủ 5 vector, được ${v.copied} (mất ${v.lost})`);
  assert.equal(countVectors(out), 5, "kho đã cứu phải MANG THEO chỉ mục vector");
});

test("kho nguồn KHÔNG có vector: cứu hộ vẫn chạy, không ném lỗi", (t) => {
  const dir = scratch(t);
  const src = join(dir, "tron.db");
  const out = join(dir, "cuu2.db");
  seedStore(src, { withVectors: false });

  const r = salvageMemory(src, out);
  assert.ok(existsSync(out) && r.copied >= 5, "vẫn phải cứu được phần nguồn");
  assert.equal(vectorDimsOf(src), 0, "dims=0 ⇒ tầng lệnh bỏ qua bước vector thay vì gọi bừa");
});
