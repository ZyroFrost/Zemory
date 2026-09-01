// Cổng cho lỗ ĐÃ ĐO 2026-09-02: phép kiểm context chỉ nằm ở nhánh `prompt` (`UserPromptSubmit`),
// mà context phình TRONG lượt của assistant — nên phiên chạm ngưỡng rồi KẾT THÚC (user không gõ
// thêm) thì không bao giờ được báo.
//
// Số đo trên 40 phiên thật của máy này: **8 phiên vượt ngưỡng 90%, chỉ 1 có cờ `.warned` — bỏ sót
// 7**. Không phiên nào từng bị nén (⇒ cờ không bị xoá oan) và cả 7 đều CÓ cờ `.harness` (⇒ hook
// chạy bình thường). Tỉ lệ cờ tự nói: 46 `.harness` / 11 `.warned`.
//
// Vá: `stop` ĐO + ghi sổ bền `<sid>.ctx.json`. Ba ràng buộc dưới đây là ba chỗ dễ làm sai, và mỗi
// cái đều đo được:
//   ① `stop` PHẢI ghi sổ khi có transcript — đây là chính cái lỗ;
//   ② `stop` PHẢI trả CHUỖI RỖNG — nó là hook write-only, 0 token, no context change (HP điều 10);
//      phun chữ ở đây là phá bất biến, và bất biến đó không có cổng nào canh trước bản này;
//   ③ không biết cửa sổ ⇒ KHÔNG ghi sổ. Mẫu số `null` mà vẫn ghi thì UI chỉ còn cách đoán, và
//      "không biết" phải hiện ra là không biết.

// ⚠ PHẢI trỏ `GLOBAL_MEMORY_DB` sang kho tạm TRƯỚC rồi mới `import` động: `memory/db.ts` đọc env
// ĐÚNG MỘT LẦN lúc nạp module, nên đặt env trong thân từng test là vô tác dụng — cùng bẫy mà
// `autosync-schedule.test.mjs` và `writegate.test.mjs` đã phải học. Một kho tạm cho cả file, mỗi
// ca dùng một `session_id` riêng để không đụng nhau.
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = mkdtempSync(join(tmpdir(), "zemory-ctxstop-"));
process.env.GLOBAL_MEMORY_DB = join(ROOT, "global_memory.db");
const GUARD = join(ROOT, "context-guard");

const { handleHook, readContextState } = await import("../../dist/memory/capture-hook.js");

/** Một transcript tối thiểu mà `readContextUsage` đọc được: bản ghi cuối mang `usage` + model. */
function writeTranscript(dir, name, tokens, model = "claude-opus-5") {
  const p = join(dir, name);
  const lines = [
    JSON.stringify({ type: "user", message: { role: "user", content: "xin chao" }, timestamp: new Date().toISOString() }),
    JSON.stringify({
      type: "assistant",
      message: {
        role: "assistant",
        model,
        content: [{ type: "text", text: "ok" }],
        usage: { input_tokens: tokens, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 10 },
      },
      timestamp: new Date().toISOString(),
    }),
  ];
  writeFileSync(p, lines.join("\n") + "\n");
  return p;
}

test("① `stop` GHI SỔ context — chỗ lỗ nằm: trước bản này nhánh stop không đo gì", () => {
  const tp = writeTranscript(ROOT, "s1.jsonl", 300_000);

  const out = handleHook("stop", { session_id: "sid-ghi-so", transcript_path: tp, cwd: ROOT });

  const st = readContextState("sid-ghi-so", GUARD);
  assert.ok(st, "PHẢI có sổ sau một lượt stop — không có nghĩa là lỗ vẫn còn");
  assert.equal(st.tokens, 300_000, "token phải là số ĐO từ transcript, không phải ước lượng");
  assert.ok(st.window >= 300_000, "cửa sổ phải chứa nổi số đã đo");
  assert.equal(typeof st.threshold, "number", "phải ghi lại NGƯỠNG đã áp, để UI khỏi đoán");
  assert.equal(typeof st.over, "boolean");
  assert.ok(Date.parse(st.at) > 0, "phải có mốc thời gian");
  assert.equal(out, "", "và vẫn không phun chữ — xem ca ②");
});

test("② `stop` KHÔNG BAO GIỜ phun chữ (0 token, no context change — HP điều 10)", () => {
  // Kể cả khi VƯỢT ngưỡng — đây đúng là lúc dễ bị cám dỗ phun cảnh báo ra.
  const tp = writeTranscript(ROOT, "s2.jsonl", 990_000);

  const out = handleHook("stop", { session_id: "sid-im-lang", transcript_path: tp, cwd: ROOT });

  assert.equal(out, "", "vượt ngưỡng cũng phải IM — chữ đi qua `prompt` và qua bề mặt app, không qua đây");
  const st = readContextState("sid-im-lang", GUARD);
  assert.ok(st, "im nhưng vẫn phải GHI SỔ");
  assert.equal(st.over, true, "990k/1M ⇒ phải đánh dấu đã vượt ngưỡng");
});

