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
  const topN = opts.topN ?? 10;
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
  out.push(`  ${"lane".padEnd(16)} ${"recall@1".padStart(9)} ${"@3".padStart(6)} ${"@10".padStart(6)} ${"MRR".padStart(7)} ${"ms/truy vấn".padStart(12)}`);
  for (const l of r.lanes) {
    out.push(
      `  ${l.lane.padEnd(16)} ${pct(l.hit1).padStart(9)} ${pct(l.hit3).padStart(6)} ${pct(l.hit10).padStart(6)} ${l.mrr.toFixed(3).padStart(7)} ${String(l.msAvg).padStart(12)}`,
    );
  }
  return out;
}
