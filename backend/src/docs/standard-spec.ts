// Đọc BẢN CHUẨN từ chính `03_STRUCTURE.md` — §3 cây thư mục + §4 bảng routing.
//
// Vì sao có (audit 2026-07-27, finding F1): cùng một bản chuẩn đang nằm ở BA nơi —
// `03_STRUCTURE.md` (nguồn thật, điều 3), `SLOT_ROLES` bên backend, và hai bảng
// `STRUCT`/`ROUTE` **hardcode tay** trong `frontend/scripts/app.js`. Và nó KHÔNG phải
// rủi ro lý thuyết: đo được **§3 có 90 hàng mà UI hiện 35**, **§4 có 66 concern mà UI
// hiện 26** — tức màn tra cứu đang đưa người dùng một bản thiếu ~60%, chữ lại viết tắt
// khác nguồn. `03_STRUCTURE.md` đã đổi 38 lần; hai slot `graph/` `adapters/` thêm hôm
// nay cũng không lên UI.
//
// Một bề mặt CHỈ-ĐỌC mà nói sai thì nguy hơn một bề mặt báo lỗi: người ta vào đó để
// TRA, không thấy dòng mình cần thì kết luận "chuẩn chưa khai" rồi đẻ folder ngoài
// chuẩn — trong khi chuẩn có khai.
//
// Fail-open (điều 9): parse hỏng ⇒ trả mảng rỗng, phía gọi tự giữ bản dự phòng.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface StdTreeRow {
  /** 0..3 — suy từ cột của ký tự nhánh (đo thật: 0 · 4 · 7 · 11). */
  depth: number;
  /** tên thư mục/file, giữ nguyên dấu `/` cuối nếu có */
  name: string;
  /** '★' bắt buộc · 'opt' tạo khi có concern · 'gi' gitignore · '' */
  marker: "req" | "opt" | "gi" | "";
  /** ghi chú vai trò, đã nối các dòng xuống hàng */
  note: string;
}

export interface StdRouteRow {
  concern: string;
  where: string;
}

export interface StandardSpec {
  tree: StdTreeRow[];
  routing: StdRouteRow[];
}

/** Thân của một section `## N.` (tới heading `## ` kế tiếp). */
function section(md: string, re: RegExp): string {
  const at = md.search(re);
  if (at < 0) return "";
  const next = md.indexOf("\n## ", at + 5);
  return next < 0 ? md.slice(at) : md.slice(at, next);
}

// Cột của ký tự nhánh → độ sâu. Đo trên nguồn thật: 4 mức dùng cột 0/4/7/11.
const DEPTH_COLS = [0, 4, 7, 11];
const depthOf = (col: number): number => {
  let best = 0;
  for (let i = 0; i < DEPTH_COLS.length; i++) if (col >= DEPTH_COLS[i]) best = i;
  return best;
};

function parseTree(body: string): StdTreeRow[] {
  const rows: StdTreeRow[] = [];
  for (const raw of body.split("\n")) {
    const col = raw.search(/[├└]──/);
    if (col < 0) {
      // Dòng KHÔNG có nhánh: hoặc là dải phân cách `═══ ① …`, hoặc là chú thích xuống
      // dòng của hàng ngay trên. Nối vào note để không mất chữ.
      const cont = raw.replace(/^[│\s]+/, "").trim();
      if (rows.length && cont && !/^[═─]/.test(cont) && !cont.startsWith("#")) {
        rows[rows.length - 1].note += " " + cont;
      }
      continue;
    }
    const rest = raw.slice(col + 3).trim();
    if (!rest) continue;
    // `<tên>  <marker?>  <ghi chú>` — marker là ★ | [opt] | .gitignore | (manifest)
    const m = rest.match(/^(\S+(?:·\S+)*)\s+(.*)$/) ?? [null, rest, ""];
    let tail = (m[2] ?? "").trim();
    let marker: StdTreeRow["marker"] = "";
    if (tail.startsWith("★")) {
      marker = "req";
      tail = tail.slice(1).trim();
    } else if (/^\[opt\]/.test(tail)) {
      marker = "opt";
      tail = tail.replace(/^\[opt\]/, "").trim();
    } else if (/^\.gitignore/.test(tail)) {
      marker = "gi";
      tail = tail.replace(/^\.gitignore/, "").trim();
    }
    rows.push({ depth: depthOf(col), name: (m[1] ?? "").trim(), marker, note: tail });
  }
  return rows;
}

function parseRouting(body: string): StdRouteRow[] {
  const out: StdRouteRow[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/);
    if (!m) continue;
    const concern = m[1].replace(/\*\*/g, "").trim();
    // bỏ hàng header + hàng gạch ngang của bảng markdown
    if (!concern || /^-+$/.test(concern) || /Có gì|cần làm/i.test(concern)) continue;
    out.push({ concern, where: m[2].trim() });
  }
  return out;
}

/**
 * Đọc bản chuẩn của một profile. `root` = thư mục chứa `docs/agent/03_STRUCTURE.md`
 * (repo này, hoặc `docs_template/<profile>` khi muốn bản mẫu trắng).
 */
export function readStandardSpec(root: string, rel = join("docs", "agent", "03_STRUCTURE.md")): StandardSpec {
  let md: string;
  try {
    md = readFileSync(join(root, rel), "utf8");
  } catch {
    return { tree: [], routing: [] }; // fail-open: phía gọi giữ bản dự phòng
  }
  try {
    // Tìm theo TÊN section, KHÔNG theo số: hai profile đánh số khác nhau (app dùng
    // §3/§4, non-app dùng §2/§3), và repo này đã từng đánh số lại một lần. Ghim số là
    // sẽ có ngày một profile trả về rỗng mà không ai biết.
    return {
      tree: parseTree(section(md, /^##\s*\d+\.\s*C[âa]y th[ưu] m[ụu]c/im)),
      routing: parseRouting(section(md, /^##\s*\d+\.\s*Routing/im)),
    };
  } catch {
    return { tree: [], routing: [] };
  }
}
