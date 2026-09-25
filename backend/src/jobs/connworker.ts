// Worker thread: dò kết nối các nguồn local (`listConnections`) NGOÀI event loop của daemon.
//
// Đo 2026-09-25: `listConnections` mất 2,5 s lúc lạnh và ~0,37 s lúc ấm — nó dò thư mục transcript
// của từng adapter trên đĩa, ĐỒNG BỘ. Nó nằm trong cây nguồn, mà cây nguồn đi kèm cả bảng số lẫn
// /sync-pulse ⇒ mỗi lượt làm tươi chặn mọi endpoint. Worker trả về đúng mảng hàng (dữ liệu thuần).
import { parentPort, workerData } from "node:worker_threads";
import { listConnections } from "../memory/connections.js";

const data = workerData as { dbPath?: string };
try {
  parentPort?.postMessage({ ok: true, rows: listConnections(data.dbPath) });
} catch (e) {
  parentPort?.postMessage({ ok: false, error: e instanceof Error ? e.message : String(e) });
}
