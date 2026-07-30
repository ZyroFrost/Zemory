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
const I18N = "frontend/scripts/app.js";

/** Every maintenance step the UI promises the daemon runs, in order. */
const PROMISED = ["scan", "embed", "digest"];

test("UI vẫn hứa đúng chuỗi scan → embed → digest (nếu đổi lời hứa thì đổi cả test)", () => {
  const ui = read(I18N);
  for (const key of ["mem.schedulerD", "f.doc.scheduler"]) {
    // `'<key>':` = chỗ ĐỊNH NGHĨA. Bảng FEATURES cũng nhắc `doc:'f.doc.scheduler'`
    // (không có dấu hai chấm sau) và nó đứng TRƯỚC — bắt nhầm chỗ đó là đo hư không.
    const i = ui.indexOf(`'${key}':`);
    assert.ok(i > 0, `${I18N}: không tìm thấy chỗ định nghĩa khoá i18n ${key}`);
    const blob = ui.slice(i, i + 900);
    assert.match(blob, /scan\s*→\s*embed\s*→\s*digest/u, `${key}: lời hứa về scheduler đã đổi — soát lại scheduler.ts rồi sửa test`);
  }
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
  assert.equal(
    (s.match(/claimDaemonJob\(/gu) ?? []).length,
    1,
    `${SCHED}: chỉ được claim job MỘT lần cho cả chuỗi`,
  );
  const claimAt = s.indexOf("claimDaemonJob(");
  const releaseInFinally = /finally\s*\{[^}]*releaseDaemonJob\(\)/su.test(s.slice(claimAt));
  assert.ok(releaseInFinally, `${SCHED}: releaseDaemonJob phải nằm trong finally — một bước lỗi là token kẹt vĩnh viễn`);
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
