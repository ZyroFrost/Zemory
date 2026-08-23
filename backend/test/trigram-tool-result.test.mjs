// Lane trigram phải phủ CẢ `tool_result` (migration v22, đảo v17).
//
// v17 cắt `tool_result` khỏi trigram để tiết kiệm đĩa. Đo lại 2026-08-23 trên corpus 108 nhãn:
// lớp đó là lớp YẾU NHẤT (`@10` 20% · MRR 0,060) trong khi chiếm ~31% kho, và nó chỉ còn HAI
// luồng. Cấp cho nó luồng thứ ba: `@1` 0→12% · `@10` 20→28% · MRR 0,060→**0,167**, prose y
// nguyên. Giá: +262 MB đĩa, +23% độ trễ. User chốt đánh đổi (HP điều 12).
//
// Bất biến ĐÁNG canh KHÔNG phải "đã nạp bù xong" — nạp bù chỉ xử phần CŨ, chạy một lần rồi thôi.
// Thứ hỏng âm thầm được là **tin MỚI**: chỉ cần một điều kiện `WHEN` sót lại trong trigger là
// mọi `tool_result` từ giờ trở đi lại rơi khỏi trigram, không lệnh nào báo, và recall của lớp
// đó tụt dần theo thời gian mà không ai thấy. Đó là ca các test này soi.

import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { tempDir } from "./helpers.mjs";

// `tempDir` của helpers: tự dọn ở t.after — khỏi tự chế cặp mkdtemp+rmSync thứ n.
function scratch(t) {
  const dir = tempDir(t, "ztri-");
  const db = openMemory(join(dir, "t.db"));
  db.prepare("INSERT INTO sessions (id, source, started_at) VALUES ('s1','test','2026-01-01T00:00:00Z')").run();
  let n = 0;
  const add = (content, toolName = null) => {
    n += 1;
    db.prepare(
      "INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp) VALUES ('s1', ?, 'user', ?, ?, '2026-01-01T00:00:00Z')",
    ).run("u" + n, content, toolName);
    return db.prepare("SELECT last_insert_rowid() AS id").get().id;
  };
  const triHits = (frag) =>
    db.prepare("SELECT COUNT(*) c FROM messages_fts_tri WHERE messages_fts_tri MATCH ?").get('"' + frag + '"').c;
  return { db, add, triHits, cleanup: () => db.close() };
}

test("tin tool_result MỚI đi thẳng vào trigram (trigger INSERT không còn loại nó)", (t) => {
  const s = scratch(t);
  try {
    s.add("[tool_result] khungcanhdacbiet_abc mot doan dump dai");
    assert.equal(s.triHits("khungcanhdacbiet"), 1, "tool_result mới phải tìm được bằng trigram — đây là ca hỏng âm thầm");
  } finally {
    s.cleanup();
  }
});

test("văn xuôi và tool_use vẫn nguyên trong trigram (không đổi hành vi cũ)", (t) => {
  const s = scratch(t);
  try {
    s.add("mot doan van xuoi chua tuvanxuoi_xyz binh thuong");
    s.add("chay lenh voi thamso_qrs", "Bash");
    assert.equal(s.triHits("tuvanxuoi"), 1, "prose phải còn — v22 chỉ THÊM, không được đụng lớp khác");
    assert.equal(s.triHits("thamso"), 1, "tool_use (v21) phải còn");
  } finally {
    s.cleanup();
  }
});

test("UPDATE một tool_result: posting cũ gỡ, posting mới vào — không nhân đôi, không mất", (t) => {
  // Ca này từng làm prose rơi khỏi trigram VĨNH VIỄN (bug thứ tự trigger, vá 2026-08-12).
  // `redact()` chạy UPDATE trên tin thật, nên đây là đường đi hằng ngày chứ không phải ca hiếm.
  const s = scratch(t);
  try {
    const id = s.add("[tool_result] chuoicu_aaa noi dung ban dau");
    s.db.prepare("UPDATE messages SET content = ? WHERE id = ?").run("[tool_result] chuoimoi_bbb noi dung sau", id);
    assert.equal(s.triHits("chuoicu"), 0, "posting CŨ phải bị gỡ");
    assert.equal(s.triHits("chuoimoi"), 1, "posting MỚI phải có, đúng MỘT bản");
  } finally {
    s.cleanup();
  }
});

test("DELETE một tool_result gỡ posting khỏi trigram (không để lại rác)", (t) => {
  const s = scratch(t);
  try {
    const id = s.add("[tool_result] sapxoa_ccc noi dung");
    assert.equal(s.triHits("sapxoa"), 1);
    s.db.prepare("DELETE FROM messages WHERE id = ?").run(id);
    assert.equal(s.triHits("sapxoa"), 0, "xoá tin mà posting còn = kho FTS trỏ vào hàng đã chết");
  } finally {
    s.cleanup();
  }
});

test("TỰ KIỂM phép đo — trigram phải THẤY được sự khác biệt, 0 hit không được đọc thành 'sạch'", (t) => {
  // Không có ca này thì mọi assert `=== 0` ở trên vẫn xanh khi bảng trigram rỗng hoặc MATCH hỏng.
  const s = scratch(t);
  try {
    s.add("[tool_result] cotontai_ddd");
    assert.equal(s.triHits("cotontai"), 1, "phép đo phải bắt được thứ CÓ");
    assert.equal(s.triHits("khongtontai_zzz"), 0, "và phải trả 0 cho thứ KHÔNG có");
  } finally {
    s.cleanup();
  }
});
