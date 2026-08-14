// The daemon scheduler is a PROMISE MADE IN THE UI. Two places describe it —
// the settings row (`mem.schedulerD`) and the doc panel (`f.doc.scheduler`) —
// and both have always said "scan → embed → digest".
//
// 2026-07-30: the code ran only embed + sync. Nothing ingested new transcripts
// automatically. A machine sat at +2.722 unscanned messages with a healthy
// daemon, and `memory digest <session>` answered "no digest" because digest never
// ran either. The user reported it as "web scan is broken"; the real hole was
// two missing steps in scheduler.ts. Nothing was watching the gap between what
// the UI claims and what the daemon does — so this file watches it.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const SCHED = "backend/src/jobs/scheduler.ts";
const I18N = "frontend/scripts/chrome.js"; // từ điển i18n — app.js tách 2026-08-06

/** Every maintenance step the UI promises the daemon runs, in order. */
const PROMISED = ["scan", "embed", "digest"];

// 2026-08-02 — VAI ĐỔI: nạp GM là việc của Stop hook (per-message), vòng nền teo thành LƯỚI
// BÙ. Lời hứa trên UI đổi theo, nên phép kiểm cũng phải đổi — nhưng THỨ nó canh thì giữ
// nguyên: *UI hứa việc gì thì code phải làm đúng việc đó*. Panel giờ hứa hai thứ tách nhau,
// nên có hai phép kiểm: lưới bù (dưới) và realtime (test kế).
test("UI hứa lưới bù có đủ ba việc (quét vét · embed · digest) — đổi lời hứa thì đổi cả code", () => {
  const ui = read(I18N);
  const i = ui.indexOf("'mem.schedulerD':");
  assert.ok(i > 0, `${I18N}: không tìm thấy chỗ định nghĩa khoá i18n mem.schedulerD`);
  const blob = ui.slice(i, i + 900);
  for (const [what, re] of [
    ["quét vét", /quét vét|sweep/iu],
    ["embed", /embed/iu],
    ["digest", /digest/iu],
  ]) {
    assert.match(blob, re, `mem.schedulerD: lời hứa thiếu "${what}" trong khi scheduler vẫn chạy bước đó`);
  }
  // Panel doc dài hơn và vẫn mô tả chuỗi đầy đủ — nó giải thích CƠ CHẾ, không phải nhịp.
  const j = ui.indexOf("'f.doc.scheduler':");
  assert.ok(j > 0, `${I18N}: thiếu f.doc.scheduler`);
  assert.match(ui.slice(j, j + 900), /scan\s*→\s*embed\s*→\s*digest/u, "f.doc.scheduler phải còn mô tả chuỗi thật");
});

