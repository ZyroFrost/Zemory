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
import { corpusByKind, type LabeledQuery, NEGATIVE_CORPUS, RECALL_CORPUS } from "./recall-corpus.js";

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
  /**
   * Cùng số đo, TÁCH THEO LỚP truy vấn (`prose` · `tool_use` · `tool_result`).
   *
   * Vì sao con số gộp không đủ (đo thành phần kho 2026-08-07): ba lớp được tìm bằng những
   * đường KHÁC HẲN nhau — `prose` có cả vector lẫn trigram, `tool_result` có vector nhưng
   * không trigram, `tool_use` chỉ còn FTS word. Gộp lại thành một tỉ lệ thì một lớp sập
   * hoàn toàn vẫn có thể bị lớp khác kéo cho đẹp, và ta mất đúng thứ cần biết để quyết
   * "có đáng embed thêm / cắt bớt lớp nào không" (HP điều 15: cắt hay thêm đều phải đo trước).
   */
  byKind: Record<string, KindStat>;
}

export interface KindStat {
  n: number;
  hit1: number;
  hit3: number;
  hit10: number;
  hit40: number;
  mrr: number;
}

export interface RecallBenchResult {
  corpus: number;
  resolved: number;
  missing: number;
  lanes: LaneResult[];
  /** Mỗi lớp: `have` = nhãn GIẢI ĐƯỢC trên kho này / `total` = nhãn có trong corpus.
   *
   *  Vì sao phải tách (lỗ audit 2026-08-07 để lọt một lượt): `missing` là số đếm GỘP, còn
   *  bảng theo lớp chỉ tính trên nhãn giải được — nên một lớp mất gần hết nhãn (chạy trên
   *  máy khác, kho khác) vẫn in ra một tỉ lệ recall trông như đầy đủ, hoặc biến mất khỏi
   *  bảng mà không ai hay. Tỉ lệ tính trên 2/14 câu KHÔNG so được với tỉ lệ tính trên 14/14,
   *  và đó đúng là kiểu số liệu sai mà không báo lỗi. */
  coverage: Record<string, { have: number; total: number }>;
  /** Mặt TRÁI: hệ có bịa không. Đo trên `NEGATIVE_CORPUS` — câu hỏi kho chắc chắn không có
   *  câu trả lời. Thiếu vế này thì mọi thay đổi nới pool đều "cải thiện", vì cái thước chỉ
   *  đo một chiều (lỗ đo được 2026-08-08, ngay sau khi thêm luồng OR). */
  negative?: NegativeResult;
}

