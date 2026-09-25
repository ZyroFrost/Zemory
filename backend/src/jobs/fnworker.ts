// Chạy MỘT hàm đồng bộ nặng của một module ở WORKER THREAD — để daemon không đứng.
//
// Đo 2026-09-25 bằng CPU profiler gắn vào daemon thật (ping xen kẽ, 180 s đầu sau khởi động): 11 lần
// chặn, cộng lại 18,5 s đứng. Thủ phạm là một HỌ việc đồng bộ chạy thẳng trên event loop — liệt kê
// trình duyệt bằng `execFileSync` (2,4 s), đọc bảng presence trên ổ Drive (1,4 s), dọn nháp/profile
// tạm bằng `statSync`/`readdirSync` (~2,5 s)… Đổi từng hàm sang async là sửa rất nhiều chỗ gọi (cả test
// gọi chúng đồng bộ); giữ nguyên hàm, chỉ đổi CHỖ CHẠY: daemon gọi qua đây.
//
// Kết quả phải là dữ liệu thuần (structured clone). Hàm hỏng / quá giờ ⇒ `{ ok: false, error }`,
// không ném — người gọi quyết: bỏ lượt (dọn dẹp) hay dùng giá trị rỗng (fail-open, HP điều 9).
import { Worker } from "node:worker_threads";

const WORKER_SRC = `
const { parentPort, workerData } = require("node:worker_threads");
import(workerData.mod)
  .then((m) => Promise.resolve(m[workerData.fn](...workerData.args)))
  .then((value) => parentPort.postMessage({ ok: true, value }))
  .catch((e) => parentPort.postMessage({ ok: false, error: String((e && e.message) || e) }));
`;

export type WorkerResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * `modFromDist` là đường tương đối dưới `dist/`, ví dụ `"platform/browsersweep.js"`.
 * Mặc định trần 2 phút: đủ cho một lượt dọn lớn, và một lệnh ngoài (WMI/PowerShell) treo thì bị cắt
 * thay vì giữ worker mãi — daemon thì không bao giờ phải chờ nó.
 */
export function runInWorker<T>(modFromDist: string, fn: string, args: unknown[] = [], timeoutMs = 120_000): Promise<WorkerResult<T>> {
  return new Promise((resolve) => {
    let w: Worker;
    try {
      const mod = new URL(`../${modFromDist}`, import.meta.url).href;
      w = new Worker(WORKER_SRC, { eval: true, workerData: { mod, fn, args } });
    } catch (e) {
      return resolve({ ok: false, error: `không dựng được worker: ${e instanceof Error ? e.message : String(e)}` });
    }
    let done = false;
    const finish = (r: WorkerResult<T>): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      void w.terminate().catch(() => {});
      resolve(r);
    };
    const timer = setTimeout(() => finish({ ok: false, error: `quá ${Math.round(timeoutMs / 1000)} s` }), timeoutMs);
    timer.unref?.();
    w.once("message", (m: WorkerResult<T>) => finish(m));
    w.once("error", (e) => finish({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    w.once("exit", (code) => finish({ ok: false, error: `worker thoát (mã ${code}) trước khi trả kết quả` }));
  });
}