test("UI hứa realtime thì hook PHẢI được khai — và đúng 4 sự kiện của lời hứa", () => {
  // Lời hứa mới trên panel: "mỗi lượt trả lời xong là phiên được nạp ngay (<1s)" + "cảnh báo
  // khi context gần đầy" + "tự chốt sổ trước khi bị nén". Ba vế đó ĐÚNG BẰNG ba móc; thiếu
  // móc nào là hứa suông — đúng loại lỗ mà file này sinh ra để canh.
  const ui = read(I18N);
  const i = ui.indexOf("'mem.realtimeD':");
  assert.ok(i > 0, `${I18N}: thiếu mô tả công tắc realtime`);
  const blob = ui.slice(i, i + 700);
  assert.match(blob, /ngay|<1s/iu, "phải hứa nạp NGAY, không phải theo nhịp");
  assert.match(blob, /context/iu, "phải hứa cảnh báo context");
  assert.match(blob, /nén|compact/iu, "phải hứa chốt sổ trước khi bị nén");

  const hook = read("backend/src/memory/capture-hook.ts");
  for (const ev of ["Stop", "UserPromptSubmit", "PreCompact", "SessionStart"]) {
    assert.match(
      hook,
      new RegExp(String.raw`event:\s*"${ev}"`, "u"),
      `capture-hook.ts: UI hứa realtime nhưng KHÔNG khai móc ${ev}`,
    );
  }
  // Và đường nạp per-message phải là scanOneFile, không phải scan() cả kho (1,8–7s/lượt).
  assert.match(hook, /scanOneFile\(/u, "đường per-message phải dùng scanOneFile");
});

test("scheduler THẬT SỰ chạy mọi bước UI đã hứa — không chỉ một phần", () => {
  const s = read(SCHED);
  for (const step of PROMISED) {
    // Bước phải được spawn như một lệnh CLI thật: ["memory", "<step>", …]
    const re = new RegExp(String.raw`\[\s*"memory"\s*,\s*"${step}"`, "u");
    assert.match(
      s,
      re,
      `${SCHED}: UI hứa chạy "${step}" nhưng scheduler không spawn ["memory","${step}"] — đúng lỗ đã làm +2.722 tin nằm chờ`,
    );
  }
});

test("chuỗi chạy TUẦN TỰ và giữ ĐÚNG MỘT job token cho cả chuỗi", () => {
  // Song song thì embed đọc trước khi scan ghi xong; nhiều token thì một CLI
  // writer chen được vào giữa chuỗi.
  const s = read(SCHED);
  // Đột biến 2026-07-30: đổi MỘT `await runStep(` thành `void runStep(` thì phép đo
  // "có await ở đâu đó" vẫn xanh, mà chuỗi đã hoá song song. Nên đếm: MỌI lần GỌI
  // phải được await (trừ chính dòng khai báo hàm).
  const calls = (s.match(/runStep\(/gu) ?? []).length - (s.match(/function runStep\(/gu) ?? []).length;
  const awaited = (s.match(/await runStep\(/gu) ?? []).length;
  assert.ok(calls > 0, `${SCHED}: không thấy lần gọi runStep nào`);
  assert.equal(awaited, calls, `${SCHED}: ${calls - awaited}/${calls} lần gọi runStep KHÔNG await — chuỗi hoá song song, embed đọc trước khi scan ghi xong`);
  // CHUỖI maintain phải claim ĐÚNG MỘT lần. Neo cũ đếm cả file = 1; nắn theo thiết kế
  // 2026-08-13 (backup tách ra nhịp riêng nên có lần claim THỨ HAI, của `backupTick`) —
  // nắn PHẠM VI đo, KHÔNG nới bất biến: vẫn là "một token cho cả chuỗi", chỉ đo trong
  // đúng thân `maintainTick` thay vì cả file.
  const chain = s.slice(s.indexOf("async function maintainTick("), s.indexOf("async function backupTick("));
  assert.ok(chain.length > 0, `${SCHED}: không tìm thấy thân maintainTick`);
  assert.equal(
    (chain.match(/claimDaemonJob\(/gu) ?? []).length,
    1,
    `${SCHED}: chỉ được claim job MỘT lần cho cả chuỗi`,
  );
  const claimAt = s.indexOf("claimDaemonJob(");
  const releaseInFinally = /finally\s*\{[^}]*releaseDaemonJob\(\)/su.test(s.slice(claimAt));
  assert.ok(releaseInFinally, `${SCHED}: releaseDaemonJob phải nằm trong finally — một bước lỗi là token kẹt vĩnh viễn`);
  // Backup gọi từ TRONG chuỗi thì KHÔNG được claim lồng (token đã ở trong tay) — claim lồng
  // là tự khoá chính mình, đúng kiểu bế tắc mà write-gate sinh ra để tránh.
  assert.match(
    s,
    /const holdsToken = chainRunning/u,
    `${SCHED}: backupTick phải biết token đã ở trong tay khi được gọi từ trong chuỗi`,
  );
});

test("việc nền phải NHƯỜNG CPU cho người dùng (ưu tiên thấp hơn bình thường)", () => {
  // Đo 2026-08-13: hook capture ghi ~23 tin/phút trong lúc làm việc, nên backlog embed gần như
  // LUÔN dương ⇒ job nền gần như LUÔN chạy. Ở ưu tiên Normal, nó tranh CPU ngang hàng với đúng
  // việc người dùng đang làm — máy 12 core mà ONNX ăn hết thì gõ phím cũng khựng.
  //
  // Hạ ưu tiên chứ KHÔNG ghim số core: ghim cứng thì lúc máy rảnh cũng chỉ dùng được phần đã
  // ghim, còn hạ ưu tiên thì máy rảnh vẫn ăn trọn, máy bận thì tự nhường. Đã đo là ăn thật:
  // PriorityClass đổi Normal → BelowNormal ngay sau `setPriority`.
  const s = read(SCHED);
  assert.match(s, /setPriority\(/u, `${SCHED}: job nền phải hạ ưu tiên, không chạy ngang hàng với người dùng`);
  assert.match(s, /PRIORITY_BELOW_NORMAL/u, `${SCHED}: mức ưu tiên phải là BELOW_NORMAL`);
  // Fail-open: không có quyền đổi ưu tiên thì vẫn phải chạy tiếp, không được ném.
  const at = s.indexOf("setPriority(");
  assert.match(
    s.slice(Math.max(0, at - 200), at + 200),
    /try\s*\{/u,
    `${SCHED}: setPriority phải nằm trong try — thiếu quyền đổi ưu tiên không được giết job`,
  );
});

test("BACKUP không được treo vào công tắc của tính năng khác", () => {
  // Lỗi thật 2026-08-08 → 12/08: `rotateBackup()` là bước 4 của `maintainTick`, mà hàm đó
  // return ngay khi `getScheduler()` tắt ⇒ tắt scheduler là TẮT LUÔN BACKUP, im lặng. Bốn
  // ngày không có bản sao lưu, và không ai biết vì job có hỏng đâu — nó không được gọi.
  // Backup là lưới đỡ cuối cùng của kho (đã cứu kho thật 04/08), nên nó phải có đồng hồ
  // riêng và KHÔNG được hỏi bất kỳ công tắc tính năng nào.
  const s = read(SCHED);
  assert.match(s, /backupTimer = setInterval\(/u, `${SCHED}: backup phải có đồng hồ RIÊNG`);
  const tick = s.slice(s.indexOf("async function backupTick("), s.indexOf("function syncTick("));
  assert.ok(tick.length > 0, `${SCHED}: không tìm thấy thân backupTick`);
  assert.ok(
    !/getScheduler\(\)/u.test(tick),
    `${SCHED}: backupTick hỏi getScheduler() — backup lại chết theo công tắc scheduler, đúng lỗi 4 ngày mất backup`,
  );
  assert.ok(
    !/getAutosync\(\)/u.test(tick),
    `${SCHED}: backupTick hỏi getAutosync() — cùng một kiểu treo vào công tắc của tính năng khác`,
  );
});

test("scan KHÔNG bị chặn bởi backoff của vector backlog", () => {
  // Backoff sinh ra để khỏi đếm anti-join mỗi 5 phút — nó chỉ được phép bỏ qua
  // EMBED. Đem nó chặn cả scan là quay lại đúng lỗi: không tin nào được nạp.
  const s = read(SCHED);
  const iScan = s.indexOf('["memory", "scan"]');
  const iBackoff = s.indexOf("IDLE_BACKOFF_MS", s.indexOf("async function maintainTick"));
  assert.ok(iScan > 0, `${SCHED}: không thấy bước scan`);
  assert.ok(iBackoff > iScan, `${SCHED}: backoff phải xét SAU khi scan đã chạy, không được chặn scan`);
});

test("daemon vẫn nhường quyền ghi cho CLI và cho sync job", () => {
  const s = read(SCHED);
  // Phải soi ĐÚNG câu điều kiện thoát sớm của maintainTick. Đột biến 2026-07-30
  // gỡ `cliHoldsWrite() ||` khỏi guard mà test vẫn xanh, vì chữ đó còn nằm ở dòng
  // import — đo cả file là đo hư không.
  const i = s.indexOf("async function maintainTick");
  assert.ok(i > 0, `${SCHED}: không thấy maintainTick`);
  const guard = s.slice(i, s.indexOf("return;", i));
  for (const g of ["chainRunning", "child", "syncJobRunning()", "cliHoldsWrite()", "getScheduler()"]) {
    assert.ok(guard.includes(g), `${SCHED}: guard thoát sớm của maintainTick thiếu ${g} — daemon sẽ ghi chồng lên CLI hoặc chạy trùng chuỗi`);
  }
});

// 🔴 HAI CÔNG TẮC KHÔNG ĐƯỢC GIẾT NHAU (đo 2026-08-12).
//
// `maintainTimer` và `syncTimer` cùng chu kỳ 30 phút và được tạo CÙNG một khoảnh khắc, nên tới
// hạn chúng nổ trong cùng một lượt timer — và cái đăng ký TRƯỚC (maintain) chạy đồng bộ tới tận
// lúc `spawn` (gán `child`) rồi mới nhả event loop. `syncTick` chạy ngay sau, thấy `child` thì
// bỏ lượt. Bản cũ bỏ lượt là đợi trọn 30 phút ⇒ **bỏ đói vĩnh viễn**.
//
// Hậu quả thật: bật `scheduler` lúc trưa ⇒ **2,5 giờ không một lượt sync**, thư mục Drive trống,
// KHÔNG lỗi, KHÔNG log (log của scheduler đi vào stderr mà cách phóng daemon không hứng).
// Trước đó autosync chạy đều CHỈ VÌ scheduler đang TẮT — tức bật một tính năng làm chết một
// tính năng khác, và không cổng nào thấy. Hai phép kiểm dưới canh đúng hai vế của bản vá.
test("syncTick BỊ CHẶN thì hẹn quay lại — không được đợi trọn chu kỳ (chống bỏ đói)", () => {
  const src = read(SCHED);
  const body = src.slice(src.indexOf("function syncTick"), src.indexOf("export function startScheduler"));
  assert.match(body, /syncRetry/, "phải có đường hẹn lại khi bị chặn");
  assert.match(body, /setTimeout\(/, "hẹn lại bằng timer riêng, không dựa vào chu kỳ chính");
  assert.ok(
    /SYNC_RETRY_MS/.test(src) && !/SYNC_RETRY_MS\s*=\s*SYNC_EVERY_MS/.test(src),
    "nhịp hẹn lại phải NGẮN HƠN chu kỳ chính — bằng nhau thì vẫn là đợi trọn vòng",
  );
});

test("hai đồng hồ cùng chu kỳ phải LỆCH PHA — không được cùng nổ một khoảnh khắc", () => {
  const src = read(SCHED);
  const start = src.slice(src.indexOf("export function startScheduler"), src.indexOf("export function stopScheduler"));
  assert.match(start, /SYNC_EVERY_MS\s*\/\s*2/, "phải đặt sync lệch nửa chu kỳ so với chuỗi bảo trì");
});
