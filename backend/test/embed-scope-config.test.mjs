// Phạm vi nhúng lớp TOOL phải sống trong CONFIG, không phải trong biến môi trường.
//
// Lỗi thật đã trả giá (đo 2026-08-12): phạm vi chỉ đọc từ `ZEMORY_EMBED_TOOLS`, nên nó chết
// theo cửa sổ terminal đã gõ lệnh. Job 11/08 phủ 100% lớp tool; nhưng daemon/scheduler/hook
// chạy KHÔNG có biến đó ⇒ tin tool mới không ai nhặt, rò **~50 tin/giờ**. Tệ hơn: hàm đếm
// tồn đọng dùng CHÍNH bộ lọc ấy, nên `/memory-status` vẫn báo `remaining 0` — một lớp tự
// teo mà không cổng nào kêu.
//
// Hai bất biến khoá ở đây:
//   ① config RỖNG ⇒ vẫn có phạm vi mặc định ĐÃ ĐO (không rơi về "không nhúng tool nào");
//   ② tin tool trong phạm vi được ĐẾM là tồn đọng, tin ngoài phạm vi đếm RIÊNG — hai con số
//      cạnh nhau mới phân biệt được "chưa kịp làm" với "cố ý bỏ".

// ⚠ MỘT thư mục tạm cho CẢ FILE, đặt env TRƯỚC mọi import: `db.js` chốt `GLOBAL_MEMORY_DB`
// vào hằng số cấp module lúc import lần đầu, nên mỗi test một thư mục thì test thứ hai trở
// đi vẫn trỏ vào thư mục của test ĐẦU (đã bị xoá) — bản đầu của file này dính đúng bẫy đó,
// và triệu chứng là "Cannot open database because the directory does not exist", nghe như
// lỗi code chứ không như lỗi test.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const DIR = mkdtempSync(join(tmpdir(), "zemory-escope-"));
process.env.HOME = DIR;
process.env.USERPROFILE = DIR;
process.env.GLOBAL_MEMORY_DB = join(DIR, "m.db");
delete process.env.ZEMORY_EMBED_TOOLS; // ca THẬT: tiến trình nền không có biến này

const { openMemory } = await import("../../dist/memory/db.js");
const { getEmbedTools, setEmbedTools, EMBED_TOOLS_DEFAULT } = await import("../../dist/config/settings.js");
const { vectorRemaining, vectorOutOfScope } = await import("../../dist/memory/vectors.js");

const seeded = openMemory(process.env.GLOBAL_MEMORY_DB);
seeded.prepare("INSERT INTO sessions (id, source, origin, host) VALUES ('s1','claude-code','local','h')").run();
const ins = seeded.prepare("INSERT INTO messages (session_id, uuid, role, content, tool_name) VALUES ('s1',?,?,?,?)");
ins.run("m1", "user", "một câu văn xuôi bình thường của người dùng", null);
ins.run("m2", "assistant", "npm run build && node dist/cli.js memory embed --all", "Bash"); // TRONG phạm vi
ins.run("m3", "assistant", "D:/huy.nguyen/Tool/Zemory/backend/src/memory/db.ts", "Read"); // NGOÀI phạm vi
ins.run("m4", "assistant", "sửa dòng 42 thành hằng số mới", "Edit"); // TRONG phạm vi
seeded.close();

after(() => rmSync(DIR, { recursive: true, force: true }));

test("config RỖNG ⇒ phạm vi nhúng tool vẫn là bộ ĐÃ ĐO (không rơi về rỗng)", () => {
  assert.deepEqual(getEmbedTools(), EMBED_TOOLS_DEFAULT);
  assert.ok(getEmbedTools().includes("Bash"), "Bash phủ 6/14 nhãn tool_use — bỏ nó là bỏ lớp lớn nhất");
  assert.ok(!getEmbedTools().includes("Read"), "Read là đường dẫn thuần — nhúng 768 chiều gần như vô nghĩa");
});

test("KHÔNG có biến môi trường: tin tool trong phạm vi VẪN được đếm là tồn đọng", () => {
  // m1 (prose) + m2 (Bash) + m4 (Edit) = 3 tin chờ nhúng; m3 (Read) nằm ngoài.
  assert.equal(vectorRemaining(), 3, "tin tool trong phạm vi phải nằm trong số tồn đọng — đây chính là chỗ từng rò");
  assert.equal(vectorOutOfScope(), 1, "tin ngoài phạm vi phải đếm RIÊNG, không được lẫn vào 0");
});

test("đổi phạm vi trong config là hai con số đổi theo (một lần chỉnh, mọi tiến trình thấy)", () => {
  setEmbedTools(["Edit"]); // thu hẹp: chỉ còn Edit
  try {
    assert.equal(vectorRemaining(), 2, "còn prose + Edit");
    assert.equal(vectorOutOfScope(), 2, "Bash và Read nay đều là 'cố ý bỏ' — và phải NHÌN THẤY được");
  } finally {
    setEmbedTools(EMBED_TOOLS_DEFAULT); // trả lại, để thứ tự chạy test không đẻ phụ thuộc ngầm
  }
});
