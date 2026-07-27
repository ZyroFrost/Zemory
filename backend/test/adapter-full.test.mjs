// Lớp `messages` phải ĐẦY (plan/06 §6: "digest (mỏng) → anchor → messages (đầy)").
//
// PARSER v4 (2026-07-26) gỡ `clip()` — trước đó mọi block > 4.000 ký tự bị cắt cụt, ăn mất
// 16,8% khối lượng lớp full (đo trên 16.733 message). Test này là RATCHET: ai đặt lại một
// cái cap nào vào đường ghi `messages` thì gate ĐỎ.
//
// Bốn tầng lọc CÓ LÝ DO vẫn phải còn (dedup · redact · bỏ dòng rỗng · bỏ thinking) —
// khẳng định luôn ở đây để không ai gỡ nhầm.

import assert from "node:assert/strict";
import test from "node:test";
import { claudeAdapter } from "../../dist/memory/adapters/claude.js";

const line = (o) => JSON.stringify(o);
const big = "X".repeat(50_000);

test("tool_result KHỔNG LỒ vào nguyên vẹn — không còn cap 4.000", () => {
  const p = claudeAdapter.parseLine(
    line({
      type: "user",
      uuid: "u1",
      message: { role: "user", content: [{ type: "tool_result", content: big }] },
    }),
  );
  assert.equal(p.kind, "message");
  assert.ok(p.msg.content.includes(big), "nội dung phải nguyên vẹn");
  assert.ok(!p.msg.content.endsWith("…"), "không được có dấu cắt");
  assert.ok(p.msg.content.length > 49_000, `dài ${p.msg.content.length}, phải ~50k`);
});

test("tool_use input khổng lồ cũng không bị cắt", () => {
  const p = claudeAdapter.parseLine(
    line({
      type: "assistant",
      uuid: "u2",
      message: { role: "assistant", content: [{ type: "tool_use", name: "Bash", input: { cmd: big } }] },
    }),
  );
  assert.equal(p.kind, "message");
  assert.ok(p.msg.content.length > 49_000);
  assert.ok(!p.msg.content.endsWith("…"));
});

test("text block dài giữ nguyên (ChatGPT-style cắt cả message đã gỡ)", () => {
  const p = claudeAdapter.parseLine(
    line({ type: "assistant", uuid: "u3", message: { role: "assistant", content: [{ type: "text", text: big }] } }),
  );
  assert.equal(p.msg.content.length, big.length);
});

test("FILE người dùng kéo vào chat → thành message, giữ đủ nội dung", () => {
  const body = "def hello():\n    return 1\n" + "Y".repeat(20_000);
  const p = claudeAdapter.parseLine(
    line({
      type: "attachment",
      uuid: "a1",
      timestamp: "2026-07-26T10:00:00.000Z",
      attachment: { type: "file", filename: "d:\\x\\pull.py", content: { type: "text", file: { filePath: "d:\\x\\pull.py", content: body } } },
    }),
  );
  assert.equal(p.kind, "message");
  assert.equal(p.msg.role, "user");
  assert.equal(p.msg.toolName, "attachment");
  assert.ok(p.msg.content.startsWith("[file:d:\\x\\pull.py]\n"), p.msg.content.slice(0, 40));
  assert.ok(p.msg.content.includes(body), "nội dung file phải đủ");
  assert.equal(p.msg.uuid, "a1", "phải có uuid để dedup");
});

test("attachment NỘI BỘ của Claude Code bị bỏ (không nạp rác)", () => {
  for (const t of ["todo_reminder", "queued_command", "deferred_tools_delta", "skill_listing", "edited_text_file"]) {
    const p = claudeAdapter.parseLine(line({ type: "attachment", uuid: "x", attachment: { type: t, snippet: "abc" } }));
    assert.equal(p.kind, "skip", `${t} phải bị bỏ`);
  }
});

test("attachment file RỖNG bị bỏ", () => {
  const p = claudeAdapter.parseLine(
    line({ type: "attachment", uuid: "e", attachment: { type: "file", filename: "a.txt", content: { file: { content: "   " } } } }),
  );
  assert.equal(p.kind, "skip");
});

