// Realtime capture + context-guard (user chốt 2026-08-02: "mỗi 1 mes phải tự đưa lên luôn").
//
// Bốn thứ phải luôn đúng, mỗi cái là một cách hỏng đã lường trước:
//   · đường per-message phải nạp ĐÚNG MỘT file — rơi về `scan()` cả kho là 1,8–7s (và ~125s
//     khi embed nền chạy) trên MỖI lượt trả lời, tức là tính năng tự nó phải bị tắt;
//   · đồng hồ context phải IM khi chưa tới ngưỡng (0 ký tự = 0 token), và chỉ kêu MỘT lần;
//   · SessionStart chỉ mở miệng khi host báo `source=compact` — mọi phiên khác phải im,
//     nếu không đây thành auto-inject memory mỗi phiên (điều 8 cấm);
//   · công tắc realtime phải kéo theo hook THẬT trong settings, và tắt phải gỡ được.

import assert from "node:assert/strict";
import test from "node:test";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tempDir } from "./helpers.mjs";

// Cờ "đã cảnh báo phiên này" nằm CẠNH DB (`currentMemoryDir()`), nên phải trỏ DB sang thư
// mục tạm TRƯỚC khi nạp module — nếu không, chạy test là ném rác vào kho dữ liệu THẬT của
// máy (đã dính đúng một lần: `data/context-guard/*.warned`). `GLOBAL_MEMORY_DB` đọc lúc
// nạp module ⇒ bắt buộc dùng import ĐỘNG sau khi set env.
process.env.GLOBAL_MEMORY_DB = join(mkdtempSync(join(tmpdir(), "zrt-env-")), "memory.db");
const { openMemory } = await import("../../dist/memory/db.js");
const { scanOneFile } = await import("../../dist/memory/ingest.js");
const { lastCompactAt, readContextUsage, windowFor } = await import("../../dist/memory/context-guard.js");
const { handleHook, hooksInstalled, installHooks, uninstallHooks } = await import("../../dist/memory/capture-hook.js");

/** Một transcript Claude Code tối thiểu, đặt ĐÚNG chỗ adapter nhận (`.claude/projects/...`). */
function fakeTranscript(t, lines) {
  const home = tempDir(t, "zrt-");
  const dir = join(home, ".claude", "projects", "d--proj");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "sess-rt.jsonl");
  writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return { home, file };
}

const userMsg = (uuid, text) => ({
  type: "user",
  uuid,
  timestamp: "2026-08-02T10:00:00.000Z",
  cwd: "D:\\proj",
  message: { role: "user", content: text },
});

const assistantMsg = (uuid, text, usage) => ({
  type: "assistant",
  uuid,
  timestamp: "2026-08-02T10:00:01.000Z",
  cwd: "D:\\proj",
  message: { role: "assistant", model: "claude-opus-5[1m]", content: [{ type: "text", text }], usage },
});

test("scanOneFile nạp ĐÚNG một file, incremental, idempotent", (t) => {
  const { file } = fakeTranscript(t, [userMsg("u1", "câu hỏi đầu"), assistantMsg("a1", "trả lời đầu")]);
  const dbPath = join(tempDir(t, "zrtdb-"), "m.db");

  const first = scanOneFile(file, { dbPath });
  assert.equal(first.ingested, true, "adapter phải nhận file trong .claude/projects");
  assert.equal(first.source, "claude-code");
  assert.equal(first.newMessages, 2);

  // Chạy lại khi KHÔNG có gì mới ⇒ 0 tin thêm (idempotent, không nhân đôi).
  assert.equal(scanOneFile(file, { dbPath }).newMessages, 0, "chạy lại không được nạp trùng");

  // Thêm một lượt nữa ⇒ chỉ phần ĐUÔI được nạp.
  const more = readFileSync(file, "utf8") + JSON.stringify(userMsg("u2", "câu hỏi hai")) + "\n";
  writeFileSync(file, more);
  assert.equal(scanOneFile(file, { dbPath }).newMessages, 1, "chỉ nạp phần mới");

  const db = openMemory(dbPath);
  try {
    assert.equal(db.prepare("SELECT COUNT(*) c FROM messages").get().c, 3);
    assert.equal(db.prepare("SELECT COUNT(*) c FROM session_digest").get().c, 1, "digest phiên đó phải được dựng");
  } finally {
    db.close();
  }
});

test("đường lạ / không adapter nào nhận ⇒ KHÔNG rơi về quét cả kho", (t) => {
  const dbPath = join(tempDir(t, "zrtdb2-"), "m.db");
  const stray = join(tempDir(t, "zstray-"), "somewhere.jsonl");
  writeFileSync(stray, JSON.stringify(userMsg("x", "lạc")) + "\n");
  const r = scanOneFile(stray, { dbPath });
  assert.equal(r.ingested, false, "không nhận thì phải nói không nhận");
  assert.equal(r.newMessages, 0);
  const gone = scanOneFile(join(stray, "khong-ton-tai.jsonl"), { dbPath });
  assert.equal(gone.ingested, false, "file không tồn tại cũng phải trả về gọn, không ném");
});

