// Lượt sync HỎNG phải để lại dấu vết ĐỌC ĐƯỢC.
//
// Sự cố sinh ra file này (đo 2026-08-26): auto-sync chết lúc 05:45, và tất cả những gì còn lại là
// bốn chữ `UNKNOWN: unknown error, write` trong `/sync-status`. Không stack, không dòng nào nói
// phép ghi nào ném — vì `startSyncJob` phóng con với `stdio: ["ignore","pipe","ignore"]`, tức
// **stderr bị bỏ thẳng vào hư không**. `daemon.log` thì chỉ ghi `auto-sync: job finished`, in ra
// y hệt cho lượt đẩy được và lượt hỏng. Hậu quả đo được: watermark đứng **20 giờ** trong khi mỗi
// lượt lại nối một khối TRÙNG lên kênh chung (#37 và #39 khớp từng byte: 22.270.367 byte /
// 3.812 tin), và không một dòng log nào kêu.
//
// Cổng soi HÀNH VI (như `last-sync.test.mjs`), không soi chữ trong mã: phóng một runner GIẢ qua
// `ZEMORY_SYNC_RUNNER` rồi đọc `SyncJobStatus` thật. Chạy lượt sync THẬT ở đây là không khả thi
// (cần kênh Drive + chìa + hàng chục phút), nhưng thứ đang canh không phải phép sync — mà là
// đường ống chẩn đoán quanh nó.

// Phải đặt env TRƯỚC rồi mới `import` động: `db.ts` đọc `GLOBAL_MEMORY_DB` MỘT LẦN lúc nạp, và
// write-gate ghi `daemon-job.lock` cạnh kho ⇒ không cô lập là test đụng kho THẬT.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP = mkdtempSync(join(tmpdir(), "zemory-syncobs-"));
process.env.GLOBAL_MEMORY_DB = join(TMP, "global_memory.db");

const { startSyncJob, stopSyncJob, syncJobRunning } = await import("../../dist/jobs/syncjob.js");

/**
 * Hạn chót của MỘT lượt, và nó phải GIẾT con.
 *
 * Vì sao không dựa vào `timeout` của `node:test`: đột biến "mở ống mà không hút" làm con treo
 * cứng ở `write`. `timeout` báo đỏ đúng lúc (đo: 30.011 ms) nhưng `node --test` vẫn **ngồi chờ
 * con mồ côi** sau đó — lượt đột biến đầu tiên treo hơn 120 giây. Đỏ-rồi-treo vẫn làm nghẽn cả
 * gate, nên hạn chót ở đây tự `stopSyncJob()` để tiến trình thoát được.
 */
const DEADLINE_MS = 20_000;

/** Ghi một runner giả ra đĩa và trả đường dẫn. */
function fakeRunner(name, body) {
  const p = join(TMP, `${name}.mjs`);
  writeFileSync(p, body, "utf8");
  return p;
}

/**
 * Chạy một lượt job với runner đã cho, trả `SyncJobStatus` lúc kết thúc.
 *
 * Chờ khe job trống TRƯỚC khi phóng: `syncjob.ts` giữ trạng thái ở mức MODULE, nên một lượt
 * trước bị `stopSyncJob()` giết vẫn còn `running=true` cho tới khi `exit` nổ. Thiếu vòng chờ này
 * thì một đột biến làm hỏng ca ĐẦU sẽ kéo ca sau đỏ lây, và đột biến thôi còn một-đối-một —
 * tức cổng nói được "có đỏ" nhưng không nói được "đỏ vì cái gì".
 */
async function runOnce(runner) {
  for (let i = 0; syncJobRunning() && i < 200; i++) await new Promise((r) => setTimeout(r, 25));
  process.env.ZEMORY_SYNC_RUNNER = runner;
  return new Promise((resolve, reject) => {
    const bell = setTimeout(() => {
      stopSyncJob(); // giết con đang treo, nếu không `node --test` ngồi chờ nó mãi
      reject(new Error(`lượt job không kết thúc trong ${DEADLINE_MS} ms — ống stderr không ai hút?`));
    }, DEADLINE_MS);
    bell.unref?.();
    const started = startSyncJob((s) => {
      clearTimeout(bell);
      resolve(s);
    });
    if (!started.running) {
      clearTimeout(bell);
      reject(new Error(`job không chạy: ${started.error ?? "?"}`));
    }
  });
}

// 256 KB — VƯỢT HẲN bộ đệm ống của HĐH (~64 KB trên Windows). Đây là phần đo việc HÚT ống: mở
// `pipe` mà không ai đọc thì con treo cứng ở `write`, và test này TREO chứ không đỏ. Vì vậy nó
// mang `timeout` — treo trong gate là kiểu hỏng tệ hơn đỏ (bài học `plan/08 §8c`).
const NOISE = 256 * 1024;