test("4 tầng lọc CÓ LÝ DO vẫn còn: dòng rỗng · JSON hỏng · thinking · message rỗng", () => {
  assert.equal(claudeAdapter.parseLine("   ").kind, "skip", "dòng rỗng");
  assert.equal(claudeAdapter.parseLine("{khong-phai-json").kind, "skip", "JSON hỏng");
  // thinking bị bỏ → message chỉ có thinking ⇒ không sinh row
  const th = claudeAdapter.parseLine(
    line({ type: "assistant", uuid: "t", message: { role: "assistant", content: [{ type: "thinking", thinking: "abc" }] } }),
  );
  assert.equal(th.kind, "skip", "message chỉ có thinking ⇒ bỏ");
});

test("custom-title vẫn thắng ai-title (không vỡ khi thêm nhánh attachment)", () => {
  const c = claudeAdapter.parseLine(line({ type: "custom-title", customTitle: "Tên tôi đặt" }));
  assert.deepEqual(c, { kind: "title", title: "Tên tôi đặt", custom: true });
  const a = claudeAdapter.parseLine(line({ type: "ai-title", aiTitle: "Tên máy đặt" }));
  assert.equal(a.custom, undefined);
});

// ── Ảnh: tách khỏi content, vào bảng attachment ────────────────────────────────
// Đo 2026-07-28: transcript chứa 1.245 block ảnh (93 MB) mà `flatten()` KHÔNG có nhánh
// `image` ⇒ toàn bộ bị bỏ IM LẶNG ở khâu nạp. Ba bất biến khoá lại ở đây.
const PNG_1x1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function imgLine(uuid, extra = []) {
  return JSON.stringify({
    type: "user",
    uuid,
    timestamp: "2026-07-28T00:00:00Z",
    message: { role: "user", content: [{ type: "text", text: "xem ảnh này" }, { type: "image", source: { type: "base64", media_type: "image/png", data: PNG_1x1 } }, ...extra] },
  });
}

test("block ảnh KHÔNG vào content — chỉ để lại một dòng nhãn", () => {
  const line = JSON.parse(imgLine("m1"));
  const parsed = claudeAdapter.parseLine(JSON.stringify(line));
  assert.equal(parsed.kind, "message");
  const c = parsed.msg.content;
  assert.ok(c.includes("xem ảnh này"), "văn xuôi phải giữ nguyên");
  assert.ok(/\[image:image\/png \d+KB [0-9a-f]{12}\]/.test(c), "phải có nhãn một dòng: " + c);
  assert.ok(!c.includes(PNG_1x1.slice(0, 40)), "base64 KHÔNG được vào content — nó nuôi FTS5 (bài học v16/v17)");
});

test("ảnh ra `attachments` với sha256 + kind=blob", () => {
  const parsed = claudeAdapter.parseLine(imgLine("m2"));
  const atts = parsed.msg.attachments;
  assert.equal(atts?.length, 1);
  assert.equal(atts[0].kind, "blob");
  assert.equal(atts[0].mime, "image/png");
  assert.ok(atts[0].bytes > 0);
  assert.match(atts[0].sha256, /^[0-9a-f]{64}$/);
  assert.ok(Buffer.isBuffer(atts[0].blob));
});

test("cùng một ảnh ⇒ cùng sha256 (nền tảng của dedup)", () => {
  const a = claudeAdapter.parseLine(imgLine("m3")).msg.attachments[0];
  const b = claudeAdapter.parseLine(imgLine("m4")).msg.attachments[0];
  assert.equal(a.sha256, b.sha256, "dedup dựa vào đây: một ảnh lặp 20 lần = 1 hàng nội dung");
});

test("block ảnh hỏng/lạ ⇒ bỏ qua, KHÔNG làm mất cả message", () => {
  const bad = JSON.stringify({
    type: "user", uuid: "m5", timestamp: "2026-07-28T00:00:00Z",
    message: { role: "user", content: [{ type: "text", text: "vẫn còn chữ" }, { type: "image", source: { type: "url", url: "http://x/y.png" } }] },
  });
  const p = claudeAdapter.parseLine(bad);
  assert.equal(p.kind, "message");
  assert.ok(p.msg.content.includes("vẫn còn chữ"));
  assert.ok(!p.msg.attachments?.length, "source không phải base64 ⇒ không tạo attachment");
});
