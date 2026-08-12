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
import { corpusByKind, type LabeledQuery, NEGATIVE_CORPUS, NEGATIVE_HOLDOUT, RECALL_CORPUS } from "./recall-corpus.js";
import { vectorsByRowid } from "../memory/vectors.js";

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
   * THƯỚC THỨ HAI — "TƯƠNG ĐƯƠNG": hit khi tin trả về LÀ đáp án **hoặc** gần trùng nội dung
   * với nó (cosine ≥ `EQUIV_SIM` trên vector ĐÃ CÓ, 0 gọi model).
   *
   * 🔴 Vì sao BẮT BUỘC phải có (đo 2026-08-09, sau khi 8 giả thuyết liên tiếp cùng thất bại
   * theo CÙNG MỘT hướng): kho này bàn đi bàn lại một việc ở nhiều phiên, nên khi recall trả
   * về một tin **tương đương từ phiên khác**, thước nhãn-đơn-uuid đếm là TRƯỢT. Soi 6 ca
   * "đáp án bị tụt": **4/6 kẻ chiếm chỗ gần trùng nội dung (≥0,80), 0/6 lạc đề**. Chuẩn ngành
   * (Natural Questions) tính hit khi BẤT KỲ đoạn nào chứa đáp án — tức thước cũ đang phạt oan
   * đúng thứ hệ làm tốt, và nó đã làm tôi BÁC những thay đổi đáng ship.
   *
   * GIỮ CẢ HAI, không thay thế: nghiêm trả lời *"có trả đúng cái được đánh dấu"*, tương đương
   * trả lời *"người dùng có nhận được câu trả lời"*. Hai câu khác nhau; dùng lẫn là ra quyết
   * định sai — đó chính là lỗi đã mắc suốt 8 phép thử.
   */
  equiv?: { hit1: number; hit3: number; hit10: number; hit40: number; mrr: number };
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

/** Ngưỡng "cùng nội dung" cho thước TƯƠNG ĐƯƠNG. Đo 2026-08-09: các tin chiếm chỗ đáp án nằm
 *  ở 0,757–0,889; 0,85 là mức đòi giống RÕ, không phải chỉ cùng chủ đề. Chỉnh được từ ngoài
 *  vì nó là tham số ĐO — không phải hằng số hành vi. */
const EQUIV_SIM = Number(process.env.ZEMORY_EQUIV_SIM) || 0.85;

const cosine = (a: Float32Array, b: Float32Array): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s; // vector trong chỉ mục đã chuẩn hoá đơn vị
};

/**
 * Hạng theo thước TƯƠNG ĐƯƠNG: vị trí đầu tiên mà tin trả về LÀ đáp án hoặc gần trùng nó.
 * Thiếu vector (lớp `tool_use` không có vector nào) ⇒ rơi về đúng thước nghiêm, KHÔNG bịa
 * điểm cho lớp không đo được (điều 12).
 */
