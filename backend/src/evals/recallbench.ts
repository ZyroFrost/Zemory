// Recall bench trên KHO THẬT — cổng để trả lời "lớp nào đáng bật mặc định" bằng bằng chứng.
//
// Vì sao cần, dù đã có `ragbench`: corpus của ragbench là **8 tài liệu** rời rạc chủ đề (bánh
// ngọt · con mèo · leo núi) với 1 đáp án đúng mỗi truy vấn. Hybrid đạt 8/8 ở đó là chuyện
// đương nhiên, và **rerank không còn gì để chứng minh** — pool rerank là 40 mà cả corpus chỉ
// có 8 doc. Đo trên corpus bão hoà rồi kết luận "rerank không thắng" là sai phương pháp; đây
// là chỗ đã suýt dẫn tới quyết định tắt rerank (rút lại 2026-08-03).
//
// Corpus này khác ở đúng ba điểm quyết định:
//   · TÀI LIỆU = toàn bộ kho thật (~198k tin) ⇒ pool 40 mới có nghĩa;
//   · MỒI NHIỄU tự nhiên GẦN chủ đề (tin cùng repo, cùng giai đoạn) ⇒ đúng chỗ rerank ăn tiền;
//   · TRUY VẤN diễn đạt lại, cố ý tránh trùng từ khoá ⇒ đúng chỗ FTS thua.
//
// Nhãn neo bằng `(session_id, uuid)` — bền qua re-ingest, và KHÔNG chở nội dung tin vào git
// (điều 7). Máy không có đúng kho đó thì bench báo thiếu nhãn chứ không giả vờ có kết quả.

import { type MemoryDB, currentMemoryDb, openMemory } from "../memory/db.js";
import { type SearchHit, search, searchHybrid } from "../memory/search.js";
import { type LabeledQuery, RECALL_CORPUS } from "./recall-corpus.js";

export type { LabeledQuery };

export interface LaneResult {
  lane: string;
  /** Số truy vấn tìm ĐÚNG tin đích trong top-k. */
  hit1: number;
  hit3: number;
  hit10: number;
  /**
   * TRẦN CỦA POOL — đáp án có NẰM TRONG pool mà rerank được phép sắp lại hay không.
   *
   * Vì sao đây là con số quan trọng nhất, và vì sao trước đó không có (tra chuẩn ngành
   * 2026-08-03): mọi hướng dẫn RAG đều nói **lớp LẤY phải tối ưu RECALL, rerank là lớp
   * PRECISION** — lấy dư 3–5 lần rồi rerank lọc xuống. Nếu `hit40 ≈ hit10` thì đáp án
   * **không có trong pool**, và không mô hình rerank nào cứu được: nó chỉ đang xáo lại một
   * đống câu sai. Nghẽn khi đó nằm ở lớp LẤY, không phải lớp XẾP.
   * Tôi đã mò ba lượt tham số rerank trước khi hỏi câu này — đó là sai thứ tự.
   */
  hit40: number;
  /** Mean Reciprocal Rank — thước nhạy hơn recall@k khi so hai lớp gần nhau. */
  mrr: number;
  msAvg: number;
  /** Thứ hạng của tin đích từng truy vấn (0 = không thấy trong top-N). */
  ranks: number[];
}

export interface RecallBenchResult {
  corpus: number;
  resolved: number;
  missing: number;
  lanes: LaneResult[];
}

/** Corpus là module TS (không phải .json) để `tsc` ship nó theo `dist` — repo này không có
 *  bước copy asset, và một fixture đọc từ `backend/src/` sẽ chết khi cài qua npm. */
export function loadCorpus(): LabeledQuery[] {
  return RECALL_CORPUS;
}

/** Nhãn (session,uuid) → id hiện hành trong DB này. Không thấy ⇒ null (đếm vào `missing`). */
function resolveGold(db: MemoryDB, q: LabeledQuery): number | null {
  const row = db.prepare("SELECT id FROM messages WHERE session_id = ? AND uuid = ?").get(q.session, q.uuid) as
    | { id: number }
    | undefined;
  return row?.id ?? null;
}

const rankOf = (hits: SearchHit[], gold: number): number => {
  const i = hits.findIndex((h) => h.id === gold);
  return i < 0 ? 0 : i + 1;
};

export interface RecallBenchOptions {
  /** Chỉ chạy N truy vấn đầu (chạy nhanh khi thử). */
  limit?: number;
  /** Bỏ lane rerank (nó chậm hàng chục lần). */
  skipRerank?: boolean;
  topN?: number;
}