test("③ không biết cửa sổ ⇒ KHÔNG ghi sổ (không được bịa mẫu số)", () => {
  // Model lạ ⇒ `windowFor` trả null ⇒ percent null ⇒ không có gì đáng ghi.
  const tp = writeTranscript(ROOT, "s3.jsonl", 50_000, "mot-model-chua-tung-thay");

  const out = handleHook("stop", { session_id: "sid-khong-biet", transcript_path: tp, cwd: ROOT });

  assert.equal(out, "");
  assert.equal(
    readContextState("sid-khong-biet", GUARD),
    null,
    "cửa sổ không biết ⇒ tuyệt đối không ghi một con số %; 'không biết' phải hiện ra là không biết",
  );
});

test("fail-open: transcript không tồn tại ⇒ không ném, không ghi sổ (điều 9)", () => {
  const missing = join(ROOT, "khong-he-ton-tai.jsonl");

  let out;
  assert.doesNotThrow(() => {
    out = handleHook("stop", { session_id: "sid-thieu-file", transcript_path: missing, cwd: ROOT });
  }, "phép đo hỏng KHÔNG được làm hỏng lượt nạp");
  assert.equal(out, "");
  assert.equal(existsSync(join(GUARD, "sid-thieu-file.ctx.json")), false);
});

test("readContextState: sổ hỏng / không có ⇒ null, không ném", () => {
  const dir = GUARD;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "sid-rac.ctx.json"), "{ khong phai json");
  assert.equal(readContextState("sid-rac", dir), null, "sổ rác ⇒ null, không ném");
  assert.equal(readContextState("sid-chua-co", dir), null);
});


// ── Endpoint `/session-context` — bất biến "KHÔNG bịa mẫu số" ─────────────────────────────
// Đây là ràng buộc user chốt 2026-09-02 (*"đừng tự tạo khung đoán riêng"*), và nó dễ bị phá bởi
// một dòng "cho tiện": phiên web/codex chỉ có TỬ SỐ (ước tính chars/4 từ nội dung đã lưu), không
// có mẫu số nào — zemory không biết hội thoại đó chạy model gì, cửa sổ bao nhiêu. Trả token là
// thật; quy ra % là bịa. Cổng soi NGUỒN vì hành vi này là một quyết định về ngữ nghĩa, không phải
// một giá trị runtime.
import { readFileSync as _read } from "node:fs";
const UI = _read(new URL("../src/ui.ts", import.meta.url), "utf8");

test("`/session-context`: nhánh `estimate` KHÔNG được mang percent/window (không bịa mẫu số)", () => {
  const i = UI.indexOf('p === "/session-context"');
  assert.ok(i > 0, "phải có endpoint /session-context");
  const branch = UI.slice(i, UI.indexOf('p === "/insights"', i));
  const est = branch.slice(branch.indexOf('kind: "estimate"'));
  const obj = est.slice(0, est.indexOf("}") + 1);
  assert.ok(obj.includes("tokens"), "estimate phải trả token — đó là số THẬT đo được");
  assert.ok(!obj.includes("percent"), "estimate KHÔNG được trả percent: mẫu số không biết");
  assert.ok(!obj.includes("window"), "estimate KHÔNG được trả window: zemory không biết cửa sổ");
});

test("`/session-context`: nhánh `measured` phải mang ĐỦ tử số + mẫu số + ngưỡng", () => {
  const i = UI.indexOf('p === "/session-context"');
  const branch = UI.slice(i, UI.indexOf('p === "/insights"', i));
  const mea = branch.slice(branch.indexOf('kind: "measured"'));
  const obj = mea.slice(0, mea.indexOf("}") + 1);
  for (const f of ["percent", "tokens", "window", "threshold", "over"]) {
    assert.ok(obj.includes(f), `measured phải mang \`${f}\` — thiếu là UI lại phải đoán`);
  }
});

test("`/session-context`: một truy vấn NHÓM cho cả lô, không N+1", () => {
  const i = UI.indexOf('p === "/session-context"');
  const branch = UI.slice(i, UI.indexOf('p === "/insights"', i));
  assert.match(branch, /GROUP BY session_id/, "phải nhóm trong SQL");
  assert.match(branch, /session_id IN \(\$\{ph\}\)/, "phải truyền cả lô id vào MỘT câu");
  // Một `prepare` trong vòng lặp qua ids là dấu hiệu N+1 — 80 phiên thành 80 lượt mở câu.
  const loopThenPrepare = /for \([^)]*of rest[^]*?\.prepare\(/.test(branch);
  assert.equal(loopThenPrepare, false, "không được prepare trong vòng lặp theo id");
});
