// Ba bảng vector phải KHỚP NHAU sau khi embed.
//
// Bối cảnh: `vec_map` từng được ghi TRƯỚC vector, `vec_hash` ghi SAU, ba lệnh là ba autocommit
// RỜI ⇒ khe giữa chúng để lại map trỏ vào vector chưa có. Đã sửa: bọc chung một giao dịch.
//
// ⚠ ĐÍNH CHÍNH (2026-08-03e): tôi từng viết ở đây rằng sự cố hỏng DB 1 GB là bằng chứng cho
// lỗi này, viện dẫn "vec_hash 119.784 vs vec_chunks 142.840". SAI — `vec_hash` điền dần theo
// THIẾT KẾ nên chênh đó là bình thường. Vật chứng cho thấy toàn bộ bảng vector còn LÀNH; hỏng
// nằm ở cây bóng FTS5, với con trỏ vượt cuối file. Sửa này đúng về nguyên tắc, không phải do
// sự cố đó chứng minh.
//
// ⚠ **PHÉP KIỂM NÀY CHỨNG MINH ĐƯỢC GÌ — và KHÔNG chứng minh được gì.** Tôi đã thử đột biến
// (gỡ `db.transaction` ra) và nó **VẪN XANH**. Đúng như vậy: trong MỘT tiến trình không bị
// ngắt, hai lệnh rời vẫn thành công cả hai nên không sinh dòng mồ côi. Muốn phân biệt phải
// ngắt đúng khe giữa hai lệnh — cần hai tiến trình tranh chấp hoặc kill giữa chừng, cả hai
// đều không tất định nên KHÔNG đưa vào cổng.
// ⇒ Giữ nó như một CHỐT HỒI QUY cho lớp lỗi tất định (ai đó đổi thứ tự ghi, bỏ sót dọn map
// cũ, hay ghi map cho chunk không bao giờ được embed) — chứ ĐỪNG đọc nó là bằng chứng
// nguyên tử. Bằng chứng cho tính nguyên tử nằm ở chỗ code có bọc giao dịch, không ở đây.

import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { embedPending, vecConnect } from "../../dist/memory/vectors.js";
import { tempDir } from "./helpers.mjs";

/** Kho nhỏ NHẤT có thể mà vẫn đi qua đường chunk: 2 tin dài + 2 tin ngắn. Mỗi lần gọi model
 *  là vài giây nên corpus phải bé — phép kiểm này chạy trong cổng, không phải bench. */
function seed(dir, longOnes = 2, shortOnes = 2) {
  const p = join(dir, "global_memory.db");
  const db = openMemory(p);
  db.prepare("INSERT INTO sessions (id, source, title, started_at, ended_at, message_count) VALUES (?,?,?,?,?,?)").run(
    "s1",
    "claude-code",
    "phiên thử",
    "2026-01-01",
    "2026-01-01",
    longOnes + shortOnes,
  );
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  for (let i = 0; i < shortOnes; i++) ins.run("s1", `s${i}`, "user", `tin ngắn số ${i}`, "2026-01-01T00:00:00Z");
  // > CHUNK_CHARS (6000) ⇒ chắc chắn tách chunk ⇒ chắc chắn sinh dòng vec_map.
  for (let i = 0; i < longOnes; i++) ins.run("s1", `l${i}`, "assistant", `đoạn dài số ${i} `.repeat(500), "2026-01-01T00:00:00Z");
  db.close();
  return p;
}

/** Số dòng map/hash trỏ tới rowid KHÔNG có trong vec_chunks. Phải luôn bằng 0. */
function orphans(p) {
  const db = vecConnect(p);
  try {
    return {
      map: db.prepare("SELECT COUNT(*) c FROM vec_map m WHERE NOT EXISTS (SELECT 1 FROM vec_chunks v WHERE v.rowid = m.rowid)").get().c,
      hash: db.prepare("SELECT COUNT(*) c FROM vec_hash h WHERE NOT EXISTS (SELECT 1 FROM vec_chunks v WHERE v.rowid = h.rowid)").get().c,
    };
  } finally {
    db.close();
  }
}

test("embed xong: không dòng vec_map/vec_hash nào trỏ vào vector không tồn tại", async (t) => {
  const dir = tempDir(t, "zemory-vecatomic-");
  const p = seed(dir);

  const r = await embedPending({ dbPath: p, limit: 50 });
  assert.ok(r.embedded > 0, `phải embed được gì đó, thấy ${r.embedded}`);

  const o = orphans(p);
  assert.equal(o.map, 0, `${o.map} dòng vec_map trỏ vào vector không có`);
  assert.equal(o.hash, 0, `${o.hash} dòng vec_hash trỏ vào vector không có`);
});

test("lượt dedup (chép lại, không gọi model) cũng không để lại dòng mồ côi", async (t) => {
  const dir = tempDir(t, "zemory-vecatomic-");
  const p = seed(dir, 1, 1);
  await embedPending({ dbPath: p, limit: 50 });

  // Tin TRÙNG NGUYÊN VĂN tin dài đã embed ⇒ ép đi đường sao chép, đường này cũng ghi vec_map.
  const w = openMemory(p);
  w.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run(
    "s1",
    "dup0",
    "user",
    `đoạn dài số ${0} `.repeat(500),
    "2026-01-02T00:00:00Z",
  );
  w.close();

  const r2 = await embedPending({ dbPath: p, limit: 50 });
  assert.ok(r2.deduped > 0, `phải có bản sao dedup để thử đúng đường đó, thấy ${r2.deduped}`);
  assert.equal(orphans(p).map, 0, "còn dòng vec_map mồ côi sau lượt dedup");
});
