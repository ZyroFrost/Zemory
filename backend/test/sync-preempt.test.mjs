// NÚT NHƯỜNG · MÁY XẾP HÀNG (user chốt 2026-08-28: *"muốn schedule với cả bấm sync now"*).
//
// Bệnh gốc, đo trên log thật 27–28/08: `startSyncJob` từ chối cụt khi chuỗi bảo trì đang giữ
// token, kèm lời khuyên *"cứ bấm lại khi hết bận"*. Lời khuyên đó chỉ đúng nếu con kia chạy vài
// phút — thực tế embed chạy **30 phút → 3 tiếng**, và daemon bị restart trước khi nó xong, nên
// trong **19 giờ** auto-sync KHÔNG thử nổi một lần và 5.266 tin ứ lại.
//
// Ba lời hứa cổng này canh:
//   ① NÚT bấm (`preempt`) ⇒ bảo chuỗi bảo trì NHƯỜNG, rồi vào được.
//   ② MÁY tự chạy (không cờ) ⇒ **KHÔNG cắt ngang ai**, chỉ xếp hàng. Đây là ca ÂM bắt buộc:
//      thiếu nó thì một bản vá "cho sync luôn thắng" vẫn xanh, mà đó là cắt embed mỗi 30 phút.
//   ③ Không ai nhường được (token do tiến trình KHÁC giữ) ⇒ KHÔNG giật, báo rõ.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.GLOBAL_MEMORY_DB = join(mkdtempSync(join(tmpdir(), "zemory-preempt-")), "global_memory.db");

const { claimDaemonJob, registerJobYielder, releaseDaemonJob, yieldDaemonJob } = await import("../../dist/jobs/writegate.js");
const { startSyncJob, syncJobStatus } = await import("../../dist/jobs/syncjob.js");

// Runner GIẢ: lượt sync thật cần kênh Drive + chìa + hàng chục phút, không đưa vào gate được.
// Mối nối `ZEMORY_SYNC_RUNNER` vốn đã có sẵn cho đúng mục đích này (xem `syncjob.ts`).
process.env.ZEMORY_SYNC_RUNNER = join(mkdtempSync(join(tmpdir(), "zemory-runner-")), "noop.mjs");
import { writeFileSync } from "node:fs";
writeFileSync(process.env.ZEMORY_SYNC_RUNNER, 'process.stdout.write(JSON.stringify({push:{kind:"none"}}));\n');

function reset() {
  registerJobYielder(null);
  releaseDaemonJob();
}

test("① NÚT bấm: chuỗi bảo trì đang giữ token ⇒ nó phải NHƯỜNG, không phải từ chối", () => {
  reset();
  assert.equal(claimDaemonJob("maintain"), true, "giả lập chuỗi bảo trì đang chạy");

  let askedToYield = null;
  registerJobYielder((reason) => {
    askedToYield = reason;
    releaseDaemonJob(); // chuỗi thật nhả ở `finally`; ở đây rút lui ngay
    return true;
  });

  const st = startSyncJob(undefined, { preempt: true });
  assert.equal(askedToYield, "Đồng bộ ngay", "phải BẢO chuỗi nhường, và nói rõ nhường cho ai");
  // Trả về NGAY (không chờ bận trong handler HTTP), trạng thái là "đang nhường" chứ không phải lỗi.
  assert.equal(st.running, false);
  assert.match(st.error, /yielding/, "không được báo cụt — phải nói nó đang tới lượt");
  assert.doesNotMatch(st.error, /try again/, "câu 'thử lại đi' chính là cái cửa cụt đang bị bỏ");
  reset();
});

test("② CA ÂM — máy tự chạy (auto-sync) KHÔNG được cắt ngang chuỗi bảo trì", () => {
  reset();
  claimDaemonJob("maintain");
  let asked = false;
  registerJobYielder(() => {
    asked = true;
    releaseDaemonJob();
    return true;
  });

  const st = startSyncJob(undefined, { lowPriority: true }); // KHÔNG có preempt = nhịp của máy
  assert.equal(asked, false, "máy tự chạy mà cắt embed mỗi 30 phút thì backlog không bao giờ rút");
  assert.equal(st.running, false);
  assert.match(st.error, /queued/, "phải nói ĐÃ XẾP HÀNG, không phải 'thử lại đi'");
  reset();
});

test("③ token do tiến trình KHÁC giữ (không nhường được) ⇒ KHÔNG giật, báo rõ", () => {
  reset();
  claimDaemonJob("một CLI ngoài");
  registerJobYielder(null); // scheduler không đăng ký / không phải nó đang giữ

  const st = startSyncJob(undefined, { preempt: true });
  assert.equal(st.running, false);
  assert.match(st.error, /another writer holds the memory/, "giết việc của tiến trình khác là bất khả đảo — phải từ chối");
  assert.equal(syncJobStatus().running, false);
  reset();
});

test("yieldDaemonJob: không ai đăng ký ⇒ false (fail-open), có đăng ký ⇒ chuyển đúng lý do", () => {
  reset();
  assert.equal(yieldDaemonJob("x"), false, "chưa ai khai nhường được thì không được coi là đã nhường");
  let seen = null;
  registerJobYielder((r) => {
    seen = r;
    return true;
  });
  assert.equal(yieldDaemonJob("Đồng bộ ngay"), true);
  assert.equal(seen, "Đồng bộ ngay");
  reset();
});