const rankEquivOf = (hits: SearchHit[], gold: number): number => {
  const strict = rankOf(hits, gold);
  if (strict === 1 || !hits.length) return strict;
  const vecs = vectorsByRowid([gold, ...hits.map((h) => h.id)]);
  const gv = vecs.get(gold);
  if (!gv) return strict;
  for (let i = 0; i < hits.length; i++) {
    if (hits[i].id === gold) return i + 1;
    const v = vecs.get(hits[i].id);
    if (v && cosine(gv, v) >= EQUIV_SIM) return i + 1;
  }
  return 0;
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
    const eqRanks: number[] = [];
    let ms = 0;
    for (const it of items) {
      const t = Date.now();
      const hits = await fn(it.q.q);
      ms += Date.now() - t; // đo TRƯỚC khi chấm: thước tương đương tra vector nên tốn thêm,
      ranks.push(rankOf(hits, it.gold)); //   mà đó là chi phí của PHÉP ĐO, không phải của recall.
      eqRanks.push(rankEquivOf(hits, it.gold));
    }
    const hitAt = (k: number) => ranks.filter((r) => r > 0 && r <= k).length;
    const eqAt = (k: number) => eqRanks.filter((r) => r > 0 && r <= k).length;
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
      equiv: {
        hit1: eqAt(1),
        hit3: eqAt(3),
        hit10: eqAt(10),
        hit40: eqAt(40),
        mrr: eqRanks.reduce((s, r) => s + (r > 0 ? 1 / r : 0), 0) / (items.length || 1),
      },
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
  // CHẠY CẢ HAI bộ âm: bộ cũ (đã dùng để chỉnh ngưỡng cổng "không biết") và bộ GIỮ RIÊNG
  // (chưa từng tham gia chọn tham số). Bản trước chỉ chạy bộ cũ, nên thước chính thức đo trên
  // đúng dữ liệu người ta đã fit — luôn cho điểm đẹp. Đo 2026-08-09 cho thấy khác biệt là
  // THẬT: ca âm gần nhất của bộ cũ ở 0,844 còn bộ giữ riêng tụt tới 0,806, và chính con số đó
  // làm "tách hoàn hảo" của cổng bốc hơi.
  let negative: NegativeResult | undefined;
  const negAll = [...NEGATIVE_CORPUS, ...NEGATIVE_HOLDOUT];
  if (!opts.skipNegative && negAll.length) {
    let empty = 0, hits = 0, score = 0;
    for (const nq of negAll) {
      const r = await searchHybrid(nq.q, { limit: topN, all: true, rerank: false });
      if (!r.length) empty++;
      hits += r.length;
      score += r[0]?.score ?? 0;
    }
    negative = {
      n: negAll.length,
      empty,
      hitsAvg: hits / negAll.length,
      topScoreAvg: score / negAll.length,
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
    // Dòng TƯƠNG ĐƯƠNG in ngay dưới dòng nghiêm, cùng cột — để không ai đọc một thước rồi
    // tưởng đó là toàn bộ sự thật. Chênh lệch giữa hai dòng CHÍNH LÀ phần thước nghiêm phạt
    // oan vì kho có nhiều bản gần trùng (đo 2026-08-09: 4/6 kẻ chiếm chỗ là bản gần trùng).
    if (l.equiv) {
      const e = l.equiv;
      out.push(
        `  ${"  ↳ tương đương".padEnd(16)} ${pct(e.hit1).padStart(9)} ${pct(e.hit3).padStart(6)} ${pct(e.hit10).padStart(6)} ${pct(e.hit40).padStart(6)} ${e.mrr.toFixed(3).padStart(7)}`,
      );
    }
  }
  out.push(
    `  (dòng "tương đương": hit khi tin trả về LÀ đáp án HOẶC gần trùng nội dung ≥ ${EQUIV_SIM} —` +
      ` quy tắc chuẩn ngành "bất kỳ đoạn nào chứa đáp án". Lớp không có vector rơi về thước nghiêm.)`,
  );
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
    // Ghi chú theo CHÍNH SÁCH chỉ mục đang hiệu lực (migration v21), không phải theo trạng
    // thái đo được của từng kho — kho có thể còn tin chưa nhúng xong.
    // ⚠ Dòng `tool_use: "CHỈ FTS word"` cũ đã SAI suốt một thời gian: đo 2026-08-12 thấy
    // 77,6% tin tool_use vẫn nằm trong trigram (do `salvage` chạy 'rebuild'), tức lớp đó
    // vốn đã có hai luồng trong khi bảng này vẫn in "CHỈ" — và chẩn đoán của mấy phiên sau
    // đều dựa vào dòng chữ đó. Sửa nhãn ở đây thì nhớ sửa cả `plan/17 §3c`.
    const NOTE: Record<string, string> = {
      prose: "word · trigram · vector",
      tool_use: "word · trigram (v21) · vector nếu đã nhúng",
      tool_result: "word · vector — KHÔNG trigram (v21 giữ loại)",
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
