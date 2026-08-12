// v21: lane TRIGRAM index tin NGƯỜI/MODEL **và `tool_use`**, chỉ bỏ `tool_result`.
//
// 🔄 ĐẢO v16/v17 ("bỏ hết tool-dump"). Vế cũ chọn bằng số DUNG LƯỢNG (trigram = 42% cả DB)
// mà KHÔNG ai đo phần chất lượng mất. Đo A/B/C 2026-08-12 trên bản sao kho thật, 68 nhãn,
// chỉ khác trigram của tool_use: 0% ⇒ tool_use @10 **14%** · MRR 0,046 · keyword @10 42% ·
// 78% ⇒ **21%** · 0,116 · 50% · 100% ⇒ 21% · 0,080 · 50%. Gỡ lane này thì tool_use mất 60%
// MRR và lớp keyword sập 8 điểm@10 ⇒ tool_use trong trigram ĐANG trả tiền nuôi thân.
//
// `tool_result` vẫn ngoài trigram: phần dump TO NHẤT, và đã có sẵn word + vector (99,8%).
//
// ⚠ CÁCH ĐO: KHÔNG dùng `SELECT COUNT(*) FROM messages_fts_tri` — đây là bảng FTS
// EXTERNAL-CONTENT, truy vấn không-MATCH đọc XUYÊN xuống `messages` nên luôn trả về số hàng
// của bảng gốc (bản test đầu của tôi sai đúng chỗ này: ra 3 và tưởng trigger hỏng).
// Chỉ `MATCH` mới thật sự hỏi postings của index.
//
// Bất biến khoá lại: `messages` không mất gì · lane WORD index tất cả · lane TRIGRAM bỏ
// ĐÚNG `tool_result` và GIỮ `tool_use` · hàng đổi phía không để posting mồ côi.

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
// tool_use THUẦN: tool_name có, content KHÔNG mang tiền tố [tool_result] — đây là hình dạng
// thật của một lượt gọi tool (tham số đầu vào). Bộ test cũ KHÔNG có ca này, nên chính sách
// v21 lẽ ra đổi hành vi của nó mà không cổng nào đỏ. Thiếu ca âm/dương đúng hình dạng thì
// cổng chỉ canh được thứ mình tình cờ nghĩ tới.
const TOOL_USE = 'npm run build && node dist/cli.js memory embed --all --thamsodacbiet';

