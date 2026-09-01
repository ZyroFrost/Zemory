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
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
const _read = readFileSync;
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

// ── Nhánh ĐỌC THẲNG TRANSCRIPT cho phiên cũ (thêm 2026-09-02, user bắt được) ──────────────
// Bản đầu của endpoint CHỈ đọc sổ `.ctx.json` — mà sổ chỉ tồn tại từ lúc bản vá `stop` chạy ⇒
// mọi phiên trước đó hiện `~token` thay vì `%` dù transcript còn nguyên trên đĩa và mang `usage`
// do host tự khai. User: *"sao có mấy cái nó ko hiện %"*. Bốn ràng buộc dưới đây là bốn chỗ dễ
// làm sai của nhánh vá, và mỗi cái đều đo được từ nguồn.
test("`/session-context`: tra đường transcript qua `ingest_state`, KHÔNG quét thư mục", () => {
  const i = UI.indexOf('p === "/session-context"');
  const branch = UI.slice(i, UI.indexOf('p === "/insights"', i));
  assert.match(branch, /FROM ingest_state WHERE session_id IN/, "phải dùng bảng đã có ánh xạ id↔đường dẫn");
  assert.ok(!/readdirSync/.test(branch), "KHÔNG được quét thư mục: 7 ms một truy vấn vs quét cả cây");
});

test("`/session-context`: một id có NHIỀU đường ⇒ chỉ nhận đường TỒN TẠI tại chỗ", () => {
  const i = UI.indexOf('p === "/session-context"');
  const branch = UI.slice(i, UI.indexOf('p === "/insights"', i));
  // Đo trên kho thật: 40 id trả 52 hàng `ingest_state`, và 16/52 đường là của MÁY KHÁC.
  assert.match(branch, /existsSync\(r\.file_path\)/, "phải kiểm tồn tại trước khi đọc");
  assert.match(branch, /if \(!byId\.has\(r\.session_id\)\)/, "phải giữ đường đầu tiên HỢP LỆ, không ghi đè bừa");
});

test("`/session-context`: mốc `at` lấy MTIME transcript, KHÔNG phải Date.now()", () => {
  const i = UI.indexOf('p === "/session-context"');
  const branch = UI.slice(i, UI.indexOf('p === "/insights"', i));
  const measured = branch.slice(branch.indexOf("② ĐỌC THẲNG TRANSCRIPT"));
  assert.match(measured, /statSync\(fp\)\.mtimeMs/, "mốc phải là lần transcript ghi cuối");
  assert.ok(
    !/at:\s*new Date\(\)\.toISOString\(\)/.test(measured),
    "lấy Date.now() là MỌI phiên cũ đều hiện như đang chạy (● thay vì ◐) — bề mặt nói dối",
  );
});

test("`/session-context`: TRẦN id/lượt để không khoá event loop của daemon", () => {
  const i = UI.indexOf('p === "/session-context"');
  const branch = UI.slice(i, UI.indexOf('p === "/insights"', i));
  const m = /\.slice\(0,\s*(\d+)\)/.exec(branch);
  assert.ok(m, "phải có trần số id");
  const cap = Number(m[1]);
  // `readContextUsage` là I/O ĐỒNG BỘ ~11,5 ms/phiên. 40 ⇒ ~460 ms: chấp nhận được.
  // 120 ⇒ ~1,4 s và trong 1,4 s đó mọi endpoint khác đứng hình (lỗi đã trả giá 2026-08-23).
  assert.ok(cap > 0 && cap <= 60, `trần phải trong khoảng an toàn, thấy ${cap}`);
});

// ── CỘNG DỒN NÉN (user chốt 2026-09-02) ───────────────────────────────────────────────────
// *"phải tính cộng dồn nếu có lần nào nó chạy compact, vì compact là nó nén 1 lần rồi sẽ ko chính
// xác nữa"*. Đúng: nén xong context tụt về ~30%, nên `percent` một mình NÓI DỐI về độ lớn phiên.
// Đo trên transcript thật của máy này: phiên `95074025` nén **3 lần**, hiện tại 50,8%, nhưng TỔNG
// đã tiêu **3.516.281** token. Badge chỉ hiện "50,8%" là sai lệch một bậc độ lớn.
const { scanCompactions } = await import("../../dist/memory/context-guard.js");

