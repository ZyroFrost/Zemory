// Khoá ghi XUYÊN TIẾN TRÌNH.
//
// Bối cảnh (soi code sau sự cố hỏng DB 2026-08-03): `acquireCliWrite` cũ **không bao giờ từ
// chối** — nó chỉ đặt một mốc thời gian nên hai CLI cùng gọi đều nhận `{ok:true}`. Và CLI hỏi
// cổng qua HTTP nên **daemon chết ⇒ không có cổng nào**. Ngày hỏng: daemon khởi động 8 lần
// gần như không lần nào tắt sạch, hook chạy `scan` mỗi lượt trả lời, cộng `memory embed` gõ
// tay — nhiều tiến trình ghi, không ai chặn ai.
//
// Bất biến phải giữ:
//   ① tiến trình KHÁC đang giữ ⇒ TỪ CHỐI (đây là thứ bản cũ không làm được);
//   ② chủ khoá đã CHẾT ⇒ chiếm lại được (điều 9: không kẹt vĩnh viễn);
//   ③ chỉ chủ khoá mới nhả được — không ai giật khoá của người khác;
//   ④ gọi lại khi chính mình đang giữ = gia hạn, không tự chặn mình.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `GLOBAL_MEMORY_DB` bị CHỐT lúc nạp module (`const ENV_DB = …` trong db.ts), nên phải đặt
// TRƯỚC khi import — và vì thế dùng import động, không phải import tĩnh (bị cẩu lên đầu file).
// Không làm vậy thì khoá rơi vào `data/` THẬT của máy: test tự ghi vào kho thật, và mọi phép
// kiểm dưới đây đều xanh giả vì chúng đọc một file khác cái chúng vừa ghi.
const DIR = mkdtempSync(join(tmpdir(), "zemory-clilock-"));
process.env.GLOBAL_MEMORY_DB = join(DIR, "global_memory.db");
const LOCK = join(DIR, "cli-write.lock");
// pid NGOẠI còn sống chắc chắn. KHÔNG dùng pid 1: trên Windows nó không tồn tại (ESRCH) nên
// khoá bị coi là mồ côi và mọi phép kiểm "phải từ chối" đều xanh giả.
const OTHER_PID = process.ppid;
const { acquireCliWriteLock, cliHoldsWrite, cliWriteHolder, releaseCliWriteLock } = await import("../../dist/jobs/writegate.js");

/** Mỗi phép kiểm bắt đầu từ trạng thái không ai giữ khoá. */
function isolate(t) {
  rmSync(LOCK, { force: true });
  t.after(() => rmSync(LOCK, { force: true }));
  return LOCK;
}

test("tiến trình KHÁC đang giữ ⇒ TỪ CHỐI (bản cũ luôn cho qua)", (t) => {
  const lock = isolate(t);
  // mô phỏng một tiến trình KHÁC còn sống.
  writeFileSync(lock, JSON.stringify({ pid: OTHER_PID, label: "embed", at: Date.now() }));

  const r = acquireCliWriteLock("scan");
  assert.equal(r.ok, false, "phải từ chối khi tiến trình khác đang giữ");
  assert.equal(r.heldBy?.label, "embed", "phải nói rõ AI đang giữ để người gọi còn chờ");
  assert.equal(cliHoldsWrite(), true, "scheduler phải thấy là có người ghi");
});

test("chủ khoá đã chết ⇒ chiếm lại được", (t) => {
  const lock = isolate(t);
  // pid chắc chắn không tồn tại (trên Windows lẫn POSIX).
  writeFileSync(lock, JSON.stringify({ pid: 0x7ffffff0, label: "embed", at: Date.now() }));

  assert.equal(cliWriteHolder(), null, "khoá của pid chết không được tính");
  assert.equal(acquireCliWriteLock("scan").ok, true, "phải chiếm lại được");
  assert.equal(cliWriteHolder()?.pid, process.pid);
});

test("khoá quá hạn ⇒ chiếm lại được", (t) => {
  const lock = isolate(t);
  writeFileSync(lock, JSON.stringify({ pid: OTHER_PID, label: "embed", at: Date.now() - 60 * 60_000 }));
  assert.equal(cliWriteHolder(), null, "quá 15 phút thì không tính, dù pid còn sống");
  assert.equal(acquireCliWriteLock("scan").ok, true);
});

test("gọi lại khi CHÍNH MÌNH đang giữ = gia hạn, không tự chặn", (t) => {
  isolate(t);
  assert.equal(acquireCliWriteLock("embed").ok, true);
  const first = cliWriteHolder().at;
  assert.equal(acquireCliWriteLock("embed").ok, true, "không được tự chặn chính mình");
  assert.ok(cliWriteHolder().at >= first, "phải gia hạn mốc thời gian");
});

test("chỉ CHỦ khoá mới nhả được — không giật khoá của tiến trình khác", (t) => {
  const lock = isolate(t);
  writeFileSync(lock, JSON.stringify({ pid: OTHER_PID, label: "embed", at: Date.now() }));

  releaseCliWriteLock(); // ta KHÔNG phải chủ
  const still = JSON.parse(readFileSync(lock, "utf8"));
  assert.equal(still.pid, OTHER_PID, "khoá của tiến trình khác bị giật mất");

  assert.equal(acquireCliWriteLock("scan").ok, false, "và vẫn phải bị từ chối");
});

test("nhả xong thì người sau vào được", (t) => {
  isolate(t);
  assert.equal(acquireCliWriteLock("embed").ok, true);
  releaseCliWriteLock();
  assert.equal(cliWriteHolder(), null, "nhả rồi thì không còn ai giữ");
  assert.equal(cliHoldsWrite(), false);
  assert.equal(acquireCliWriteLock("scan").ok, true);
});
