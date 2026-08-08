// BA LUỒNG FTS (word-AND · trigram-theo-từ · word-OR) — khoá CẢ HAI loại độ dài truy vấn.
//
// Vì sao test này tồn tại (đo 2026-08-08, corpus 56 câu có nhãn): bản cũ chỉ có 2 luồng và
// cả hai đòi hỏi quá chặt với CÂU HỎI DÀI — luồng trigram khớp nguyên cụm cho **56/56 câu ra
// 0 kết quả**, luồng word-AND để lại trung bình 5,4 ứng viên trên kho 215k tin. Recall âm
// thầm mất mà không cổng nào đỏ, vì fail-open trả mảng rỗng chứ không ném.
//
// Bẫy đã suýt dính: nhìn RIÊNG bảng câu-dài thì BỎ luồng AND còn cho số đẹp hơn (@10 41% so
// với 38%). Nhưng đo trên truy vấn NGẮN 2–3 từ khoá — lối dùng phổ biến nhất — bỏ AND kéo
// `tool_result` @1 từ 75% xuống 63%. Nên bất biến ở đây là HAI CHIỀU: dài phải ra kết quả,
// ngắn phải giữ độ chính xác. Sửa xếp hạng mà làm đỏ một trong hai ⇒ đã đánh đổi sai.

import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { search } from "../../dist/memory/search.js";
import { tempDir } from "./helpers.mjs";

/** Kho giả: 1 tin đích + nhiễu cùng chủ đề, đủ để phân biệt "pool rỗng" với "xếp sai". */
function store(t) {
  const dir = tempDir(t, "zemory-lanes-");
  const dbPath = join(dir, "m.db");
  mkdirSync(dir, { recursive: true });
  const db = openMemory(dbPath);
  const sid = "s-lanes";
  db.prepare("INSERT INTO sessions (id, source, host, project_root, started_at, ended_at, title) VALUES (?,?,?,?,?,?,?)").run(
    sid, "claude-code", "h", "D:/x", "2026-08-01T00:00:00Z", "2026-08-01T01:00:00Z", "t",
  );
  const ins = db.prepare(
    "INSERT INTO messages (session_id, uuid, role, content, timestamp, tool_name) VALUES (?,?,?,?,?,?)",
  );
  // Tin ĐÍCH: chứa hai định danh hiếm.
  ins.run(sid, "u-gold", "assistant", "khoi dong lai container cua music_video_flow roi kiem tra trang thai bang docker ps", "2026-08-01T00:10:00Z", null);
  // Nhiễu: cùng chủ đề, KHÔNG chứa đủ mọi từ của câu hỏi dài.
  for (let i = 0; i < 30; i++) {
    ins.run(sid, `u-n${i}`, "assistant", `ghi chu so ${i} ve docker va container noi chung, khong lien quan music_video_flow`, "2026-08-01T00:20:00Z", null);
  }
  db.close();
  return dbPath;
}

const goldId = (dbPath) => {
  const db = openMemory(dbPath);
  try { return db.prepare("SELECT id FROM messages WHERE uuid='u-gold'").get().id; } finally { db.close(); }
};

test("truy vấn DÀI tự nhiên vẫn RA kết quả (luồng cũ cho 0 vì đòi khớp cả câu)", (t) => {
  const dbPath = store(t);
  const gold = goldId(dbPath);
  const q = "lenh nao da khoi dong lai container cua music_video_flow va kiem tra xem no chay chua the nao";

  const hits = search(q, { dbPath, all: true, limit: 20 });

  assert.ok(hits.length > 0, "câu hỏi dài mà trả 0 kết quả = đúng lỗi đã sửa (pool bị AND/cụm cắt sạch)");
  assert.ok(hits.some((h) => h.id === gold), `phải tìm ra tin đích; nhận ${hits.length} kết quả`);
});

test("truy vấn NGẮN 2–3 từ khoá vẫn CHÍNH XÁC (không được hi sinh cho câu dài)", (t) => {
  const dbPath = store(t);
  const gold = goldId(dbPath);

  const hits = search("music_video_flow trang thai", { dbPath, all: true, limit: 10 });

  assert.ok(hits.length > 0, "truy vấn ngắn phải ra kết quả");
  assert.equal(hits[0].id, gold, "tin đích phải đứng ĐẦU với truy vấn ngắn — đây là thế mạnh không được đánh đổi");
});

test("từ không có trong kho ⇒ vẫn im lặng trả rỗng, KHÔNG ném (fail-open giữ nguyên)", (t) => {
  const dbPath = store(t);
  assert.doesNotThrow(() => search("zzzkhongtontaizzz", { dbPath, all: true }));
  assert.deepEqual(search("zzzkhongtontaizzz", { dbPath, all: true }), []);
});