test("windowFor: bản 1M và bản 200k không được lẫn; model lạ ⇒ null", () => {
  assert.equal(windowFor("claude-opus-5[1m]"), 1_000_000);
  assert.equal(windowFor("claude-opus-5"), 200_000);
  assert.equal(windowFor("gpt-4o"), null, "model lạ ⇒ không biết cửa sổ ⇒ KHÔNG được đoán");
  assert.equal(windowFor(undefined), null);
});

test("windowFor TỰ SỬA khi số đo vượt cửa sổ giả định (phiên 1M ghi model id 200k)", () => {
  // Lỗi THẬT bắt được lúc chạy bề mặt sống 2026-08-02: transcript ghi `claude-opus-5`
  // (không có hậu tố 1M) trong khi phiên chạy cửa sổ 1M ⇒ hook hét "Context ~295%".
  // Một phiên không thể dùng quá cửa sổ của chính nó, nên số vượt 100% là bằng chứng
  // giả định sai — dùng luôn nó để nâng bậc.
  assert.equal(windowFor("claude-opus-5", 590_191), 1_000_000, "vượt 200k ⇒ cửa sổ thật phải là 1M");
  assert.equal(windowFor("claude-opus-5", 150_000), 200_000, "trong ngưỡng thì giữ nguyên bậc");
  assert.equal(windowFor("claude-opus-5", 5_000_000), null, "vượt cả bậc cao nhất ⇒ số không đáng tin ⇒ IM, không hét bậy");
});

test("readContextUsage cộng đúng ba phần usage của bản ghi assistant CUỐI", (t) => {
  const { file } = fakeTranscript(t, [
    userMsg("u1", "a"),
    assistantMsg("a1", "b", { input_tokens: 1, cache_read_input_tokens: 100, cache_creation_input_tokens: 10, output_tokens: 5 }),
    userMsg("u2", "c"),
    assistantMsg("a2", "d", { input_tokens: 2, cache_read_input_tokens: 950_000, cache_creation_input_tokens: 3_000, output_tokens: 7 }),
  ]);
  const u = readContextUsage(file);
  assert.equal(u.tokens, 953_002, "phải cộng input + cache_read + cache_creation của bản ghi CUỐI");
  assert.equal(u.window, 1_000_000);
  assert.ok(u.percent > 95 && u.percent < 96, `~95.3% — nhận ${u.percent}`);
  assert.equal(readContextUsage(file + ".khongco"), null, "file không đọc được ⇒ null, không ném");
});

test("đồng hồ context IM khi dưới ngưỡng, và chỉ kêu MỘT lần cho cả phiên", (t) => {
  const low = fakeTranscript(t, [
    userMsg("u1", "a"),
    assistantMsg("a1", "b", { input_tokens: 1, cache_read_input_tokens: 100_000, cache_creation_input_tokens: 0 }),
  ]);
  assert.equal(
    handleHook("prompt", { transcript_path: low.file, session_id: "s-low", cwd: low.home }),
    "",
    "10% cửa sổ ⇒ phải im TUYỆT ĐỐI (0 ký tự = 0 token)",
  );

  const high = fakeTranscript(t, [
    userMsg("u1", "a"),
    assistantMsg("a1", "b", { input_tokens: 2, cache_read_input_tokens: 985_000, cache_creation_input_tokens: 0 }),
  ]);
  const sid = `s-high-${Date.now()}`;
  const first = handleHook("prompt", { transcript_path: high.file, session_id: sid, cwd: high.home });
  assert.match(first, /Context ~9[89]%/, "chạm ngưỡng phải cảnh báo kèm số ĐO được");
  assert.match(first, /memory_context/, "phải dặn đường dựng lại sau khi nén");
  assert.equal(
    handleHook("prompt", { transcript_path: high.file, session_id: sid, cwd: high.home }),
    "",
    "lần hai trong CÙNG phiên phải im — không lặp mỗi prompt",
  );
});

