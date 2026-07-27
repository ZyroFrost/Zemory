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