export async function runRecallBench(opts: RecallBenchOptions = {}): Promise<RecallBenchResult> {
  // 40, không phải 10: phải nhìn HẾT pool rerank mới đo được trần (hit40). Chỉ số @1/@3/@10
  // vẫn tính đúng vì chúng lọc theo thứ hạng, không theo số kết quả trả về.
  const topN = opts.topN ?? 40;
  const all = loadCorpus();
  const corpus = opts.limit ? all.slice(0, opts.limit) : all;
  const db = openMemory(currentMemoryDb());
  const items: { q: LabeledQuery; gold: number }[] = [];
  let missing = 0;
  try {
    for (const q of corpus) {
      const gold = resolveGold(db, q);
      if (gold === null) missing++;
      else items.push({ q, gold });
    }
  } finally {
    db.close();
  }

  const lanes: LaneResult[] = [];
  const run = async (lane: string, fn: (q: string) => Promise<SearchHit[]> | SearchHit[]) => {
    const ranks: number[] = [];
    let ms = 0;
    for (const it of items) {
      const t = Date.now();
      const hits = await fn(it.q.q);
      ms += Date.now() - t;
      ranks.push(rankOf(hits, it.gold));
    }
    const hitAt = (k: number) => ranks.filter((r) => r > 0 && r <= k).length;
    lanes.push({
      lane,
      hit1: hitAt(1),
      hit3: hitAt(3),
      hit10: hitAt(10),
      hit40: hitAt(40),
      mrr: ranks.reduce((s, r) => s + (r > 0 ? 1 / r : 0), 0) / (items.length || 1),
      msAvg: Math.round(ms / (items.length || 1)),
      ranks,
    });
  };

  await run("fts", (q) => search(q, { limit: topN, all: true }));
  await run("hybrid", (q) => searchHybrid(q, { limit: topN, all: true, rerank: false }));
  if (!opts.skipRerank) await run("hybrid+rerank", (q) => searchHybrid(q, { limit: topN, all: true, rerank: true }));

  return { corpus: corpus.length, resolved: items.length, missing, lanes };
}

export function formatRecallBench(r: RecallBenchResult): string[] {
  const out: string[] = [];
  out.push(`zemory recall bench — ${r.resolved}/${r.corpus} truy vấn có nhãn giải được${r.missing ? ` (thiếu ${r.missing}: kho này không có tin đích)` : ""}`);
  if (!r.resolved) {
    out.push("  Không nhãn nào giải được trên kho này — bench KHÔNG kết luận gì (đừng đọc là 'sạch').");
    return out;
  }
  const pct = (n: number) => `${((100 * n) / r.resolved).toFixed(0)}%`;
  out.push(
    `  ${"lane".padEnd(16)} ${"recall@1".padStart(9)} ${"@3".padStart(6)} ${"@10".padStart(6)} ${"@40".padStart(6)} ${"MRR".padStart(7)} ${"ms/truy vấn".padStart(12)}`,
  );
  for (const l of r.lanes) {
    out.push(
      `  ${l.lane.padEnd(16)} ${pct(l.hit1).padStart(9)} ${pct(l.hit3).padStart(6)} ${pct(l.hit10).padStart(6)} ${pct(l.hit40).padStart(6)} ${l.mrr.toFixed(3).padStart(7)} ${String(l.msAvg).padStart(12)}`,
    );
  }
  // `@40` là TRẦN: đáp án có nằm trong pool rerank được phép sắp lại không. `@40 ≈ @10` ⇒ nghẽn
  // ở lớp LẤY, rerank không có gì để cứu. `@40` cao hơn hẳn ⇒ đáp án có trong pool mà bị xếp
  // tụt, lúc đó rerank mới có cửa.
  const hy = r.lanes.find((l) => l.lane === "hybrid");
  if (hy) {
    const room = hy.hit40 - hy.hit10;
    out.push(
      room > 0
        ? `  → hybrid còn ${room}/${r.resolved} câu nằm trong pool mà ngoài top-10 ⇒ rerank CÓ chỗ để cải thiện.`
        : `  → hybrid: @40 == @10 ⇒ đáp án KHÔNG nằm thêm trong pool. Nghẽn ở lớp LẤY, không phải lớp XẾP — đổi mô hình rerank cũng vô ích.`,
    );
  }
  return out;
}
