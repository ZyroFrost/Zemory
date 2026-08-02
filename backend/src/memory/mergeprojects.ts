// Gộp các project bị TÁCH TÊN — cùng một thư mục mà index ghi thành hai (hoặc hơn) khoá.
//
// Vì sao có bệnh này: `project_root` được ghi từ cwd của agent, mà cwd tới từ nhiều đường
// (`D:\` vs `d:\`, dấu `/` vs `\`, có/không dấu gạch cuối). `normalizeRoot` đã chặn từ
// 2026-07 nên dữ liệu MỚI không tách nữa — nhưng phần đã lỡ tách trước đó thì nằm im, và
// mỗi lần recall theo project chỉ trúng một nửa. Đây là công cụ gộp phần đã lỡ.
//
// Ba ràng buộc, đều từ luật của repo:
//   · KHÔNG XOÁ gì (điều 3): chỉ trỏ lại `project_root`; `cwd` gốc của từng phiên giữ
//     nguyên, nên vẫn truy được nó vốn thuộc thư mục nào.
//   · IN BẢNG TRƯỚC KHI LÀM: mặc định là dry-run; đổi dữ liệu thật phải do người gật.
//   · Chỉ gộp nhóm mà `normalizeRoot` chứng minh là CÙNG MỘT đường dẫn — không đoán theo
//     tên giống nhau, không gộp thư mục cha/con.

import { normalizeRoot, projectKey } from "../core/config.js";
import { currentMemoryDb, openMemory } from "./db.js";

export interface SplitVariant {
  root: string;
  sessions: number;
  messages: number;
}

export interface SplitGroup {
  /** Khoá chuẩn hoá — đích sẽ gộp về. */
  canonical: string;
  variants: SplitVariant[];
}

// Khoá so sánh dùng CHUNG toàn hệ (`core/config::projectKey`) — bản chép riêng ở đây đã gộp
// về đó ngày 2026-08-02 (F4: 5 bản tự chế đã lệch nhau).
const key = projectKey;

/** Nhóm nào có ≥2 biến thể viết khác nhau của cùng một thư mục. */
export function findSplitProjects(dbPath: string = currentMemoryDb()): SplitGroup[] {
  const db = openMemory(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT s.project_root AS root, COUNT(*) AS sessions,
                COALESCE(SUM(s.message_count), 0) AS messages
           FROM sessions s
          WHERE s.project_root IS NOT NULL AND s.project_root <> ''
          GROUP BY s.project_root`,
      )
      .all() as SplitVariant[];

    const byKey = new Map<string, SplitVariant[]>();
    for (const r of rows) {
      const k = key(r.root);
      byKey.set(k, [...(byKey.get(k) ?? []), r]);
    }
    const groups: SplitGroup[] = [];
    for (const [, variants] of byKey) {
      if (variants.length < 2) continue;
      // Đích = dạng chuẩn hoá của biến thể ĐÔNG PHIÊN NHẤT. Lấy theo số phiên chứ không
      // lấy bừa cái đầu: nếu hai dạng chỉ khác hoa/thường thì dạng đang được dùng nhiều
      // hơn là dạng thật sự đang sống trên máy.
      const lead = [...variants].sort((a, b) => b.sessions - a.sessions)[0];
      groups.push({
        canonical: normalizeRoot(lead.root).replace(/[\\/]+$/, ""),
        variants: [...variants].sort((a, b) => b.sessions - a.sessions),
      });
    }
    return groups.sort((a, b) => a.canonical.localeCompare(b.canonical));
  } finally {
    db.close();
  }
}

export interface MergeOutcome {
  canonical: string;
  from: string[];
  sessionsMoved: number;
}

/** Gộp các nhóm bị tách. `apply=false` (mặc định) chỉ ĐO, không ghi. */
export function mergeSplitProjects(
  opts: { apply?: boolean; dbPath?: string } = {},
): { groups: SplitGroup[]; applied: boolean; outcomes: MergeOutcome[] } {
  const dbPath = opts.dbPath ?? currentMemoryDb();
  const groups = findSplitProjects(dbPath);
  if (!opts.apply || !groups.length) return { groups, applied: false, outcomes: [] };

  const db = openMemory(dbPath);
  try {
    const outcomes: MergeOutcome[] = [];
    // `project_pinned = 1` đi kèm, cùng lý do như đường gộp trong UI: lần scan sau dùng
    // COALESCE trên cwd, không ghim thì nó trả `project_root` về chỗ cũ và tách lại.
    const upd = db.prepare(
      "UPDATE sessions SET project_root = ?, project_pinned = 1 WHERE project_root = ? AND project_root <> ?",
    );
    const run = db.transaction((gs: SplitGroup[]) => {
      for (const g of gs) {
        let moved = 0;
        const from: string[] = [];
        for (const v of g.variants) {
          if (v.root === g.canonical) continue;
          const n = upd.run(g.canonical, v.root, g.canonical).changes ?? 0;
          if (n > 0) {
            moved += n;
            from.push(v.root);
          }
        }
        if (moved) outcomes.push({ canonical: g.canonical, from, sessionsMoved: moved });
      }
    });
    run(groups);
    return { groups, applied: true, outcomes };
  } finally {
    db.close();
  }
}
