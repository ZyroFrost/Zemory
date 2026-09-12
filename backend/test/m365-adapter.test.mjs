// ADAPTER M365 COPILOT — đọc đúng HÌNH DẠNG ĐÃ ĐO, không phải hình dạng người viết tưởng tượng.
//
// Fixture dưới đây sao lại đúng cấu trúc đo được 2026-09-11 trên phiên công ty thật (`plan/07
// §17.3`), gồm cả ba chỗ dễ sai nhất — mỗi chỗ đã suýt làm mất dữ liệu theo một kiểu khác nhau:
//   ① tin `bot` có `text` RỖNG, câu trả lời thật nằm trong `adaptiveCards[0].body[].text`
//      (đo 4 hội thoại: text=0 ký tự · thẻ=4310 · 1756 · 978 · 2325). Đọc `text` thôi ⇒ nạp về
//      một kho chỉ có câu hỏi, không có câu trả lời — và không cổng nào kêu.
//   ② tin `messageType:'Progress'` là tiếng máy ⇒ phải mang `toolName` để bị hạ hạng, KHÔNG được
//      trộn lẫn hạng với văn xuôi của người.
//   ③ `author:'bot'` phải quy về `assistant`; giữ nguyên 'bot' là cả một nguồn lọt khỏi bộ lọc role.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { m365CopilotAdapter } from "../../dist/memory/adapters/m365copilot.js";

const dir = mkdtempSync(join(tmpdir(), "zm-m365-"));
const FIXTURE = [
  {
    conversationId: "78f512a2-4cd2-41a1-83b4-258f1d04b31b",
    chatName: "Check Power BI CLI Version",
    createTimeUtc: 1782973027894,
    updateTimeUtc: 1782973090000,
    messages: [
      { author: "user", text: "pbi cli version?", messageId: "m1", createdAt: "2026-09-01T03:00:00.000Z" },
      { author: "bot", text: "Đang tìm…", messageType: "Progress", messageId: "m2", createdAt: "2026-09-01T03:00:01.000Z" },
      {
        author: "bot",
        text: "",
        messageId: "m3",
        createdAt: "2026-09-01T03:00:05.000Z",
        adaptiveCards: [{ type: "AdaptiveCard", body: [{ type: "TextBlock", text: "Bản CLI hiện tại là 1.2.3", wrap: true }] }],
      },
      { author: "user", text: "", imageName: "so-do.png", messageId: "m4", createdAt: "2026-09-01T03:01:00.000Z" },
      { author: "bot", text: "", messageId: "m5", createdAt: "2026-09-01T03:01:02.000Z" },
    ],
  },
];
const file = join(dir, "scan-web-part.json");
writeFileSync(file, JSON.stringify(FIXTURE), "utf8");

test("1 the bot's answer is TAKEN FROM adaptiveCards when `text` is empty", () => {
  const [s] = m365CopilotAdapter.parseFileMulti(file);
  const bot = s.messages.filter((m) => m.role === "assistant" && !m.toolName);
  assert.equal(bot.length, 1, "phải còn đúng một câu trả lời thật");
  assert.equal(bot[0].content, "Bản CLI hiện tại là 1.2.3");
});

test("2 Progress messages are KEPT but stamped with a toolName so they rank lower", () => {
  const [s] = m365CopilotAdapter.parseFileMulti(file);
  const prog = s.messages.filter((m) => m.toolName === "Progress");
  assert.equal(prog.length, 1, "không được bỏ tin Progress — lớp messages là lớp ĐẦY");
  assert.match(prog[0].content, /^\[Progress\]\n/, "phải gắn nhãn để người đọc biết đây là tiếng máy");
});

test("3 author 'bot' maps to assistant, 'user' to user, and the session id carries the platform prefix", () => {
  const [s] = m365CopilotAdapter.parseFileMulti(file);
  assert.equal(s.sessionId, "m365copilotweb-78f512a2-4cd2-41a1-83b4-258f1d04b31b");
  assert.equal(s.title, "Check Power BI CLI Version");
  assert.deepEqual(
    s.messages.map((m) => m.role),
    ["user", "assistant", "assistant", "user"],
    "vai phải được quy về bộ chuẩn; tin rỗng hoàn toàn bị bỏ",
  );
  assert.equal(s.messages[0].uuid, "m1", "uuid = messageId của nền (khoá dedup khi kéo lại)");
});

test("4 a message holding ONLY an image keeps the LABEL - never silently dropped", () => {
  const [s] = m365CopilotAdapter.parseFileMulti(file);
  assert.ok(
    s.messages.some((m) => m.content === "[image:so-do.png]"),
    "tin kèm ảnh không có bytes vẫn phải để lại dấu vết",
  );
  // Ca ÂM: tin rỗng HOÀN TOÀN (không text, không thẻ, không ảnh) thì KHÔNG được đẻ hàng trống.
  assert.equal(s.messages.filter((m) => !m.content.trim()).length, 0);
});

test("5 the adapter's session prefix MATCHES the `sessionPrefix` declared in PLATFORMS", async () => {
  // Lệch hai giá trị này = resume không bao giờ khớp ⇒ mỗi lượt quét kéo lại cả kho. Đúng lỗi đã
  // xảy ra với claude (`sessionPrefix` bị ghim cứng `chatgpt-`).
  const { PLATFORMS } = await import("../../dist/memory/scanweb.js");
  const [s] = m365CopilotAdapter.parseFileMulti(file);
  assert.ok(s.sessionId.startsWith(PLATFORMS.m365copilot.sessionPrefix));
});

test("6 an unreadable file or a non-conversation yields null and does NOT throw", () => {
  const bad = join(dir, "bad.json");
  writeFileSync(bad, "{khong phai json", "utf8");
  assert.equal(m365CopilotAdapter.parseFileMulti(bad), null);
  const empty = join(dir, "empty.json");
  writeFileSync(empty, JSON.stringify([{ conversationId: "x", messages: [] }]), "utf8");
  assert.equal(m365CopilotAdapter.parseFileMulti(empty), null, "hội thoại 0 tin dùng được ⇒ null");
});

test("7 the `_pulled.json` sidecar is NOT picked up as a transcript", () => {
  writeFileSync(join(dir, "_pulled.json"), "{}", "utf8");
  const names = m365CopilotAdapter.enumerate(dir).map((t) => t.path);
  assert.ok(!names.some((p) => p.endsWith("_pulled.json")), "sổ mốc kéo không phải hội thoại");
  assert.ok(names.some((p) => p.endsWith("scan-web-part.json")));
});
