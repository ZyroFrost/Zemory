// Nhật ký fitness của code-graph — chuỗi thời gian, KHÔNG phải ảnh chụp.
//
// Vì sao có: `graphFitness()` trả về đạt/không-đạt tại một thời điểm. Một điểm số lẻ
// không nói được điều quan trọng nhất — HƯỚNG ĐI. Số node cô lập nhảy 8%→19% trong
// một tuần là tín hiệu hồi quy thật; đọc riêng con số 19% thì không thấy gì cả.
// (Đối chiếu "Graph Engineering" §VII.D 2026-07-27: theo dõi XU HƯỚNG, đừng theo dõi
// điểm rời rạc.) Điều 12 đòi đo thật — thì phải có mốc để so.
//
// Ranh giới với điều 3 (lớp dẫn xuất dựng lại được): bảng này KHÔNG phải lớp dẫn
// xuất. Graph dựng lại được từ code; fitness của HÔM QUA thì không — code hôm qua đã
// không còn. Nên đây là trạng thái bền vững, mất là mất thật, và cũng vì thế mà
// migration v18 cố tình không backfill (bịa số quá khứ = vi phạm điều 12).
//
// Ghi ở đâu: chỉ tại lúc graph được DỰNG LẠI THẬT (chữ ký nguồn đổi), không phải mỗi
// lần đọc — nếu không, mở tab graph 20 lần sẽ đẻ 20 hàng giống hệt và biểu đồ sẽ nói
// dối về nhịp thay đổi của code.

import { resolve } from "node:path";
import { openMemory } from "../db.js";
import type { GraphFitness } from "./graph.js";

export interface FitnessPoint {
  builtAt: string;
  passed: boolean;
  files: number;
  edges: number;
  /** metric → value, đã phẳng hoá để vẽ thẳng (hub_pct, isolated_pct, util_violations…). */
  values: Record<string, number>;
}

/**
 * Ghi một mốc fitness. Fail-open (điều 9): mọi lỗi DB đều nuốt — graph vẫn phải
 * phục vụ được kể cả khi không ghi được nhật ký.
 *
 * Chống trùng: bỏ qua nếu mốc mới nhất của project này CÙNG chữ ký nguồn. Khởi động
 * lại daemon sẽ dựng lại graph với chữ ký y hệt; đó không phải một thay đổi của code.
 */
export function recordFitness(
  project: string,
  fitness: GraphFitness,
  opts: { sig: string; builtAt: string; files: number; edges: number },
): void {
  // CHUẨN HOÁ khoá: `D:/Zyro/Tool/Zemory` và `D:\Zyro\Tool\Zemory` là CÙNG một
  // project, nhưng lưu thô thì thành hai chuỗi thời gian rời — đo được ngay lần soi
  // mắt đầu tiên (curl dùng "/", UI dùng "\\", card báo "chưa có mốc nào" dù DB có 2).
  const key = resolve(project);
  try {
    const db = openMemory();
    try {
      const last = db
        .prepare("SELECT sig FROM graph_fitness WHERE project=? ORDER BY built_at DESC LIMIT 1")
        .get(key) as { sig: string | null } | undefined;
      if (last && opts.sig && last.sig === opts.sig) return;
      db.prepare(
        "INSERT INTO graph_fitness (project, built_at, sig, passed, files, edges, metrics) VALUES (?,?,?,?,?,?,?)",
      ).run(
        key,
        opts.builtAt,
        opts.sig || null,
        fitness.passed ? 1 : 0,
        opts.files,
        opts.edges,
        JSON.stringify(fitness.metrics.map((m) => ({ metric: m.metric, value: m.value, threshold: m.threshold, passed: m.passed }))),
      );
    } finally {
      db.close();
    }
  } catch {
    /* nhật ký là thứ phụ — không bao giờ được làm hỏng việc phục vụ graph */
  }
}

/** Đọc mốc gần nhất trước → sau (cũ ở đầu) để vẽ thẳng theo trục thời gian. */
export function fitnessHistory(project: string, limit = 40): FitnessPoint[] {
  const key = resolve(project); // cùng phép chuẩn hoá như recordFitness — nếu không, đọc không khớp ghi
  try {
    const db = openMemory();
    try {
      const rows = db
        .prepare("SELECT built_at, passed, files, edges, metrics FROM graph_fitness WHERE project=? ORDER BY built_at DESC LIMIT ?")
        .all(key, limit) as { built_at: string; passed: number; files: number; edges: number; metrics: string }[];
      return rows
        .map((r) => {
          const values: Record<string, number> = {};
          try {
            for (const m of JSON.parse(r.metrics) as { metric: string; value: number }[]) values[m.metric] = m.value;
          } catch {
            /* hàng hỏng → vẫn giữ mốc, chỉ mất phần metric */
          }
          return { builtAt: r.built_at, passed: r.passed === 1, files: r.files, edges: r.edges, values };
        })
        .reverse();
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}
