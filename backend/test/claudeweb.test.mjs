// Adapter Claude.ai web — song sinh với chatgpt nhưng HÌNH DẠNG dữ liệu khác hẳn:
// `chat_messages` là MẢNG PHẲNG đã đúng thứ tự (không có nhánh chết như `mapping` của
// ChatGPT), vai là `sender: 'human' | 'assistant'`, nội dung nằm trong `content[]`.
//
// Fixture dưới đây dựng theo đúng hình dạng API claude.ai trả về
// (/api/organizations/<org>/chat_conversations/<uuid>?tree=True&rendering_mode=messages).

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { claudeWebAdapter } from "../../dist/memory/adapters/claudeweb.js";
import { tempDir } from "./helpers.mjs";

function dump(t, convs) {
  const dir = tempDir(t, "zemory-cweb-");
  mkdirSync(dir, { recursive: true });
  const f = join(dir, "claude-2026-07-27.json");
  writeFileSync(f, JSON.stringify(convs));
  return f;
}

const CONV = {
  uuid: "conv-aaa",
  name: "Bàn về recall blindness",
  created_at: "2026-07-27T01:00:00Z",
  project: { name: "Zemory", uuid: "proj-1" },
  chat_messages: [
    { uuid: "m1", sender: "human", created_at: "2026-07-27T01:00:00Z", text: "phẳng", content: [{ type: "text", text: "tin của người dùng" }] },
    {
      uuid: "m2",
      sender: "assistant",
      created_at: "2026-07-27T01:00:05Z",
      content: [
        { type: "thinking", text: "suy nghĩ nội bộ" },
        { type: "text", text: "câu trả lời" },
        { type: "tool_use", name: "Bash", input: { cmd: "ls" } },
        { type: "tool_result", content: "kết quả lệnh" },
      ],
    },
  ],
};

test("parse đúng: vai human→user, thứ tự phẳng, project lấy từ tên folder", (t) => {
  const out = claudeWebAdapter.parseFileMulti(dump(t, [CONV]));
  assert.equal(out.length, 1);
  const s = out[0];
  assert.equal(s.sessionId, "claudeweb-conv-aaa");
  assert.equal(s.title, "Bàn về recall blindness");
  assert.equal(s.project, "Zemory", "project = tên folder claude.ai để recall lọc được");
  assert.deepEqual(s.messages.map((m) => m.role), ["user", "assistant"], "'human' phải quy về 'user' như mọi adapter khác");
  assert.equal(s.messages[0].timestamp, "2026-07-27T01:00:00Z");
});

// Lớp FULL: khối tool được GIỮ và gắn nhãn giống adapter Claude Code, để roleMatches()
// và việc hạ điểm tin tool nhận ra chúng. Cắt bớt ở đây là phá lớp full (điều 3).
test("giữ NGUYÊN VẸN mọi khối, gắn nhãn tool đúng quy ước", (t) => {
  const out = claudeWebAdapter.parseFileMulti(dump(t, [CONV]));
  const a = out[0].messages[1].content;
  assert.ok(a.includes("[thinking]"), "thinking phải được giữ");
  assert.ok(a.includes("câu trả lời"));
  assert.ok(a.includes("[tool_use:Bash]"), "nhãn tool_use phải khớp quy ước adapter Claude Code");
  assert.ok(a.includes("[tool_result]"), "nhãn tool_result là dấu hiệu roleMatches() dùng");
  assert.ok(a.includes("kết quả lệnh"), "nội dung tool_result KHÔNG được cắt");
});

// Anthropic thêm loại khối mới lúc nào cũng được. Rơi mất nguyên message vì một khối lạ
// là mất dữ liệu thật — phải có đường lui về `text` phẳng.
test("khối lạ ⇒ rơi về text phẳng, KHÔNG mất message", (t) => {
  const f = dump(t, [{ uuid: "c2", chat_messages: [{ uuid: "x", sender: "human", text: "bản phẳng còn đây", content: [{ type: "loai_moi_2027" }] }] }]);
  const out = claudeWebAdapter.parseFileMulti(f);
  assert.equal(out[0].messages.length, 1);
  assert.equal(out[0].messages[0].content, "bản phẳng còn đây");
});

test("chấp nhận cả mảng trần lẫn {conversations:[…]}", (t) => {
  const a = claudeWebAdapter.parseFileMulti(dump(t, [CONV]));
  const b = claudeWebAdapter.parseFileMulti(dump(t, { conversations: [CONV] }));
  assert.equal(a.length, 1);
  assert.equal(b.length, 1, "dạng bọc trong {conversations} cũng phải đọc được");
});

test("file hỏng / hội thoại rỗng ⇒ null, không ném (fail-open)", (t) => {
  const dir = tempDir(t, "zemory-cweb-bad-");
  const bad = join(dir, "x.json");
  writeFileSync(bad, "{ khong phai json");
  assert.equal(claudeWebAdapter.parseFileMulti(bad), null);
  assert.equal(claudeWebAdapter.parseFileMulti(dump(t, [{ uuid: "empty", chat_messages: [] }])), null);
});

test("adapter khai đúng lane: source=claude-web · origin=web · whole-replace", () => {
  assert.equal(claudeWebAdapter.source, "claude-web");
  assert.equal(claudeWebAdapter.origin, "web", "phải nằm lane web để scope-tree tách khỏi transcript local");
  assert.equal(claudeWebAdapter.mode, "whole", "re-pull là thay TOÀN BỘ, idempotent — giống chatgpt");
});
