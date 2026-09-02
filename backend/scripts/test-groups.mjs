// Danh sách file test NẠP MODEL ONNX (embed / rerank) — tách riêng để `test-partition.test.mjs`
// import được mà KHÔNG kéo runner chạy (module runner có side effect lúc nạp: spawn + exit).
// Thêm file vào đây khi cổng partition đỏ; lý do tách nhóm ở `run-tests.mjs`.
export const HEAVY = [
  // nạp model ONNX (embed / rerank)
  "embed.test.mjs",
  "embed-profile.test.mjs",
  "memory-privacy.test.mjs",
  "rerank.test.mjs",
  "vecship-chunks.test.mjs",
  "vector-write-atomic.test.mjs",
  "vectors.test.mjs",
  // nạp grammar tree-sitter WASM cho graph — đo 2026-08-27 từng file: graph-langs 1.937 MB ·
  // graph-semantic 1.769 · graph 1.154 · graph-cache 1.147 · mcp-graph 770. Hai file trùng lượt ở
  // nhóm nhẹ 2 worker là ~3,7 GB — đúng chỗ gate chạm trần 4 GB dù mọi ca vẫn xanh.
  "graph.test.mjs",
  "graph-cache.test.mjs",
  "graph-langs.test.mjs",
  "graph-semantic.test.mjs",
  "mcp-graph.test.mjs",
];
/**
 * File KHỚP regex "nạp runtime nặng" của cổng partition nhưng đo thật là NHẸ (chỉ nhắc/ import API graph,
 * không nạp grammar). Đo bằng Job Object từng file 2026-08-27 — con số ghi kèm để lần sau đo lại có mốc.
 * Thêm file vào đây là một QUYẾT ĐỊNH có số đo, không phải chỗ nhét cho cổng khỏi đỏ: quá 500 MB ⇒ vào HEAVY.
 */
export const LIGHT_DESPITE_MATCH = {
  "audit-fixes.test.mjs": 129,
  // Đo bằng gate-cage 2026-09-02: chỉ import API `graphFitness`/`isEntryClassFile` rồi chấm trên
  // graph GIẢ dựng bằng tay — không gọi `buildCodeGraph` nên không nạp grammar tree-sitter.
  "fitness-entry-class.test.mjs": 47,
  "graph-docs.test.mjs": 129,
  "graph-edge-id.test.mjs": 129,
  "graph-path.test.mjs": 129,
  "graph-seam.test.mjs": 58,
  "graph-standard.test.mjs": 80,
  "graph-touches.test.mjs": 77,
  "mcp.test.mjs": 141,
  "nav-cost.test.mjs": 129,
  "structure-sync.test.mjs": 129,
  "todo-verify.test.mjs": 129,
};
/** Nhóm nạp model chạy TUẦN TỰ — đỉnh RAM ≤ một model. Đổi số này là bỏ luôn lý do tách nhóm. */
export const HEAVY_CONCURRENCY = 1;
/** Nhóm nhẹ 2 worker (từng là 4): user chốt 2026-08-27 "cho nó chạy chậm lại" để nhường RAM/CPU cho
 *  phiên khác cùng máy. Đo với daemon tắt: 4 worker đỉnh 2.182 MB — 2 worker để dành biên cho trần 4 GB. */
export const LIGHT_CONCURRENCY = 2;
/** Env riêng cho nhóm nạp model (xem `embed.ts › ortSessionOptions`): giới hạn luồng ONNX để nhường CPU.
 *  ⚠ KHÔNG đặt `ZEMORY_ONNX_MEM_ARENA=0` ở đây: đo 2026-08-27, tắt arena làm `vectors.test` phình
 *  NHANH HƠN (12 GB trong 125 s, so với 6,1 GB/18 phút khi arena bật) — knob đó sai hướng cho RAM. */
export const HEAVY_ENV = { ZEMORY_ONNX_THREADS: "4" };