export interface NegativeResult {
  n: number;
  /** Số câu hệ trả về RỖNG — hành vi lý tưởng cho câu hỏi không có đáp án. */
  empty: number;
  /** Số kết quả trung bình trả về khi kho KHÔNG có gì để trả. Càng thấp càng tốt. */
  hitsAvg: number;
  /** Điểm RRF của kết quả đầu, trung bình. So với ca dương để biết hệ có "tự tin sai" không. */
  topScoreAvg: number;
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
  /** Bỏ vế ÂM TÍNH. Chỉ dùng khi cố tình chỉ muốn số recall — mặc định KHÔNG bỏ, vì
   *  thiếu nó thì mọi thay đổi nới pool đều trông như cải thiện thuần. */
  skipNegative?: boolean;
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
    // Tách theo lớp: đi qua CÙNG mảng ranks nên không chạy lại truy vấn nào — chỉ là cách
    // đọc khác trên cùng số đo, không thêm chi phí và không thể lệch với con số gộp.
    const byKind: Record<string, KindStat> = {};
    items.forEach((it, i) => {
      const k = it.q.kind ?? "prose";
      const s = (byKind[k] ??= { n: 0, hit1: 0, hit3: 0, hit10: 0, hit40: 0, mrr: 0 });
      const r = ranks[i];
      s.n++;
      if (r > 0 && r <= 1) s.hit1++;
      if (r > 0 && r <= 3) s.hit3++;
      if (r > 0 && r <= 10) s.hit10++;
      if (r > 0 && r <= 40) s.hit40++;
      s.mrr += r > 0 ? 1 / r : 0;
    });
    for (const s of Object.values(byKind)) s.mrr = s.mrr / (s.n || 1);
    lanes.push({
      lane,
      hit1: hitAt(1),
      hit3: hitAt(3),
      hit10: hitAt(10),
      hit40: hitAt(40),
      mrr: ranks.reduce((s, r) => s + (r > 0 ? 1 / r : 0), 0) / (items.length || 1),
      msAvg: Math.round(ms / (items.length || 1)),
      ranks,
      byKind,
    });
  };

  await run("fts", (q) => search(q, { limit: topN, all: true }));
  await run("hybrid", (q) => searchHybrid(q, { limit: topN, all: true, rerank: false }));
  if (!opts.skipRerank) await run("hybrid+rerank", (q) => searchHybrid(q, { limit: topN, all: true, rerank: true }));

  // Độ phủ nhãn theo lớp — `corpusByKind()` là nguồn "tổng có bao nhiêu", `items` là
  // "giải được bao nhiêu trên kho NÀY".
  const coverage: Record<string, { have: number; total: number }> = {};
  for (const [kind, list] of corpusByKind()) coverage[kind] = { have: 0, total: list.length };
  for (const it of items) {
    const k = it.q.kind ?? "prose";
    (coverage[k] ??= { have: 0, total: 0 }).have++;
  }
  // Mặt TRÁI — chạy trên cùng đường `hybrid` (đường mặc định của recall), vì đó là thứ
  // người dùng thật chạm vào. Đo ba con số bổ nhau: có trả rỗng không · trả bao nhiêu ·
  // điểm đầu bao nhiêu (so với ca dương thì mới biết hệ "tự tin sai" tới mức nào).
  let negative: NegativeResult | undefined;
  if (!opts.skipNegative && NEGATIVE_CORPUS.length) {
    let empty = 0, hits = 0, score = 0;
    for (const nq of NEGATIVE_CORPUS) {
      const r = await searchHybrid(nq.q, { limit: topN, all: true, rerank: false });
      if (!r.length) empty++;
      hits += r.length;
      score += r[0]?.score ?? 0;
    }
    negative = {
      n: NEGATIVE_CORPUS.length,
      empty,
      hitsAvg: hits / NEGATIVE_CORPUS.length,
      topScoreAvg: score / NEGATIVE_CORPUS.length,
    };
  }
  return { corpus: corpus.length, resolved: items.length, missing, lanes, coverage, negative };
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
  // BẢNG THEO LỚP — thứ con số gộp che mất. Chỉ in cho `hybrid` (đường recall mặc định);
  // muốn so lane khác thì đọc `byKind` trong kết quả JSON.
  // Điều kiện in xét ĐỘ PHỦ CỦA CORPUS, không xét kết quả: bản đầu dùng
  // `Object.keys(hyb.byKind).length > 1` — nghĩa là đúng lúc một lớp mất sạch nhãn (chỉ còn
  // một lớp có kết quả) thì cả bảng biến mất, che luôn thứ cần báo. Test bắt được ca này.
  const hyb = r.lanes.find((l) => l.lane === "hybrid");
  if (hyb && Object.keys(r.coverage ?? {}).length > 1) {
    out.push("");
    out.push(`  hybrid theo LỚP (mỗi lớp tìm bằng đường khác nhau — KHÔNG so lớp này với lớp kia):`);
    out.push(`  ${"lớp".padEnd(16)} ${"n".padStart(4)} ${"@1".padStart(6)} ${"@3".padStart(6)} ${"@10".padStart(6)} ${"@40".padStart(6)} ${"MRR".padStart(7)}`);
    const NOTE: Record<string, string> = {
      prose: "vector + trigram",
      tool_use: "CHỈ FTS word",
      tool_result: "vector, KHÔNG trigram",
    };
    for (const [kind, s] of Object.entries(hyb.byKind).sort()) {
      const p = (n: number) => `${((100 * n) / (s.n || 1)).toFixed(0)}%`;
      const cov = r.coverage?.[kind];
      // Cột `n` in dạng `giải-được/tổng` khi có nhãn không giải được: tỉ lệ tính trên 2/14 câu
      // KHÔNG so được với tỉ lệ tính trên 14/14, mà nhìn thì hai bên giống hệt nhau.
      const nCol = cov && cov.have !== cov.total ? `${s.n}/${cov.total}` : String(s.n);
      out.push(
        `  ${kind.padEnd(16)} ${nCol.padStart(6)} ${p(s.hit1).padStart(6)} ${p(s.hit3).padStart(6)} ${p(s.hit10).padStart(6)} ${p(s.hit40).padStart(6)} ${s.mrr.toFixed(3).padStart(7)}` +
          (NOTE[kind] ? `   ${NOTE[kind]}` : ""),
      );
    }
    // Lớp MẤT SẠCH nhãn không có hàng nào ở trên — phải nói ra, không thì nó im lặng biến mất.
    const gone = Object.entries(r.coverage ?? {}).filter(([k, c]) => c.have === 0 && c.total > 0 && !hyb.byKind[k]);
    for (const [k, c] of gone) {
      out.push(`  ${k.padEnd(16)} ${`0/${c.total}`.padStart(6)}   — KHÔNG nhãn nào giải được trên kho này ⇒ lớp này CHƯA được đo`);
    }
    out.push("");
  }

  // MẶT TRÁI — in NGAY dưới bảng recall, không để cuối: người đọc phải thấy cả hai chiều
  // cùng lúc, nếu không sẽ đọc recall tăng là "tốt lên" mà không biết giá phải trả.
  if (r.negative) {
    const g = r.negative;
    out.push("");
    out.push(
      `  ÂM TÍNH (${g.n} câu hỏi kho KHÔNG có đáp án — đo "hệ có bịa không"):` +
        ` trả rỗng ${g.empty}/${g.n} · trung bình ${g.hitsAvg.toFixed(1)} kết quả · điểm đầu TB ${g.topScoreAvg.toFixed(4)}`,
    );
    out.push(
      g.empty === g.n
        ? "  → tốt: không câu nào bịa ra kết quả."
        : `  → ${g.n - g.empty}/${g.n} câu VẪN trả kết quả dù không có gì để trả. So ĐIỂM ĐẦU với ca dương:` +
          " gần bằng nhau ⇒ hệ 'tự tin sai', người đọc không phân biệt được thật/rác.",
    );
  }

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
