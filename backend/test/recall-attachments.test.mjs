// RECALL PHẢI CHỈ ĐƯỜNG TỚI ẢNH — không phải tìm BẰNG ảnh.
//
// Vì sao lớp này tồn tại (user 2026-09-17: *"lỡ t cần nó đọc lại ảnh kìa"*): recall xưa nay chỉ
// trả CHỮ. Bảng `attachment` không có FTS, không có vector — nó chỉ được dùng làm BỘ LỌC ("tin có
// ảnh") rồi vứt đi. Nên agent dò tới đúng tin mà không biết ảnh nằm đâu, và câu *"xem lại ảnh vì
// sao"* không trả lời được dù ảnh vẫn nằm nguyên trên đĩa.
//
// Cách chữa KHÔNG phải OCR (HP điều 6 cấm lõi gọi model; `plan/23 §7` chốt không OCR) mà là trả ra
// CON TRỎ: máy chỉ đường tất định, agent liên kết mở file ra nhìn — đúng bậc ② của điều 6.
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { attachmentsForMessages } from "../../dist/memory/filestore.js";
import { tempDir } from "./helpers.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");

/** A fake store: one message carrying attachments of several kinds. `inDb` rows hold their bytes (HP 18). */
function seed(t, rows) {
  const dir = tempDir(t, "zra-db-");
  const root = tempDir(t, "zra-open-");
  const db = openMemory(join(dir, "global_memory.db"));
  db.prepare("INSERT INTO sessions (id, source, origin) VALUES ('s1','test','local')").run();
  const insMsg = db.prepare("INSERT INTO messages (session_id, uuid, role, content) VALUES ('s1',?,?,?)");
  const insAtt = db.prepare(
    `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, src_path, blob, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,'2026-09-17T00:00:00Z')`,
  );
  const insLink = db.prepare("INSERT INTO attachment_link (message_id, attachment_id) VALUES (?,?)");
  const mid = Number(insMsg.run("u1", "user", "tin có ảnh").lastInsertRowid);
  rows.forEach((r, i) => {
    const body = Buffer.from("x" + i);
    const aid = Number(insAtt.run(mid, "s1", r.name, r.mime, 10, sha(body), r.kind, r.rel ?? null, r.inDb ? body : null).lastInsertRowid);
    insLink.run(mid, aid);
  });
  const bare = Number(insMsg.run("u2", "user", "tin KHÔNG có ảnh").lastInsertRowid);
  // KHÔNG dùng `t.after` để đóng kho: hook chạy theo thứ tự ĐĂNG KÝ, mà `tempDir` đã đăng ký
  // lượt dọn trước đó ⇒ nó xoá thư mục trong lúc SQLite còn giữ khoá và ném EPERM. Đóng ngay
  // cuối thân ca, đúng nếp `filestore.test.mjs` đang dùng.
  return { db, root, mid, bare };
}

test("a message with a picture ⇒ an ABSOLUTE path that opens (the bytes written out of the db)", (t) => {
  const { db, root, mid } = seed(t, [{ kind: "blob", mime: "image/png", name: "a.png", inDb: true }]);
  const got = attachmentsForMessages([mid], { db, openDir: root }).get(mid);
  assert.equal(got.length, 1);
  assert.equal(got[0].state, "in-db");
  assert.ok(got[0].path.startsWith(root), "the open copy sits in the machine's folder, not beside the db");
  // the path must OPEN - a well-formed path with no file is useless to the agent
  assert.ok(existsSync(got[0].path));
  assert.equal(readFileSync(got[0].path, "utf8"), "x0");
  db.close();
});

test("CA ÂM — tin KHÔNG có đính kèm thì không trả gì (payload recall không phình)", (t) => {
  const { db, root, bare } = seed(t, [{ kind: "blob", mime: "image/png", name: "a.png", inDb: true }]);
  assert.equal(attachmentsForMessages([bare], { db, openDir: root }).get(bare), undefined);
  assert.equal(attachmentsForMessages([], { db, openDir: root }).size, 0, "an empty list ⇒ no query, no throw");
  db.close();
});

test("NEGATIVE: no bytes ⇒ SAY so, never invent a path", (t) => {
  const { db, root, mid } = seed(t, [
    // `ref` = the site's pointer, bytes never downloaded
    { kind: "ref", mime: "image/*", name: null, rel: "sediment://file_abc" },
    // a `blob` row whose `src_path` is a URL and that holds no bytes - still nothing to open
    { kind: "blob", mime: "image/png", name: "b.png", rel: "https://example/x.png" },
    // a `blob` row with no bytes at all
    { kind: "blob", mime: "image/png", name: "c.png", rel: null },
  ]);
  const got = attachmentsForMessages([mid], { db, openDir: root }).get(mid);
  assert.equal(got.length, 3);
  for (const a of got) assert.equal(a.path, null, `${a.state} must not carry a path`);
  assert.deepEqual(got.map((a) => a.state), ["not-fetched", "not-fetched", "not-fetched"]);
  db.close();
});

test("recall gắn đính kèm ở ĐÚNG MỘT chỗ, và FAIL-OPEN", () => {
  const src = readFileSync(new URL("../src/memory/search.ts", import.meta.url), "utf8");
  // Một chỗ duy nhất dựng hit (`finish`) ⇒ mọi đường recall đều có: search · hybrid · đa-truy-vấn
  // · gộp gần trùng. Gắn ở bốn nơi là bốn chỗ để lệch nhau.
  assert.equal((src.match(/attachmentsForMessages\(/g) || []).length, 1, "chỉ được gắn ở MỘT chỗ");
  // Fail-open (điều 9): lớp này là thứ THÊM — kho tệp hỏng thì recall vẫn phải trả chữ.
  const at = src.indexOf("attachmentsForMessages(");
  const around = src.slice(at - 400, at + 400);
  assert.match(around, /try \{/, "phải bọc try — hỏng kho tệp không được làm chết lượt recall");
  assert.match(around, /catch/, "…và phải nuốt lỗi, không ném lên");
});

test("MCP phải DẶN agent tự mở ảnh — không nói thì trường đó bị bỏ qua", () => {
  const t = readFileSync(new URL("../src/tools/index.ts", import.meta.url), "utf8");
  assert.match(t, /OPEN that file yourself/, "mô tả tool phải bảo agent mở file");
  assert.match(t, /no OCR, no vision in the core/, "…và nói rõ zemory KHÔNG tự đọc ảnh (điều 6)");
  assert.match(t, /null path means/, "…và dạy nó phân biệt 'chưa tải' với 'không có'");
});
