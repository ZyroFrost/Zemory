// Dọn thư mục nháp của host — thứ phình vô hạn mà không ai nhìn.
//
// Vì sao cần: harness cho agent một thư mục tạm mỗi PHIÊN (`<temp>/claude/<project>/<session>/
// scratchpad`). Một phiên làm việc nặng để lại hàng GB ở đó — đo 2026-08-20 trên đúng một phiên:
// **3,97 GB** (model ONNX tải về để đo, cache HuggingFace, profile trình duyệt, JSON số liệu).
// Không tiến trình nào dọn, không cổng nào kêu, và người dùng chỉ phát hiện khi đĩa đầy.
//
// Vì sao là JOB chứ không phải lời dặn: user nói thẳng — *"đợi t kiểm thì t ko nhớ và cũng lâu
// mới làm"*. Cùng doctrine với `structure-sync`/`conform`: thứ CHẶN drift là code, không phải
// một dòng luật ai đó phải nhớ.
//
// BỐN RÀNG BUỘC AN TOÀN (đây là job tự xoá file — phải khắt khe hơn bình thường):
//  ① CHỈ đụng thư mục khớp đúng khuôn `.../claude/<project>/<session>/scratchpad` — không nhận
//     một đường dẫn tuỳ ý nào khác. Ghi nhầm chỗ ở đây là xoá nhầm dữ liệu người ta.
//  ② KHÔNG BAO GIỜ đụng phiên đang chạy (bỏ qua `keepSession`, và bỏ qua mọi thư mục vừa được
//     ghi trong `MIN_AGE_MS`) — dọn dưới chân một phiên đang làm việc là phá việc đang làm.
//  ③ Xoá phiên CŨ NHẤT trước, và chỉ tới khi về dưới trần; không "dọn cho sạch".
//  ④ Fail-open tuyệt đối (HP điều 9): mọi lỗi đều nuốt, job này hỏng không được kéo theo ai.

import { readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Giữ lại phiên mới hơn mốc này, kể cả khi tổng vượt trần. */
const MIN_AGE_MS = 6 * 60 * 60_000; // 6 giờ
/** Trần tổng dung lượng của TẤT CẢ scratchpad cộng lại. */
const BUDGET_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
/** Quá hạn này thì dọn dù tổng chưa chạm trần — rác cũ không có lý do tồn tại. */
const MAX_AGE_MS = 7 * 24 * 60 * 60_000; // 7 ngày

export interface SweepResult {
  /** Thư mục gốc đã quét (null = không tìm thấy, không phải lỗi). */
  root: string | null;
  totalBytes: number;
  removed: { path: string; bytes: number; ageDays: number; why: "quá hạn" | "vượt trần" }[];
  keptBytes: number;
}

/** Cộng dung lượng một cây thư mục; lỗi đọc ⇒ tính 0 (không đoán, không ném). */
function dirBytes(dir: string): number {
  let total = 0;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return 0;
  }
  for (const name of entries) {
    const p = join(dir, name);
    try {
      const st = statSync(p);
      total += st.isDirectory() ? dirBytes(p) : st.size;
    } catch {
      // file biến mất giữa chừng (phiên khác đang dọn) — bỏ qua
    }
  }
  return total;
}

/** Mốc thời gian mới nhất trong cây — dùng làm "phiên này còn sống không". */
function newestMtime(dir: string): number {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return 0;
  }
  // stat thư mục hỏng ⇒ coi như chưa biết mốc (0), để phần duyệt con quyết định.
  let newest: number;
  try {
    newest = statSync(dir).mtimeMs;
  } catch {
    newest = 0;
  }
  for (const name of entries) {
    const p = join(dir, name);
    try {
      const st = statSync(p);
      const t = st.isDirectory() ? newestMtime(p) : st.mtimeMs;
      if (t > newest) newest = t;
    } catch {
      // như trên
    }
  }
  return newest;
}

/** Thư mục nháp gốc của host, hoặc null nếu máy này không có. */
export function scratchpadRoot(): string | null {
  const root = join(tmpdir(), "claude");
  try {
    return statSync(root).isDirectory() ? root : null;
  } catch {
    return null;
  }
}

/**
 * Quét và dọn. `dryRun` chỉ báo cáo, không xoá — dùng cho lệnh kiểm và cho test.
 * `keepSession` là id phiên đang chạy (không bao giờ đụng tới).
 */
export function sweepScratchpads(
  opts: { root?: string | null; dryRun?: boolean; keepSession?: string; budgetBytes?: number; now?: number } = {},
): SweepResult {
  const root = opts.root === undefined ? scratchpadRoot() : opts.root;
  const out: SweepResult = { root, totalBytes: 0, removed: [], keptBytes: 0 };
  if (!root) return out;
  const now = opts.now ?? Date.now();
  const budget = opts.budgetBytes ?? BUDGET_BYTES;

  // Khuôn BẮT BUỘC: <root>/<project>/<session>/scratchpad. Bất cứ thứ gì không khớp đều bị bỏ
  // qua — job này không được phép "tự hiểu" một bố cục khác rồi xoá theo phỏng đoán.
  const found: { path: string; bytes: number; mtime: number; session: string }[] = [];
  let projects: string[];
  try {
    projects = readdirSync(root);
  } catch {
    return out;
  }
  for (const proj of projects) {
    let sessions: string[];
    try {
      sessions = readdirSync(join(root, proj));
    } catch {
      continue;
    }
    for (const sess of sessions) {
      const pad = join(root, proj, sess, "scratchpad");
      try {
        if (!statSync(pad).isDirectory()) continue;
      } catch {
        continue;
      }
      const bytes = dirBytes(pad);
      found.push({ path: pad, bytes, mtime: newestMtime(pad), session: sess });
      out.totalBytes += bytes;
    }
  }

  // Cũ nhất trước — thứ tự này quyết định ai bị dọn khi vượt trần.
  found.sort((a, b) => a.mtime - b.mtime);
  let running = out.totalBytes;
  for (const f of found) {
    const ageMs = now - f.mtime;
    const isCurrent = opts.keepSession && f.session === opts.keepSession;
    const tooYoung = ageMs < MIN_AGE_MS;
    if (isCurrent || tooYoung) continue; // ràng buộc ②
    const why = ageMs > MAX_AGE_MS ? "quá hạn" : running > budget ? "vượt trần" : null;
    if (!why) continue;
    if (!opts.dryRun) {
      try {
        rmSync(f.path, { recursive: true, force: true, maxRetries: 2 });
      } catch {
        continue; // xoá không được thì bỏ qua, không tính là đã dọn
      }
    }
    out.removed.push({ path: f.path, bytes: f.bytes, ageDays: Math.round(ageMs / 86_400_000), why });
    running -= f.bytes;
  }
  out.keptBytes = running;
  return out;
}
