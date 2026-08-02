// Xung đột ở TẦNG TRÍ NHỚ — hai bản ghi nói ngược nhau về cùng một chuyện.
//
// Bối cảnh: 2026-08-02 zemory đã đánh dấu được quyết định bị đảo trong CHANGELOG (link
// `supersedes_id` tất định). Nhưng changelog là thứ người viết tay; còn hai câu trong kho
// nhớ nói ngược nhau thì vẫn nằm im cạnh nhau, và recall trả cả hai với vẻ chắc chắn như
// nhau — phiên sau đọc trúng câu chết là làm sai.
//
// THỨ TỰ THEO HP ĐIỀU 6 (nới 2026-08-02b), và đây là chỗ ranh giới phải giữ cho chặt:
//   ① SCRIPT (file này): lọc ra CẶP NGHI NGỜ — tất định, 0 token, lặp lại ra cùng kết quả.
//      Dấu hiệu dùng được bằng máy: cùng chủ đề (cùng truy vấn kéo cả hai lên), CÁCH XA
//      NHAU VỀ THỜI GIAN, và mang dấu hiệu QUYẾT ĐỊNH (từ khoá chốt/đảo, hai thứ tiếng).
//   ② AGENT LIÊN KẾT phán "có thật sự ngược nhau không" — nó đã ở đó, dùng token của phiên
//      đang chạy. Lời dặn nằm trong mô tả tool.
//   ③ zemory tự gọi model: KHÔNG. Không cần tới, nên không mở.
// Vì vậy file này TUYỆT ĐỐI không kết luận "A mâu thuẫn B" — nó chỉ nói "hai câu này đáng
// để nhìn". Đặt tên hàm/field theo đúng mức tin đó (`candidates`, không phải `conflicts`).

import { recall, getMessage } from "./search.js";
import { currentMemoryDb } from "./db.js";

/** Dấu hiệu một câu đang CHỐT/ĐẢO điều gì đó. Hai thứ tiếng vì kho nhớ song ngữ.
 *  Cố ý hẹp: bắt rộng thì mọi câu đều thành "quyết định" và bảng kết quả thành rác. */
const DECISION = [
  /\bchốt\b/i,
  /\bquyết định\b/i,
  /\bthay vì\b/i,
  /\bbỏ\b.{0,20}\b(scope|hướng|cách)\b/i,
  /\bkhông (bao giờ|còn|dùng|làm)\b/i,
  /\bđổi (sang|thành|hướng)\b/i,
  /\bsupersede\b/i,
  /\bđảo\b/i,
  /\bwe (decided|will not|no longer)\b/i,
  /\bdecision\b/i,
  /\binstead of\b/i,
  /\bdeprecat/i,
];

export interface ConflictSide {
  id: number;
  sessionId: string;
  source: string;
  timestamp: string | null;
  role: string;
  text: string;
}

export interface ConflictCandidate {
  /** Khoảng cách ngày giữa hai câu — càng xa càng đáng nghi là "luật đã đổi mà chưa ai ghi". */
  daysApart: number;
  older: ConflictSide;
  newer: ConflictSide;
}

const isDecision = (s: string): boolean => DECISION.some((re) => re.test(s));
const ts = (s: string | null): number => (s ? Date.parse(s) : NaN);

export interface ConflictOptions {
  project?: string;
  all?: boolean;
  limit?: number;
  /** Ngưỡng ngày tối thiểu giữa hai câu để coi là đáng nhìn (mặc định 1). */
  minDaysApart?: number;
  dbPath?: string;
}

/**
 * Tìm CẶP NGHI NGỜ quanh một chủ đề. Không phán, không xoá, không sửa gì.
 *
 * Cách chọn cặp: lấy các hit MANG DẤU HIỆU QUYẾT ĐỊNH, rồi ghép câu MỚI NHẤT với những câu
 * cũ hơn nó — vì ca đau thật là "luật mới đã có mà câu cũ vẫn trả về như đang sống". Ghép
 * mọi cặp với nhau sẽ nổ tổ hợp và phần lớn là rác.
 */
export async function conflictCandidates(
  topic: string,
  opts: ConflictOptions = {},
): Promise<{ topic: string; scanned: number; decisionHits: number; candidates: ConflictCandidate[] }> {
  const dbPath = opts.dbPath ?? currentMemoryDb();
  const limit = Math.max(4, Math.min(50, opts.limit ?? 20));
  const minDays = opts.minDaysApart ?? 1;
  const hits = await recall(topic, { project: opts.project, all: opts.all, limit, dbPath });

  const sides: ConflictSide[] = [];
  for (const h of hits) {
    const full = getMessage(h.id, dbPath) as
      | { id: number; session_id: string; role: string; content: string; timestamp: string | null; source: string }
      | undefined;
    if (!full) continue;
    if (!isDecision(full.content)) continue;
    sides.push({
      id: full.id,
      sessionId: full.session_id,
      source: full.source,
      timestamp: full.timestamp,
      role: full.role,
      // Cắt để cặp đọc được trong một lần nhìn; agent muốn đủ thì gọi `memory_show`.
      text: full.content.replace(/\s+/g, " ").slice(0, 700),
    });
  }

  const dated = sides.filter((s) => Number.isFinite(ts(s.timestamp))).sort((a, b) => ts(b.timestamp) - ts(a.timestamp));
  const candidates: ConflictCandidate[] = [];
  if (dated.length >= 2) {
    const newest = dated[0];
    for (const older of dated.slice(1)) {
      const days = Math.round((ts(newest.timestamp) - ts(older.timestamp)) / 86_400_000);
      if (days < minDays) continue;
      candidates.push({ daysApart: days, older, newer: newest });
    }
  }
  return { topic, scanned: hits.length, decisionHits: sides.length, candidates: candidates.slice(0, 8) };
}
