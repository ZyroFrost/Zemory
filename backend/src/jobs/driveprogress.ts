// Tiến độ đẩy Drive (đã đẩy / tổng / tin mới nhất) — tính ở WORKER THREAD, không trên event loop.
//
// Vì sao (đo 2026-09-25): ba phép quét toàn bảng `messages` (COUNT · COUNT theo mốc · MAX timestamp)
// mất ~0,4 s khi chạy riêng nhưng 0,9–6,3 s TRONG daemon khi đĩa/kho đang bận, và better-sqlite3 chạy
// ĐỒNG BỘ ⇒ suốt thời gian đó mọi endpoint đứng, /ping hết giờ. Đo bằng ping xen kẽ: một lượt tính
// lại bảng số chặn /ping 6,3 s. Cùng luật với `statsjob.ts`: việc nặng không lên event loop.
//
// Worker thread chứ không tiến trình con: số này phải TƯƠI (card Drive đọc nó ngay sau mỗi lượt quét,
// qua /sync-pulse), nên không chịu nổi ~0,3 s dựng tiến trình node mỗi lượt. Worker mở kết nối CHỈ
// ĐỌC riêng — ở chế độ WAL, người đọc không bao giờ phải chờ người ghi.

import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";

export interface DriveProgress {
  syncPercent: number;
  syncedMessages: number;
  totalMessages: number;
  pendingMessages: number;
  lastPushAt: string | null;
  newestAt: string | null;
}

const WORKER_SRC = `
const { parentPort, workerData } = require("node:worker_threads");
const Database = require(workerData.sqlite);
let db;
try {
  db = new Database(workerData.dbPath, { readonly: true, fileMustExist: true });
  db.pragma("busy_timeout = 5000");
  const row = db.prepare("SELECT last_message_id AS id, updated_at AS at FROM sync_state WHERE bundle = ?").get(workerData.bundle);
  const wm = (row && row.id) || 0;
  const total = db.prepare("SELECT COUNT(*) c FROM messages").get().c;
  const synced = db.prepare("SELECT COUNT(*) c FROM messages WHERE id <= ?").get(wm).c;
  const newest = db.prepare("SELECT MAX(timestamp) t FROM messages").get();
  parentPort.postMessage({ ok: true, total, synced, lastPushAt: (row && row.at) || null, newestAt: (newest && newest.t) || null });
} catch (e) {
  parentPort.postMessage({ ok: false, error: String((e && e.message) || e) });
} finally {
  try { if (db) db.close(); } catch (_) {}
}
`;

/** Quá mức này là HỎNG, không phải chậm — người gọi rơi về đường lùi. */
const TIMEOUT_MS = 60_000;

const sqlitePath = (): string => createRequire(import.meta.url).resolve("better-sqlite3");

/**
 * Đếm ở worker. Trả số THÔ (tổng · đã đẩy · mốc) — phần trăm do người gọi tính bằng CÙNG hàm với
 * bản đồng bộ, để hai đường không bao giờ ra hai con số khác nhau cho cùng một kho.
 * Lỗi / quá giờ ⇒ `null` (fail-open, HP điều 9): người gọi dùng đường lùi.
 */
export function driveCountsInWorker(
  dbPath: string,
  bundle: string,
  /** Vì sao hỏng — để người gọi GHI RA khi phải lùi về đường đồng bộ (lần lùi không lý do là lần không ai truy được). */
  onFail?: (why: string) => void,
): Promise<{ total: number; synced: number; lastPushAt: string | null; newestAt: string | null } | null> {
  return new Promise((resolve) => {
    let w: Worker;
    try {
      w = new Worker(WORKER_SRC, { eval: true, workerData: { dbPath, bundle, sqlite: sqlitePath() } });
    } catch (e) {
      onFail?.(`không dựng được worker: ${e instanceof Error ? e.message : String(e)}`);
      return resolve(null);
    }
    let done = false;
    const finish = (v: { total: number; synced: number; lastPushAt: string | null; newestAt: string | null } | null): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      void w.terminate().catch(() => {});
      resolve(v);
    };
    const fail = (why: string): void => {
      if (!done) onFail?.(why);
      finish(null);
    };
    const timer = setTimeout(() => fail(`quá ${TIMEOUT_MS / 1000} s`), TIMEOUT_MS);
    timer.unref?.();
    w.once("message", (m: { ok: boolean; total?: number; synced?: number; lastPushAt?: string | null; newestAt?: string | null; error?: string }) => {
      if (m.ok) finish({ total: m.total ?? 0, synced: m.synced ?? 0, lastPushAt: m.lastPushAt ?? null, newestAt: m.newestAt ?? null });
      else fail(`worker báo lỗi: ${m.error ?? "?"}`);
    });
    w.once("error", (e) => fail(`worker lỗi: ${e instanceof Error ? e.message : String(e)}`));
    w.once("exit", (code) => fail(`worker thoát (mã ${code}) trước khi trả số`));
  });
}
