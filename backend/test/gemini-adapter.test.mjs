// ADAPTER GEMINI — đọc đúng hình dạng ĐÃ ĐO (2026-09-11, phiên thật của user), và canh hai bẫy mà
// nếu trượt thì hỏng CÂM:
//   ① Gemini trả các lượt **MỚI NHẤT TRƯỚC** (epoch giảm dần) ⇒ không đảo lại thì hội thoại nạp vào
//      kho ngược đời, và mốc bắt đầu/kết thúc của phiên lộn đầu.
//   ② Khoá dedup phải là `rid` (`r_<hex>`) của nền, KHÔNG phải chỉ số thứ tự: thêm một lượt mới là
//      mọi chỉ số lệch một bậc ⇒ lần quét sau nạp lại cả hội thoại thành tin TRÙNG
//      (dedup là `UNIQUE(session_id, uuid)`).
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { geminiAdapter } from "../../dist/memory/adapters/gemini.js";

const dir = mkdtempSync(join(tmpdir(), "zm-gemini-"));
// Đúng hình dạng `scanweb` ghi ra: mảng hội thoại, mỗi cái có `turns` mới-nhất-trước.
const FIXTURE = [
  {
    conversationId: "c_57eb54e22cdb9783",
    title: "Đánh giá repo zemory và tài liệu",
    turns: [
      { rid: "r_eec68ed3b2d3667e", at: 1785386994, user: "hỏi lần ba", model: "đáp lần ba" },
      { rid: "r_a2979d9d4784206b", at: 1785384969, user: "hỏi lần hai", model: "đáp lần hai" },
      { rid: "r_8cd67dc33e530851", at: 1785384795, user: "hỏi lần một", model: "đáp lần một" },
    ],
  },
];
const file = join(dir, "scan-web-part.json");
writeFileSync(file, JSON.stringify(FIXTURE), "utf8");

test("① ĐẢO thứ tự: tin vào kho theo chiều thời gian tăng dần", () => {
  const [s] = geminiAdapter.parseFileMulti(file);
  assert.deepEqual(
    s.messages.map((m) => m.content),
    ["hỏi lần một", "đáp lần một", "hỏi lần hai", "đáp lần hai", "hỏi lần ba", "đáp lần ba"],
    "nền trả mới-nhất-trước ⇒ adapter phải đảo lại",
  );
  const ts = s.messages.map((m) => Date.parse(m.timestamp));
  assert.ok(ts.every((v, i) => i === 0 || v >= ts[i - 1]), "mốc thời gian phải không giảm");
});

test("② khoá dedup lấy từ `rid` của nền, KHÔNG phải chỉ số thứ tự", () => {
  const [s] = geminiAdapter.parseFileMulti(file);
  assert.deepEqual(
    s.messages.map((m) => m.uuid),
    [
      "r_8cd67dc33e530851#u", "r_8cd67dc33e530851#a",
      "r_a2979d9d4784206b#u", "r_a2979d9d4784206b#a",
      "r_eec68ed3b2d3667e#u", "r_eec68ed3b2d3667e#a",
    ],
  );
  // Phép thử THẬT của bất biến: thêm MỘT lượt mới rồi kéo lại — id của các lượt CŨ phải y nguyên.
  const grown = [{ ...FIXTURE[0], turns: [{ rid: "r_moi", at: 1785390000, user: "hỏi mới", model: "đáp mới" }, ...FIXTURE[0].turns] }];
  const f2 = join(dir, "grown.json");
  writeFileSync(f2, JSON.stringify(grown), "utf8");
  const [s2] = geminiAdapter.parseFileMulti(f2);
  const cu = new Set(s.messages.map((m) => m.uuid));
  const giu = s2.messages.filter((m) => cu.has(m.uuid)).length;
  assert.equal(giu, 6, "mọi id cũ phải còn nguyên sau khi hội thoại mọc thêm — nếu không là nạp trùng cả hội thoại");
  assert.equal(s2.messages.length, 8);
});

test("③ vai · tiêu đề · id phiên mang tiền tố của nền", () => {
  const [s] = geminiAdapter.parseFileMulti(file);
  assert.equal(s.sessionId, "geminiweb-c_57eb54e22cdb9783");
  assert.equal(s.title, "Đánh giá repo zemory và tài liệu");
  assert.deepEqual(new Set(s.messages.map((m) => m.role)), new Set(["user", "assistant"]));
  assert.ok(s.messages.every((m) => m.toolName === null));
});

test("④ lượt thiếu một đầu vẫn giữ đầu còn lại; lượt rỗng bị bỏ", () => {
  const f = join(dir, "half.json");
  // Fixture viết ĐÚNG CHIỀU NỀN TRẢ: mới nhất trước. (Bản đầu tôi viết xuôi nên ca này đỏ với
  // `['assistant','user']` — cổng bắt đúng, sai là ở kỳ vọng chứ không ở code.)
  writeFileSync(f, JSON.stringify([{
    conversationId: "c_abc123def456", turns: [
      { rid: "r_3", at: 1785384569, user: "", model: "" },
      { rid: "r_2", at: 1785384568, user: "", model: "chỉ có câu trả lời" },
      { rid: "r_1", at: 1785384567, user: "chỉ có câu hỏi", model: "" },
    ],
  }]), "utf8");
  const [s] = geminiAdapter.parseFileMulti(f);
  assert.equal(s.messages.length, 2, "lượt rỗng hoàn toàn không được đẻ hàng trống");
  assert.deepEqual(s.messages.map((m) => m.role), ["user", "assistant"]);
});

test("⑤ tiền tố phiên KHỚP `sessionPrefix` khai trong PLATFORMS", async () => {
  const { PLATFORMS } = await import("../../dist/memory/scanweb.js");
  const [s] = geminiAdapter.parseFileMulti(file);
  assert.ok(s.sessionId.startsWith(PLATFORMS.gemini.sessionPrefix), "lệch là resume không khớp ⇒ mỗi lượt quét kéo lại cả kho");
});

test("⑥ file hỏng / hội thoại 0 tin ⇒ null, KHÔNG ném", () => {
  const bad = join(dir, "bad.json");
  writeFileSync(bad, "{khong phai json", "utf8");
  assert.equal(geminiAdapter.parseFileMulti(bad), null);
  const empty = join(dir, "empty.json");
  writeFileSync(empty, JSON.stringify([{ conversationId: "c_x", turns: [] }]), "utf8");
  assert.equal(geminiAdapter.parseFileMulti(empty), null);
});