function writeWithCompactions(name, pres, tailTokens) {
  const p = join(ROOT, name);
  const lines = [];
  for (const pre of pres) {
    lines.push(JSON.stringify({ type: "system", subtype: "compact_boundary", compactMetadata: { trigger: "auto", preTokens: pre } }));
    lines.push(JSON.stringify({ type: "user", message: { role: "user", content: "tiep" } }));
  }
  lines.push(JSON.stringify({
    type: "assistant",
    message: { role: "assistant", model: "claude-opus-5", content: [{ type: "text", text: "ok" }], usage: { input_tokens: tailTokens, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
  }));
  writeFileSync(p, lines.join("\n") + "\n");
  return p;
}

test("scanCompactions: ĐẾM đúng số lần + CỘNG đúng preTokens", () => {
  const p = writeWithCompactions("c1.jsonl", [1_001_459, 1_003_431, 999_318], 508_420);
  const sc = scanCompactions(p, 0);
  assert.equal(sc.count, 3, "phải đếm đủ 3 lần nén");
  assert.equal(sc.preTokensSum, 3_004_208, "phải cộng đúng preTokens, không làm tròn/bỏ sót");
  assert.ok(sc.scannedTo > 0);
});

test("scanCompactions: TĂNG DẦN — quét lại từ `scannedTo` ra 0, KHÔNG cộng trùng", () => {
  const p = writeWithCompactions("c2.jsonl", [1_000_000, 1_000_000], 300_000);
  const first = scanCompactions(p, 0);
  assert.equal(first.count, 2);
  const again = scanCompactions(p, first.scannedTo);
  assert.equal(again.count, 0, "cộng trùng là con số phình vô hạn theo số lượt stop");
  assert.equal(again.preTokensSum, 0);
});

test("scanCompactions: nén MỚI thêm vào sau ⇒ lượt sau chỉ đếm phần MỚI", () => {
  const p = writeWithCompactions("c3.jsonl", [1_000_000], 100_000);
  const first = scanCompactions(p, 0);
  assert.equal(first.count, 1);
  // Thêm một lần nén nữa vào cuối file (phiên chạy tiếp).
  const extra = JSON.stringify({ type: "system", subtype: "compact_boundary", compactMetadata: { preTokens: 777_000 } }) + "\n";
  writeFileSync(p, readFileSync(p, "utf8") + extra);
  const second = scanCompactions(p, first.scannedTo);
  assert.equal(second.count, 1, "chỉ phần mới");
  assert.equal(second.preTokensSum, 777_000);
});

test("scanCompactions: file NGẮN lại (bị thay) ⇒ quét lại từ 0 thay vì tin mốc cũ", () => {
  const p = writeWithCompactions("c4.jsonl", [1_000_000, 1_000_000], 50_000);
  const big = scanCompactions(p, 0);
  // Thay bằng file ngắn hơn, chỉ 1 lần nén.
  writeWithCompactions("c4.jsonl", [500_000], 10_000);
  const after = scanCompactions(p, big.scannedTo);
  assert.equal(after.count, 1, "mốc cũ vượt kích thước file ⇒ phải quét lại từ đầu, không trả 0");
});

test("scanCompactions: file không tồn tại ⇒ null, không ném", () => {
  assert.equal(scanCompactions(join(ROOT, "khong-co-that.jsonl"), 0), null);
});

test("`stop` CỘNG DỒN qua nhiều lượt, và `totalTokens` = preTokensSum + tokens hiện tại", () => {
  const p = writeWithCompactions("c5.jsonl", [1_000_000, 1_000_000], 400_000);
  handleHook("stop", { session_id: "sid-congdon", transcript_path: p, cwd: ROOT });
  const st1 = readContextState("sid-congdon", GUARD);
  assert.ok(st1, "phải có sổ");
  assert.equal(st1.compactions, 2, "đếm được 2 lần nén");
  assert.equal(st1.preTokensSum, 2_000_000);
  assert.equal(st1.totalTokens, 2_400_000, "tổng = đã nén đi + đang dùng");

  // Lượt stop THỨ HAI trên cùng file: KHÔNG được cộng trùng.
  handleHook("stop", { session_id: "sid-congdon", transcript_path: p, cwd: ROOT });
  const st2 = readContextState("sid-congdon", GUARD);
  assert.equal(st2.compactions, 2, "lượt sau không được đếm lại 2 lần nén cũ");
  assert.equal(st2.preTokensSum, 2_000_000);
});

test("FE: mức an toàn dùng --success (XANH), cam/đỏ giữ nguyên", () => {
  const FE = readFileSync(new URL("../../frontend/scripts/session.js", import.meta.url), "utf8");
  const i = FE.indexOf("function ctxBadge");
  const branch = FE.slice(i, FE.indexOf("function paintCtxBadges", i));
  assert.match(branch, /var\(--success\)/, "xám không thấy gì trên nền tối (user chốt) ⇒ phải là xanh");
  assert.ok(!/'var\(--text-faint\)'\)/.test(branch.split("var col=")[1].split(";")[0] + ")"), "không còn xám ở nhánh an toàn");
  assert.match(branch, /var\(--warn\)/, "cam giữ nguyên");
  assert.match(branch, /var\(--danger\)/, "đỏ giữ nguyên");
});

test("FE: badge dùng % CỘNG DỒN — vượt 100% chính là dấu hiệu đã nén", () => {
  // User chốt 2026-09-02: *"kiểu là vượt 100% chính xác bao nhiêu để biết là nén"*. Một con số duy
  // nhất giữ cả cột so sánh được, và nó TỰ NÓI: 136% = nén 1 lần · 352% = nén 3 lần. Phiên chưa
  // nén thì `totalTokens === tokens` nên con số này TRÙNG % hiện tại ⇒ badge không đổi gì.
  const FE = readFileSync(new URL("../../frontend/scripts/session.js", import.meta.url), "utf8");
  const i = FE.indexOf("function ctxBadge");
  const branch = FE.slice(i, FE.indexOf("function paintCtxBadges", i));
  assert.match(branch, /c\.compactions/, "phải đọc số lần nén");
  assert.match(
    branch,
    /totalPct\s*=\s*c\.window\s*\?\s*Math\.round\(100\s*\*\s*tot\s*\/\s*c\.window\)/,
    "% phải tính từ TỔNG đã tiêu, không phải token của chu kỳ hiện tại",
  );
  // Cả hai lối ra của badge phải in `totalPct`, không phải `pct` — nếu còn `pct` thì phiên đã nén
  // vẫn hiện % chu kỳ và toàn bộ mục đích của lượt này mất.
  const returns = branch.match(/return '<span title[^;]+;/g) || [];
  assert.ok(returns.length >= 2, `phải có ít nhất 2 lối ra badge, thấy ${returns.length}`);
  for (const r of returns) {
    if (!/%/.test(r)) continue;
    assert.match(r, /totalPct/, "lối ra badge phải dùng totalPct");
    assert.ok(!/\+\s*pct\s*\+\s*'%/.test(r), "không được in pct (chu kỳ hiện tại) làm số chính");
  }
  // Số 7 chữ số KHÔNG được nằm trong badge — cả cột là %, chen số dài vào là mất so sánh bằng mắt.
  for (const r of returns) assert.ok(!/zN\(tot\)/.test(r), "tổng token thuộc tooltip, không thuộc badge");
  assert.match(branch, /ctx\.compactT/, "tooltip phải giải thích + mang con số tổng");
});

test("FE: MÀU lấy theo chu kỳ HIỆN TẠI, không theo % cộng dồn", () => {
  // Màu là cảnh báo "sắp bị nén" (chu kỳ hiện tại); % cộng dồn là thước đo ĐỘ LỚN. Trộn hai thứ
  // thì một phiên đã nén 3 lần lúc nào cũng đỏ dù hiện tại mới 50% — cảnh báo mất nghĩa.
  const FE = readFileSync(new URL("../../frontend/scripts/session.js", import.meta.url), "utf8");
  const i = FE.indexOf("function ctxBadge");
  const branch = FE.slice(i, FE.indexOf("function paintCtxBadges", i));
  const colLine = /var col=([^;]+);/.exec(branch);
  assert.ok(colLine, "phải có dòng tính màu");
  assert.match(colLine[1], /\bpct\b/, "màu phải dùng pct (chu kỳ hiện tại)");
  assert.ok(!/totalPct/.test(colLine[1]), "màu KHÔNG được dùng % cộng dồn");
});