function seed(t) {
  const db = openMemory(join(tempDir(t, "zemory-tri-"), "m.db"));
  db.prepare("INSERT INTO sessions (id, source, origin, host) VALUES ('s1','claude-code','local','h')").run();
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, tool_name) VALUES ('s1',?,?,?,?)");
  ins.run("u1", "user", PROSE_1, null);
  ins.run("u2", "assistant", PROSE_2, null);
  ins.run("u3", "user", TOOL, "Bash");
  ins.run("u4", "user", TOOL_NO_NAME, null); // tool_name NULL nhung van la dump
  ins.run("u5", "assistant", TOOL_USE, "Bash"); // tool_use thuan — v21 CO trigram
  return db;
}
/** Số hit THẬT trong index (chỉ MATCH mới hỏi postings). */
const hits = (db, table, term) =>
  db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${table} MATCH ?`).get(term).n;

test("messages giữ ĐỦ 5 hàng — lọc chỉ ở lớp dẫn xuất", (t) => {
  const db = seed(t);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM messages").get().n, 5);
  db.close();
});

test("lane WORD index TẤT CẢ — tool-dump vẫn tìm được bằng từ khoá", (t) => {
  const db = seed(t);
  assert.equal(hits(db, "messages_fts", "khoaduynhat"), 1, "token trong tool-dump phải tìm được ở lane word");
  assert.equal(hits(db, "messages_fts", "cấu"), 2, "prose vẫn đủ ở lane word");
  db.close();
});

test("lane TRIGRAM BỎ tool_result (cả khi tool_name NULL)", (t) => {
  const db = seed(t);
  assert.equal(hits(db, "messages_fts_tri", "oaduynha"), 0, "chuỗi-con của tool_result KHÔNG được có trong trigram");
  assert.equal(hits(db, "messages_fts_tri", "angluo"), 0, "kể cả chuỗi khác trong cùng dump");
  // v17: dump có tool_name NULL cũng phải bị loại (v16 bỏ sót đúng ca này)
  assert.equal(hits(db, "messages_fts_tri", "hongcotoolname"), 0, "tool_result dù tool_name NULL vẫn phải ngoài trigram");
  assert.equal(hits(db, "messages_fts", "khongcotoolname"), 1, "nhưng lane word vẫn phải có");
  db.close();
});

// v21 — ca mà bộ test cũ KHÔNG có. Đây là bất biến mới, và cũng là thứ chặn việc lặng lẽ
// quay về v16: nếu ai đó thêm lại "tool_name IS NULL" vào trigger, đúng test này đỏ.
test("v21: lane TRIGRAM GIỮ tool_use (tool_name có, không phải tool_result)", (t) => {
  const db = seed(t);
  assert.equal(hits(db, "messages_fts_tri", "hamsodacbie"), 1, "chuỗi-con GIỮA TỪ của tool_use phải tìm được — đây là công dụng trigram không lane nào thay");
  // Nháy kép BẮT BUỘC: FTS5 coi '/' là ký tự cú pháp, để trần là `syntax error` chứ không
  // phải "0 kết quả" — và một test ném lỗi trông y hệt một test thất bại vì code sai.
  assert.equal(hits(db, "messages_fts_tri", '"ist/cli"'), 1, "đường dẫn trong lệnh cũng phải khớp chuỗi-con");
  assert.equal(hits(db, "messages_fts", "thamsodacbiet"), 1, "lane word vẫn giữ nguyên vai");
  db.close();
});

test("v21: DELETE hàng tool_use gỡ sạch posting trigram (không mồ côi)", (t) => {
  const db = seed(t);
  db.prepare("DELETE FROM messages WHERE uuid='u5'").run();
  assert.equal(hits(db, "messages_fts_tri", "hamsodacbie"), 0, "posting của hàng đã xoá phải biến mất");
  assert.equal(hits(db, "messages_fts_tri", "ấu hìn"), 2, "prose không bị vạ lây");
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

test("UPDATE đổi PHÍA: prose→tool_result rời trigram; tool_result→prose vào lại", (t) => {
  const db = seed(t);
  db.prepare("UPDATE messages SET tool_name='Read', content='[tool_result] chuoimoicuatool' WHERE uuid='u1'").run();
  assert.equal(hits(db, "messages_fts_tri", "in chà"), 0, "nội dung cũ phải rời trigram");
  assert.equal(hits(db, "messages_fts_tri", "oimoicua"), 0, "nội dung mới KHÔNG được vào trigram vì giờ là tool_result");
  assert.equal(hits(db, "messages_fts", "chuoimoicuatool"), 1, "nhưng lane word vẫn có");

  db.prepare("UPDATE messages SET tool_name=NULL, content='giờ là văn xuôi bình thường' WHERE uuid='u3'").run();
  assert.equal(hits(db, "messages_fts_tri", "văn xu"), 1, "hàng vừa thành prose phải vào trigram");
  db.close();
});

// v21 chuyển TRỤC phân loại: từ `tool_name` sang tiền tố `[tool_result]`. Ca này khoá đúng
// chỗ đó — đổi tool_name mà nội dung vẫn là prose thì posting KHÔNG được đụng tới.
test("v21: đổi tool_name KHÔNG còn làm hàng rời trigram (trục là nội dung, không phải tên tool)", (t) => {
  const db = seed(t);
  db.prepare("UPDATE messages SET tool_name='Edit' WHERE uuid='u1'").run();
  assert.equal(hits(db, "messages_fts_tri", "in chà"), 1, "prose gắn tool_name vẫn phải còn trong trigram");
  db.close();
});

// 🔴 CA HỒI QUY cho lỗi thứ tự trigger (tìm ra 2026-08-12). Khi CẢ HAI vế cùng đúng —
// UPDATE một hàng prose thành prose khác — bản cũ tách `_del`/`_ins` thành hai trigger, mà
// SQLite KHÔNG bảo đảm thứ tự nổ giữa chúng ⇒ "thêm rồi xoá" và tin rơi khỏi trigram vĩnh
// viễn. Đây là ca mà bộ test cũ mù hoàn toàn: mọi ca UPDATE của nó đều ĐỔI PHÍA.
test("v21: UPDATE prose→prose GIỮ được posting (lỗi thứ tự trigger)", (t) => {
  const db = seed(t);
  db.prepare("UPDATE messages SET content='nội dung đã được biên tập lại hoàn toàn' WHERE uuid='u1'").run();
  assert.equal(hits(db, "messages_fts_tri", "in chà"), 0, "nội dung CŨ phải rời trigram");
  assert.equal(hits(db, "messages_fts_tri", "ã được bi"), 1, "nội dung MỚI phải có trong trigram — không được biến mất theo");
  db.close();
});

// Ghim CỐ Ý một con số cứng: mỗi lần tăng SCHEMA_VERSION phải sửa dòng này, tức là
// việc tăng version luôn là một quyết định có ý thức chứ không trôi qua lặng lẽ.
// v18 = graph_fitness (lịch sử fitness). v19 = attachment + attachment_link.
// v20 = sessions.pinned (ghim MỘT phiên cho memory_context) — cột RIÊNG, cố ý không mượn
// `project_pinned` vốn đang gánh nghĩa "cấm scan ghi đè project_root".
// v21 = trigram nhận lại tool_use (đo A/B/C ở đầu file), dựng lại postings theo chính sách mới.
test("DB mới chạy hết migration và dừng ở schema v21", (t) => {
  const db = seed(t);
  assert.equal(db.prepare("SELECT version FROM schema_version").get().version, 21);
  db.close();
});
