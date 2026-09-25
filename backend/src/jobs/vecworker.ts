// Đếm tin còn chờ nhúng (`vectorRemaining`) ở WORKER THREAD — không trên event loop của daemon.
//
// Đo 2026-09-25: ping xen kẽ bắt được daemon đứng 3,85 s ĐÚNG lúc chuỗi bảo trì báo "scan: finished";
// dòng "embed backlog" kế tiếp in ra 4 s sau. Phép đếm là anti-join toàn bảng (`id NOT IN vec_chunks`)
// — chú thích cũ ghi "vài trăm ms trên kho 595 MB", kho nay 3,6 GB. Lúc đĩa lạnh còn lâu hơn nhiều.
import { Worker } from "node:worker_threads";

const WORKER_SRC = `
const { parentPort, workerData } = require("node:worker_threads");
import(workerData.mod)
  .then((m) => parentPort.postMessage({ ok: true, n: m.vectorRemaining(workerData.dbPath) }))
  .catch((e) => parentPort.postMessage({ ok: false, error: String((e && e.message) || e) }));
`;

/** Quá mức này là HỎNG ⇒ `null`, người gọi bỏ lượt đếm và thử lại nhịp sau (fail-open, HP điều 9). */
const TIMEOUT_MS = 10 * 60_000;

export function vectorRemainingInWorker(dbPath: string): Promise<number | null> {
  return new Promise((resolve) => {
    let w: Worker;
    try {
      const mod = new URL("../memory/vectors.js", import.meta.url).href;
      w = new Worker(WORKER_SRC, { eval: true, workerData: { mod, dbPath } });
    } catch {
      return resolve(null);
    }
    let done = false;
    const finish = (v: number | null): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      void w.terminate().catch(() => {});
      resolve(v);
    };
    const timer = setTimeout(() => finish(null), TIMEOUT_MS);
    timer.unref?.();
    w.once("message", (m: { ok: boolean; n?: number }) => finish(m.ok && typeof m.n === "number" ? m.n : null));
    w.once("error", () => finish(null));
    w.once("exit", () => finish(null));
  });
}
