// v16: lane TRIGRAM chỉ index tin NGƯỜI/MODEL, bỏ tool-dump.
//
// Lý do bằng số (dbstat sau khi gỡ clip): `messages_fts_tri_data` = 435,4 MB = **42% cả DB**,
// gấp đôi text gốc 213,4 MB. Trigram băm mọi chuỗi 3 ký tự — hữu ích cho văn xuôi tiếng Việt,
// gần như vô dụng trên JSON/code dump.
//
// ⚠ CÁCH ĐO: KHÔNG dùng `SELECT COUNT(*) FROM messages_fts_tri` — đây là bảng FTS
// EXTERNAL-CONTENT, truy vấn không-MATCH đọc XUYÊN xuống `messages` nên luôn trả về số hàng
// của bảng gốc (bản test đầu của tôi sai đúng chỗ này: ra 3 và tưởng trigger hỏng).
// Chỉ `MATCH` mới thật sự hỏi postings của index.
//
// Bất biến khoá lại: `messages` không mất gì · lane WORD index tất cả · lane TRIGRAM bỏ
// tool-dump · hàng đổi phía (tool_name null ⇄ không-null) không để posting mồ côi.

import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { tempDir } from "./helpers.mjs";

const PROSE_1 = "xin chào tôi cần sửa cấu hình mạng";
const PROSE_2 = "đã sửa xong cấu hình";
const TOOL = '[tool_result] {"khoaduynhat":"mangluoi","x":1}';
// tool_result nam trong luot USER va tool_name = NULL — chinh la ca v16 bo sot (vá o v17).
const TOOL_NO_NAME = '[tool_result] {"khongcotoolname":"vandumpto"}';

function seed(t) {
  const db = openMemory(join(tempDir(t, "zemory-tri-"), "m.db"));
  db.prepare("INSERT INTO sessions (id, source, origin, host) VALUES ('s1','claude-code','local','h')").run();
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, tool_name) VALUES ('s1',?,?,?,?)");
  ins.run("u1", "user", PROSE_1, null);
  ins.run("u2", "assistant", PROSE_2, null);
  ins.run("u3", "user", TOOL, "Bash");
  ins.run("u4", "user", TOOL_NO_NAME, null); // tool_name NULL nhung van la dump
  return db;
}
/** Số hit THẬT trong index (chỉ MATCH mới hỏi postings). */
const hits = (db, table, term) =>
  db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${table} MATCH ?`).get(term).n;

test("messages giữ ĐỦ 3 hàng — lọc chỉ ở lớp dẫn xuất", (t) => {
  const db = seed(t);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM messages").get().n, 4);
  db.close();
});

test("lane WORD index TẤT CẢ — tool-dump vẫn tìm được bằng từ khoá", (t) => {
  const db = seed(t);
  assert.equal(hits(db, "messages_fts", "khoaduynhat"), 1, "token trong tool-dump phải tìm được ở lane word");
  assert.equal(hits(db, "messages_fts", "cấu"), 2, "prose vẫn đủ ở lane word");
  db.close();
});

test("lane TRIGRAM BỎ tool-dump", (t) => {
  const db = seed(t);
  assert.equal(hits(db, "messages_fts_tri", "oaduynha"), 0, "chuỗi-con của tool-dump KHÔNG được có trong trigram");
  assert.equal(hits(db, "messages_fts_tri", "angluo"), 0, "kể cả chuỗi khác trong cùng dump");
  // v17: dump có tool_name NULL cũng phải bị loại (v16 bỏ sót đúng ca này)
  assert.equal(hits(db, "messages_fts_tri", "hongcotoolname"), 0, "tool_result dù tool_name NULL vẫn phải ngoài trigram");
  assert.equal(hits(db, "messages_fts", "khongcotoolname"), 1, "nhưng lane word vẫn phải có");
  db.close();
});

test("trigram vẫn tìm chuỗi-con trên prose (không hỏng công dụng chính)", (t) => {
  const db = seed(t);
  assert.equal(hits(db, "messages_fts_tri", "ấu hìn"), 2, "chuỗi-con giữa từ vẫn khớp cả 2 prose");
  assert.equal(hits(db, "messages_fts_tri", "in chà"), 1);
  db.close();
});

test("DELETE hàng prose thì gỡ khỏi trigram (không để posting mồ côi)", (t) => {
  const db = seed(t);
  db.prepare("DELETE FROM messages WHERE uuid='u1'").run();
  assert.equal(hits(db, "messages_fts_tri", "in chà"), 0, "postings của hàng đã xoá phải biến mất");
  assert.equal(hits(db, "messages_fts_tri", "ấu hìn"), 1, "hàng prose còn lại vẫn tìm được");
  assert.equal(hits(db, "messages_fts", "chào"), 0, "lane word cũng phải gỡ");
  db.close();
});

test("DELETE hàng tool KHÔNG làm hỏng trigram", (t) => {
  const db = seed(t);
  db.prepare("DELETE FROM messages WHERE uuid='u3'").run();
  assert.equal(hits(db, "messages_fts_tri", "ấu hìn"), 2, "prose không bị ảnh hưởng");
  assert.equal(hits(db, "messages_fts", "khoaduynhat"), 0, "lane word gỡ đúng hàng tool");
  db.close();
});

test("UPDATE đổi PHÍA: prose→tool rời trigram; tool→prose vào trigram", (t) => {
  const db = seed(t);
  db.prepare("UPDATE messages SET tool_name='Read', content='[tool_result] chuoimoicuatool' WHERE uuid='u1'").run();
  assert.equal(hits(db, "messages_fts_tri", "in chà"), 0, "nội dung cũ phải rời trigram");
  assert.equal(hits(db, "messages_fts_tri", "oimoicua"), 0, "nội dung mới KHÔNG được vào trigram vì giờ là tool");
  assert.equal(hits(db, "messages_fts", "chuoimoicuatool"), 1, "nhưng lane word vẫn có");

  db.prepare("UPDATE messages SET tool_name=NULL, content='giờ là văn xuôi bình thường' WHERE uuid='u3'").run();
  assert.equal(hits(db, "messages_fts_tri", "văn xu"), 1, "hàng vừa thành prose phải vào trigram");
  db.close();
});

// Ghim CỐ Ý một con số cứng: mỗi lần tăng SCHEMA_VERSION phải sửa dòng này, tức là
// việc tăng version luôn là một quyết định có ý thức chứ không trôi qua lặng lẽ.
// v18 = graph_fitness (lịch sử fitness). v19 = attachment + attachment_link.
// v20 = sessions.pinned (ghim MỘT phiên cho memory_context) — cột RIÊNG, cố ý không mượn
// `project_pinned` vốn đang gánh nghĩa "cấm scan ghi đè project_root".
test("DB mới chạy hết migration và dừng ở schema v20", (t) => {
  const db = seed(t);
  assert.equal(db.prepare("SELECT version FROM schema_version").get().version, 20);
  db.close();
});