test(
  "lượt HỎNG giữ được ĐUÔI stderr — và ống stderr có người hút",
  { timeout: 30_000 },
  async () => {
    const runner = fakeRunner(
      "fail",
      `process.stderr.write("x".repeat(${NOISE}));\n` +
        `process.stderr.write("\\nDAU-VET-CUOI: appendFileSync ném ở đây\\n");\n` +
        `console.log(JSON.stringify({ ok: false, error: "UNKNOWN: unknown error, write" }));\n` +
        `process.exitCode = 1;\n`,
    );
    const s = await runOnce(runner);

    assert.equal(s.running, false);
    assert.equal(s.ok, false);
    assert.equal(s.error, "UNKNOWN: unknown error, write");

    // Thứ ca 26/08 KHÔNG có, và là lý do file này tồn tại.
    assert.ok(s.stderr, "lượt hỏng phải giữ stderr — thiếu nó là chẩn đoán mù");
    // Giữ ĐUÔI, không giữ đầu: chỗ ném nằm ở cuối.
    assert.match(s.stderr, /DAU-VET-CUOI: appendFileSync ném ở đây/);
    // Có cắt thật, không nuốt cả 256 KB vào log.
    assert.ok(s.stderr.length <= 8192, `đuôi phải bị cắt, đang ${s.stderr.length} byte`);
  },
);

// Vế thứ hai của cùng sự cố: `daemon.log` ghi `auto-sync: job finished` cho MỌI kết cục. Một
// dòng log không phân biệt được "đẩy 3.812 tin" với "không có gì để đẩy" thì nó không nói được
// điều gì — và đó là lý do watermark đứng 20 giờ mà không ai thấy. Đây là hàm dựng dòng đó.
test("dòng log phân biệt được ĐẨY ĐƯỢC với KHÔNG CÓ GÌ ĐỂ ĐẨY", async () => {
  const { describePush } = await import("../../dist/jobs/scheduler.js");

  assert.match(describePush({ push: { kind: "delta", messages: 3812, bytes: 22270367 } }), /3812 tin/);
  assert.match(describePush({ push: { kind: "none", messages: 0, bytes: 0 } }), /không có gì để đẩy/);
  // Hai kết cục KHÁC NHAU không được ra cùng một câu — chính lỗi của `job finished`.
  assert.notEqual(
    describePush({ push: { kind: "delta", messages: 3812, bytes: 22270367 } }),
    describePush({ push: { kind: "none", messages: 0, bytes: 0 } }),
  );
  // JSON qua ống giữa hai tiến trình: dạng lạ thì im, không được ném vào giữa lượt log.
  assert.equal(describePush(undefined), "");
  assert.equal(describePush({}), "");
});

test("lượt CHẠY ĐƯỢC không giữ stderr — log không phình vì tiến độ bình thường", async () => {
  const runner = fakeRunner(
    "ok",
    `process.stderr.write("merging chunk 1/40\\nmerging chunk 2/40\\n");\n` +
      `console.log(JSON.stringify({ ok: true, push: { kind: "delta", messages: 7, bytes: 123 } }));\n`,
  );
  const s = await runOnce(runner);

  assert.equal(s.ok, true);
  assert.equal(s.stderr, undefined, "lượt chạy được thì stderr là tiến độ — giữ lại chỉ làm log phình");
});

// Bắt được lúc soi lại diff của chính lượt vá này, KHÔNG phải do cổng nào kêu: sự kiện đáng giá
// nhất mà lớp sync in ra — *"Drive ném lỗi giả, đếm lại thấy khối vẫn ĐỦ"* — chỉ xảy ra ở lượt
// THÀNH CÔNG. Điều kiện "chỉ giữ stderr khi hỏng" vì vậy vứt đúng thứ cần giữ nhất.
test("lượt CHẠY ĐƯỢC mà có cảnh báo [sync] thì VẪN phải giữ", async () => {
  const runner = fakeRunner(
    "ok-notable",
    `process.stderr.write("merging chunk 3/41\\n");\n` +
      `process.stderr.write("[sync] nối khối ném \\"UNKNOWN: unknown error, write\\" nhưng đếm lại thấy ĐỦ 41 khối\\n");\n` +
      `console.log(JSON.stringify({ ok: true, push: { kind: "delta", messages: 7, bytes: 123 } }));\n`,
  );
  const s = await runOnce(runner);

  assert.equal(s.ok, true);
  assert.ok(s.stderr, "cảnh báo [sync] ở lượt thành công KHÔNG được vứt");
  assert.match(s.stderr, /đếm lại thấy ĐỦ 41 khối/);
});
