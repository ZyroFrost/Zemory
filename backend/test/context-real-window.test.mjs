// Cửa sổ context THẬT từ chính lệnh `/context` của host (2026-08-30) — user chỉ ra lỗi gốc:
// `windowFor()` đoán theo TÊN MODEL, mà transcript không hề phân biệt phiên 200k với phiên [1m]
// CÙNG một tên model ⇒ học 1M một lần là nhiễm vĩnh viễn (đo được là nguồn của "hầu hết ko báo").
// Khi phiên từng gõ `/context`, host tự in SỰ THẬT ra transcript — ưu tiên đọc nó, không đoán.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// 🔴 CÔ LẬP `GLOBAL_MEMORY_DB` TRƯỚC KHI NẠP MODULE (cùng bẫy `realtime-capture.test.mjs` đã
// tránh, suýt dính lại ở đây): `readContextUsage(file)` không truyền `memory` sẽ tự gọi
// `windowMemoryAt()` mặc định → đọc THẬT `data/context-guard/observed-window.json` của máy này
// — mà file đó đã có sẵn `"claude-opus-5": 1000000` từ lịch sử thật. Không cô lập thì test
// "có /context thật" XANH ngay cả khi tắt hẳn code ưu tiên ground-truth (đo được: mutation sống
// sót ở lượt đầu, vì test đọc trúng đúng con số đã học sẵn ngoài đời — sai không phải do code).
process.env.GLOBAL_MEMORY_DB = join(mkdtempSync(join(tmpdir(), "zctx-env-")), "memory.db");
const { parseContextWindowTokens, lastContextCommandWindow, readContextUsage } = await import("../../dist/memory/context-guard.js");

// Chuỗi THẬT, chép nguyên văn từ transcript thật của máy này (đo 2026-08-30, phiên
// c77e06a0-90a3-4d87-9d1a-060f7d5b7dcd, lệnh `/context` chạy 2026-07-31).
const REAL_CONTEXT_OUTPUT =
  "<local-command-stdout>## Context Usage\n\n**Model:** claude-opus-5  \n**Tokens:** 645k / 1m (64%)\n\n### Estimated usage by category\n\n| Category | Tokens | Percentage |\n|----------|--------|------------|\n| Messages | 608.9k | 60.9% |\n";

test("parseContextWindowTokens: đọc đúng mẫu số THẬT từ chuỗi /context thật", () => {
  assert.equal(parseContextWindowTokens(REAL_CONTEXT_OUTPUT), 1_000_000);
});

test("parseContextWindowTokens: cả tử số lẫn mẫu số cùng đơn vị k", () => {
  assert.equal(parseContextWindowTokens("**Tokens:** 190k / 200k (95%)"), 200_000);
});

test("parseContextWindowTokens: đường lùi số trần không viết tắt", () => {
  assert.equal(parseContextWindowTokens("**Tokens:** 12,345 / 200,000 (6%)"), 200_000);
});

test("parseContextWindowTokens: không khớp mẫu ⇒ null, không đoán bậy", () => {
  assert.equal(parseContextWindowTokens("không có gì liên quan ở đây"), null);
  assert.equal(parseContextWindowTokens(""), null);
});

function tmpTranscript(lines) {
  const dir = mkdtempSync(join(tmpdir(), "zctx-"));
  const file = join(dir, "t.jsonl");
  writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return file;
}

test("lastContextCommandWindow: đọc được cửa sổ thật từ khối local_command thật trong transcript", () => {
  const file = tmpTranscript([
    { type: "user", message: { content: "hello" } },
    { type: "system", subtype: "local_command", content: REAL_CONTEXT_OUTPUT },
    { type: "assistant", message: { model: "claude-opus-5", usage: { input_tokens: 1, cache_read_input_tokens: 100 } } },
  ]);
  assert.equal(lastContextCommandWindow(file), 1_000_000);
});

test("lastContextCommandWindow: NHIỀU lần /context trong phiên ⇒ lấy lần GẦN NHẤT (mới nhất)", () => {
  const file = tmpTranscript([
    { type: "system", subtype: "local_command", content: "**Tokens:** 50k / 200k (25%)" },
    { type: "assistant", message: {} },
    { type: "system", subtype: "local_command", content: "**Tokens:** 900k / 1m (90%)" },
  ]);
  assert.equal(lastContextCommandWindow(file), 1_000_000, "phải lấy lần SAU (đổi model/mode giữa phiên là có thật)");
});

test("lastContextCommandWindow: chữ 'Tokens:' xuất hiện ở subtype KHÁC (vd trong nội dung chat) không được khớp nhầm", () => {
  const file = tmpTranscript([
    { type: "system", subtype: "compact_boundary", content: "bàn về **Tokens:** 999k / 999m — không phải khối /context thật", compactMetadata: {} },
    { type: "assistant", message: { model: "claude-opus-5", usage: { input_tokens: 5 } } },
  ]);
  assert.equal(lastContextCommandWindow(file), null, "chỉ khối subtype='local_command' mới được tin, không phải mọi chỗ có chữ Tokens:");
});

test("lastContextCommandWindow: subtype SAI dù dòng thô có lọt qua bộ lọc rẻ (chứa cả hai chữ) vẫn phải bị JSON loại", () => {
  // Bộ lọc rẻ ở đây chỉ soi CHUỖI THÔ (`includes("local_command")`) trước khi parse JSON — dòng
  // này cố tình nhắc chữ "local_command" trong nội dung để lọt qua bộ lọc đó, buộc phép so sánh
  // `subtype !== "local_command"` ở tầng JSON phải là thứ CHẶN THẬT, không phải bộ lọc rẻ chặn hộ.
  const file = tmpTranscript([
    { type: "system", subtype: "other", content: "giải thích cơ chế local_command và in ra **Tokens:** 777k / 777m" },
    { type: "assistant", message: { model: "claude-opus-5", usage: { input_tokens: 5 } } },
  ]);
  assert.equal(lastContextCommandWindow(file), null, "subtype khác 'local_command' phải bị JSON-level loại, không được đọc nhầm 777m");
});

test("lastContextCommandWindow: chưa từng /context trong phiên ⇒ null (readContextUsage tự rơi về đoán)", () => {
  const file = tmpTranscript([{ type: "assistant", message: { model: "claude-opus-5", usage: { input_tokens: 5 } } }]);
  assert.equal(lastContextCommandWindow(file), null);
});

test("readContextUsage: có /context thật trong phiên ⇒ percent tính theo cửa sổ THẬT, không theo đoán", () => {
  const file = tmpTranscript([
    { type: "system", subtype: "local_command", content: "**Tokens:** 300k / 1m (30%)" },
    { type: "assistant", message: { model: "claude-opus-5", usage: { input_tokens: 0, cache_read_input_tokens: 190_000, cache_creation_input_tokens: 0 } } },
  ]);
  const u = readContextUsage(file);
  // Model "claude-opus-5" KHÔNG mang [1m] ⇒ windowFor() một mình sẽ đoán 200_000 (⇒ percent 95%,
  // báo NGAY). Có bằng chứng /context (1_000_000) ⇒ percent đúng phải chỉ ~19% — im lặng đúng.
  assert.equal(u.window, 1_000_000);
  assert.ok(u.percent < 20, `percent phải nhỏ (cửa sổ thật là 1M), đo được ${u.percent}`);
});
