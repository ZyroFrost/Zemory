// WATCHDOG lượt sync (2026-08-30): một lượt kẹt (Drive File Stream đơ tầng OS — HAI ca thật cùng
// ngày) làm `status.running` đứng `true` vĩnh viễn ⇒ mọi lượt tự sync sau nhường vô hạn, sync
// chết mà không ai biết. Watchdog giết con quá trần 90′; kết cục mang lý do "watchdog" đi qua
// đúng đường onDone ⇒ vào sổ bền ⇒ đèn đỏ trên card.
//
// Ca hành vi dùng runner GIẢ treo vĩnh viễn qua mối nối `ZEMORY_SYNC_RUNNER` (cùng khuôn
// `sync-observability`): lượt sync thật cần kênh + chìa + hàng chục phút, không đưa vào gate được.
import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.GLOBAL_MEMORY_DB = join(mkdtempSync(join(tmpdir(), "zemory-wdog-")), "global_memory.db");
// Runner treo: không in gì, không thoát — đúng hình dạng của con sync bị Drive nuốt.
const hangScript = join(mkdtempSync(join(tmpdir(), "zemory-wdog-run-")), "hang.js");
writeFileSync(hangScript, "setInterval(() => {}, 60000);\n");
process.env.ZEMORY_SYNC_RUNNER = hangScript;

const { startSyncJob, stopSyncJob, syncJobStatus, syncWatchdogDue, watchdogSyncJob } = await import("../../dist/jobs/syncjob.js");

// Dọn con treo dù ca nào đỏ — Windows KHÔNG tự giết con khi cha thoát, để rơi là rò một node ẩn.
after(() => {
  try {
    stopSyncJob();
  } catch {
    /* đã chết */
  }
});

test("syncWatchdogDue: trần 90′ cho bước thường — quá thì tới hạn, chưa quá thì không, chưa chạy thì không", () => {
  const t0 = Date.parse("2026-08-30T10:50:00Z");
  assert.equal(syncWatchdogDue(t0, t0 + 89 * 60_000), false, "89′ — lượt đẩy bù dài hợp lệ, KHÔNG được giết");
  assert.equal(syncWatchdogDue(t0, t0 + 91 * 60_000), true, "91′ — quá trần, phải giết");
  assert.equal(syncWatchdogDue(0, t0), false, "startedAt=0 (chưa từng chạy) — không có gì để giết");
});

test("syncWatchdogDue: bước EMBED có trần riêng 180′ — giết embed 90′ là giết oan việc local đang cày", () => {
  // Ca báo oan thật 14:27 30/08: embed phút 56, CPU 3.552 s đang chạy hết cỡ — trần 90′ cũ sẽ
  // giết nó lúc 15:01 trong khi nó là việc LOCAL, Drive không treo được.
  const t0 = Date.parse("2026-08-30T13:31:31Z");
  assert.equal(syncWatchdogDue(t0, t0 + 95 * 60_000, "embed"), false, "embed 95′ — vẫn để nó cày");
  assert.equal(syncWatchdogDue(t0, t0 + 181 * 60_000, "embed"), true, "embed 181′ — model deadlock, giết");
  assert.equal(syncWatchdogDue(t0, t0 + 95 * 60_000, "write"), true, "write 95′ — Drive treo, giết như cũ");
});

test("HÀNH VI: con treo quá trần ⇒ watchdog giết, kết cục mang lý do 'watchdog', running về false", async () => {
  let done = null;
  const wait = new Promise((ok) => {
    startSyncJob((s) => {
      done = s;
      ok();
    });
  });
  assert.equal(syncJobStatus().running, true, "runner giả phải đang chạy trước khi thử watchdog");

  // Chưa quá trần ⇒ KHÔNG giết (ca ÂM — giết sớm là cắt oan lượt dài hợp lệ).
  assert.equal(watchdogSyncJob(Date.now() + 60 * 60_000), false, "60′ chưa quá trần 90′");
  assert.equal(syncJobStatus().running, true, "con phải còn sống sau cú kiểm 60′");

  // Quá trần (tiêm now = start + 91′) ⇒ giết.
  assert.equal(watchdogSyncJob(Date.now() + 91 * 60_000), true, "91′ — phải giết");
  // Trần 5 s cho chính phép chờ: đột biến "watchdog không bao giờ giết" phải làm ca này ĐỎ
  // NHANH, không phải treo cả gate vô hạn (runner giả cố tình không bao giờ tự thoát).
  await Promise.race([wait, new Promise((_, no) => setTimeout(() => no(new Error("con không bị giết trong 5 s — watchdog chết")), 5000).unref?.())]);
  assert.equal(done.ok, false, "lượt bị watchdog giết là lượt HỎNG, không phải lượt xong");
  assert.match(done.error ?? "", /watchdog/, "lý do phải nói 'watchdog', không phải mã thoát vô hồn");
  assert.equal(syncJobStatus().running, false, "running phải về false — các lượt sau hết bị chặn");
});