test("nén xong thì MỞ LẠI quyền cảnh báo — một lần mỗi CHU KỲ ĐẦY, không phải mỗi phiên", (t) => {
  // Đo transcript thật trên máy này (30 lần nén): 7/19 phiên bị nén NHIỀU HƠN MỘT LẦN, cá
  // biệt một phiên 6 lần. Giữ cờ theo phiên ⇒ từ lần nén thứ hai trở đi im lặng, đúng lúc
  // cần nhắc nhất.
  const high = fakeTranscript(t, [
    userMsg("u1", "a"),
    assistantMsg("a1", "b", { input_tokens: 2, cache_read_input_tokens: 985_000, cache_creation_input_tokens: 0 }),
  ]);
  const sid = `s-cycle-${Date.now()}`;
  const arg = { transcript_path: high.file, session_id: sid, cwd: high.home };

  assert.match(handleHook("prompt", arg), /Context ~/, "chu kỳ 1: phải cảnh báo");
  assert.equal(handleHook("prompt", arg), "", "vẫn trong chu kỳ 1: im");

  // BẤM NHẦM rồi HUỶ: móc PreCompact đã chạy nhưng transcript KHÔNG có dấu nén ⇒ phải coi
  // như chưa từng bấm, không được mở chu kỳ giả rồi cảnh báo lại.
  handleHook("pre-compact", arg);
  assert.equal(handleHook("prompt", arg), "", "bấm nhầm compact rồi huỷ ⇒ vẫn im (chưa nén thật)");

  // Nén THẬT: host ghi bản ghi `compact_boundary` vào transcript.
  appendFileSync(
    high.file,
    JSON.stringify({
      type: "system",
      subtype: "compact_boundary",
      timestamp: new Date(Date.now() + 1000).toISOString(),
      compactMetadata: { trigger: "auto", preTokens: 985_002 },
    }) + "\n",
  );
  assert.match(handleHook("prompt", arg), /Context ~/, "sau khi nén THẬT: phải cảnh báo lại cho chu kỳ mới");
});

test("dấu nén phải là bản ghi THẬT — chữ 'compact_boundary' trong nội dung chat không tính", (t) => {
  // Đã dính đúng bẫy này lúc đo thống kê: phiên đang BÀN về compact bị đếm thành lần nén.
  const { file } = fakeTranscript(t, [
    userMsg("u1", "bàn về compact_boundary trong transcript"),
    assistantMsg("a1", "type system subtype compact_boundary là gì", { input_tokens: 1 }),
  ]);
  assert.equal(lastCompactAt(file), 0, "nhắc tới tên bản ghi KHÔNG phải là đã nén");
  appendFileSync(
    file,
    JSON.stringify({ type: "system", subtype: "compact_boundary", timestamp: "2026-08-02T10:00:00.000Z", compactMetadata: { trigger: "manual" } }) + "\n",
  );
  assert.equal(lastCompactAt(file), Date.parse("2026-08-02T10:00:00.000Z"), "bản ghi thật thì phải nhận");
});

test("SessionStart chỉ nói khi source=compact; phiên bình thường phải IM", (t) => {
  const { home, file } = fakeTranscript(t, [userMsg("u1", "a"), assistantMsg("a1", "b", { input_tokens: 1 })]);
  assert.equal(handleHook("session-start", { cwd: home, transcript_path: file }), "", "phiên mở bình thường ⇒ im (điều 8)");
  assert.equal(handleHook("session-start", { cwd: home, source: "resume" }), "", "resume cũng im");
  const out = handleHook("session-start", { cwd: home, source: "compact" });
  const payload = JSON.parse(out);
  assert.equal(payload.hookSpecificOutput.hookEventName, "SessionStart");
  assert.match(payload.hookSpecificOutput.additionalContext, /NÉN/, "phải nói rõ vừa bị nén");
  assert.match(payload.hookSpecificOutput.additionalContext, /memory_context/);
});

test("Stop hook nạp qua transcript_path (không đụng scan cả kho)", (t) => {
  const { home, file } = fakeTranscript(t, [userMsg("u1", "xin chào"), assistantMsg("a1", "chào", { input_tokens: 1 })]);
  // Không ném, không in gì — và quan trọng: có đường transcript thì KHÔNG gọi scan().
  assert.equal(handleHook("stop", { cwd: home, transcript_path: file }), "");
  assert.equal(handleHook("pre-compact", { cwd: home, transcript_path: file }), "");
});

test("công tắc realtime phải khai hook THẬT — và tắt thì gỡ sạch, giữ hook của user", (t) => {
  const dir = tempDir(t, "zhooks-");
  const settings = join(dir, "settings.json");
  writeFileSync(settings, JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: "user-riêng" }] }] } }, null, 2));

  assert.equal(hooksInstalled(settings), false, "chưa cài thì phải nói chưa");
  const added = installHooks(settings);
  assert.ok(added.added.length >= 4, `phải khai đủ 4 móc, nhận ${added.added.length}`);
  assert.equal(hooksInstalled(settings), true);

  const after = JSON.parse(readFileSync(settings, "utf8"));
  const events = Object.keys(after.hooks);
  for (const want of ["Stop", "UserPromptSubmit", "PreCompact", "SessionStart"]) {
    assert.ok(events.includes(want), `thiếu sự kiện ${want}`);
  }

  const removed = uninstallHooks(settings);
  assert.ok(removed.removed.length >= 4, "tắt phải gỡ được, không thì bật một lần là dính vĩnh viễn");
  assert.equal(hooksInstalled(settings), false);
  const end = JSON.parse(readFileSync(settings, "utf8"));
  const stop = JSON.stringify(end.hooks?.Stop ?? []);
  assert.match(stop, /user-riêng/, "hook của USER trong cùng sự kiện phải còn NGUYÊN");
  assert.ok(!stop.includes("zemory hook"), "không được sót móc của zemory");
});
