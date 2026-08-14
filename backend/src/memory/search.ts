// Recall over the global memory. Two FTS5 streams — word (unicode61) + trigram
// (substring / Vietnamese) — fused with Reciprocal Rank Fusion (idea from
// Context Mode / agentmemory). Returns lightweight hits (progressive
// disclosure: id + snippet first, full text on demand via getMessage). Default
// scope = the current project; pass all=true for cross-project recall.

import { type MemoryDB, currentMemoryDb, openMemory } from "./db.js";
import { vectorProbe, vectorsByRowid } from "./vectors.js";
import { rerank } from "./rerank.js";
import { blendRecency, recencyEnabled } from "./recency.js";
import { getHybridSetting, getRerankSetting, getScopeExclude, type ScopeLane } from "../config/settings.js";
import { projectKey } from "../core/config.js";
import { isExcluded } from "./scope.js";

export interface SearchHit {
  id: number;
  sessionId: string;
  source: string;
  origin: string;
  project: string;
  role: string;
  timestamp: string | null;
  score: number;
  snippet: string;
  /** Gộp near-duplicate: số bản gần trùng đã xếp sau dòng này (plan 17 §1.2). Khuyết = 0. */
  similar?: number;
  /**
   * ID của các bản gần trùng đã gom vào dòng này (tối đa `SIMILAR_IDS_CAP`).
   *
   * Vì sao trả ID chứ chỉ đếm số: có số mà không có ID thì agent muốn xem bản khác phải TÌM
   * LẠI toàn bộ với `collapse:false` — một lượt search nữa cho một việc đáng lẽ là một lượt
   * `memory_show`. Có ID thì mở đúng cái cần, không cái nào bị che (điều 8: hiện lớp mỏng
   * trước, đào sâu khi cần — KHÔNG phải ẩn bớt).
   */
  similarIds?: number[];
}

export interface SearchOptions {
  dbPath?: string;
  /** Tắt việc hạ điểm tin tool (mặc định tin tool bị hạ trong recall thường). */
  includeTools?: boolean;
  /** Restrict to this project root (normalized match). Ignored if `all`. */
  project?: string;
  /** Cross-project: search the whole memory. */
  all?: boolean;
  /** Max hits returned. */
  limit?: number;
  /** Max hits per session (diversification — stops one chat flooding recall). */
  perSession?: number;
  /** Cross-encoder rerank override: true/false force on/off, undefined = setting. */
  rerank?: boolean;
  /** Filter: only hits from this source/agent (e.g. 'codex'). */
  source?: string;
  /** Filter: only this origin bucket ('local' agent transcripts | 'web' chat). */
  origin?: string;
  /** Filter: only this message role — 'user' (người thật gõ) · 'assistant' · 'tool'. */
  role?: string;
  /** Filter: only messages at/after this epoch-ms timestamp. */
  sinceMs?: number;
  /** Filter: only messages that carry at least one attachment (chip "Có ảnh"). */
  hasAttachment?: boolean;
  /** Recency blend override: true/false force on/off, undefined = default (on). */
  recency?: boolean;
  /** Gộp near-duplicate: true/false ép bật/tắt, undefined = mặc định (TẮT — trượt cổng recall). */
  collapse?: boolean;
  /** Cổng "không biết": true/false ép bật/tắt, undefined = mặc định (TẮT — còn nợ đo lường). */
  abstain?: boolean;
  /** Trộn cosine vào thứ hạng (rerank rẻ): true/false ép, undefined = mặc định (BẬT). */
  vecMix?: boolean;
  /** Provenance lanes to EXCLUDE from results; undefined = the saved scope list. */
  excludeLanes?: ScopeLane[];
}

/** Default hits a recall returns (progressive disclosure: snippet first, full
 *  text on demand). The UI derives the per-recall token budget from this. */
export const DEFAULT_SEARCH_LIMIT = 12;

const RRF_K = 60;
// Bốn trọng số này ĐO ĐƯỢC nên phải chỉnh được từ ngoài (cùng lý lẽ như POOL bên dưới): không
// thì mỗi lần thử một cấu hình lại phải sửa code + build, và không ai sweep nổi.
//
// ⚠ TỔNG trọng số lexical phải cân với vector — bài học đo 2026-08-08. Khi ba luồng FTS mới
// sống hẳn (bản vá `17fe270`), tổng lexical thành 1.0+0.6+0.6 = 2.2 đè vector 1.0, tức semantic
// bị áp phiếu 2,2:1. Đo trên 34 câu prose: vector-thuần @10 59% · @3 50%, còn fused chỉ @10 53%
// · @3 41% — có 3 câu vector xếp hạng 1 mà fusion đẩy ra ngoài top-10. Trước bản vá luồng `tri`
// trả 0 kết quả cho 56/56 câu nên FTS gần như không có phiếu và hybrid ≈ vector-thuần; bản vá
// làm chúng sống lại mà KHÔNG cân lại trọng số ⇒ prose tụt.
//
// CÂN LẠI 2026-08-08 (hai vòng sweep, 56 câu có nhãn, kho 768 — cổng điều 12):
//   trước  word 1.0 · tri 0.6 · or 0.6 · vec 1.0 → @1 20% @3 25% @10 32% @40 43% MRR 0.235 · prose@10 53%
//   sau    word 1.0 · tri 0.3 · or 0.3 · vec 1.6 → @1 16% @3 30% @10 39% @40 45% MRR 0.255 · prose@10 62%
// Net thắng: @3 +5 · @10 +7 · @40 +2 · MRR +8,5% · prose +9 điểm (đúng lại mốc 62% từng đo trước
// bản vá) · tool_result@10 0% → 13%. ĐÁNH ĐỔI ĐÃ BIẾT: @1 tụt 4 điểm (2 câu/56) — nâng luồng AND
// lên 1.5 rồi 2.0 đều KHÔNG lấy lại được, nên đó là giá của việc bỏ phiếu-lexical-áp-đảo, không
// phải lỗi cấu hình. Chạy lại cùng cấu hình cho ra y hệt ⇒ kho trôi không phải nhiễu.
// `tool_use` giữ 0% ở MỌI cấu hình — lớp đó không có vector lẫn trigram, trọng số không cứu được.
const W_WORD = Number(process.env.ZEMORY_W_WORD) || 1.0;
const W_TRI = Number(process.env.ZEMORY_W_TRI) || 0.3;
/** Luồng "khớp BẤT KỲ từ nào" — lưới vét cho truy vấn dài. Trọng số THẤP hơn AND có chủ ý:
 *  nó rộng nên dùng để pool không rỗng, không phải để quyết thứ hạng đầu. */
const W_OR = Number(process.env.ZEMORY_W_OR) || 0.3;
const W_VEC = Number(process.env.ZEMORY_W_VEC) || 1.6; // semantic stream weight (hybrid)
// Số ứng viên kéo về TỪ MỖI LUỒNG trước khi gộp RRF. Đây là **TRẦN** của cả hệ: thứ không
// lọt vào đây thì không lớp xếp nào cứu được. Đo 2026-08-03 trên corpus 34 câu có nhãn: với
// POOL=60, hybrid đạt recall@40 = 56% ⇒ **44% số câu đáp án không hề có trong pool**. Chuẩn
// ngành khuyên lớp lấy nên kéo 50–1.000 ứng viên và tối ưu RECALL, còn rerank lo PRECISION.
// Để chỉnh được từ ngoài vì đây là thứ ĐO ĐƯỢC — xem `evals/recallbench.ts`.
const POOL = Number(process.env.ZEMORY_POOL) || 60;
// Hai hằng số này ĐO ĐƯỢC nên phải chỉnh được từ ngoài — không thì mỗi lần thử một cấu hình
// lại phải sửa mã + build lại, và người sau muốn kiểm chứng số của tôi cũng không làm nổi.
// Bối cảnh (bench 34 câu có nhãn, 2026-08-03): bật rerank làm recall@10 TỤT 41% → 26% và MRR
// 0,238 → 0,129. Giả thuyết "mô hình không đọc được tiếng Việt" đã bị BÁC bằng phép thử phân
// biệt (`bge-reranker-base` tách đúng/sai chủ đề rất rõ). Hai nghi can còn lại chính là đây:
//   · CHARS=2000 cắt cụt tin dài ⇒ cross-encoder không thấy đoạn phân biệt, trong khi vector
//     đã nhúng cả tin;
//   · POOL=40 cho nó quá nhiều cơ hội xáo lại thứ hạng vốn đã tốt của hybrid — mà 40 ứng viên
//     ở kho này đều CÙNG chủ đề, tức không có cái nào "lạc đề" để nó loại.
const RERANK_POOL = Number(process.env.ZEMORY_RERANK_POOL) || 40; // top RRF candidates rescored by the cross-encoder
const RERANK_CHARS = Number(process.env.ZEMORY_RERANK_CHARS) || 2000; // doc chars fed to the reranker

/**
 * Vai THẬT của một message, cho bộ lọc `role`.
 *
 * API của Anthropic trả `tool_result` TRONG LƯỢT `user`, nên transcript — và cột
 * `messages.role` dẫn xuất từ nó — ghi 'user' cho cả output của máy. Trung thực với nguồn,
 * nhưng lọc `role='user'` thì kéo về toàn rác: đo 2026-07-26 trên DB thật, **44.102/69.324
 * tin role='user' (63,6%) là `tool_result`**, chỉ 36,4% là người gõ. `tool_name` ở role=user
 * = 0 dòng nên không phân biệt được bằng metadata; mọi tin tool_result đều BẮT ĐẦU bằng
 * marker (44.102 = 44.102) ⇒ luật dưới đây tất định, không đoán.
 *
 * Nhờ vậy `role='user'` = **người thật hỏi gì**, còn `role='tool'` = output công cụ.
 * (`digest.ts` đã loại đúng từ trước bằng `NON_NL`, không đụng tới.)
 */
const TOOL_RESULT_PREFIX = /^\s*\[tool[_ ]result/i;
function roleMatches(role: string, content: string, want: string): boolean {
  const isToolOut = role === "user" && TOOL_RESULT_PREFIX.test(content ?? "");
  if (want === "tool") return isToolOut;
  if (want === "user") return role === "user" && !isToolOut;
  return role === want;
}

// MỘT bản so-path cho cả hệ (F4, 2026-08-02) — bản cũ ở đây không cắt gạch cuối.
const norm = projectKey;

/** Tokenize + sanitize a user query for safe FTS5 MATCH (quote each term). */
function ftsTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/["()*:^]/g, "").trim())
    .filter(Boolean);
}

interface Ranked {
  rowid: number;
  rank: number;
}

function streamRanks(db: MemoryDB, table: string, match: string, project?: string): Ranked[] {
  try {
    const rows = project
      ? (db
          .prepare(
            `SELECT f.rowid FROM ${table} f
             JOIN messages m ON m.id=f.rowid
             JOIN sessions s ON s.id=m.session_id
             WHERE ${table} MATCH @match
               AND lower(replace(s.project_root, '\\', '/')) = lower(replace(@project, '\\', '/'))
             ORDER BY bm25(${table}) LIMIT @pool`,
          )
          .all({ match, project, pool: POOL }) as { rowid: number }[])
      : (db
          .prepare(`SELECT rowid FROM ${table} WHERE ${table} MATCH ? ORDER BY bm25(${table}) LIMIT ?`)
          .all(match, POOL) as { rowid: number }[]);
    return rows.map((r, i) => ({ rowid: r.rowid, rank: i }));
  } catch {
    return []; // malformed MATCH (rare after sanitize) → empty stream
  }
}

interface WeightedStream {
  ranks: Ranked[];
  w: number;
}

/**
 * BA luồng FTS cho một truy vấn, gộp bằng RRF.
 *
 * Vì sao ba chứ không phải hai (đo 2026-08-08 trên corpus 56 câu có nhãn, kho 768d):
 * bản cũ chỉ có `word` (AND ngầm) + `tri` (khớp NGUYÊN CỤM cả câu). Cả hai đều đòi hỏi quá
 * chặt với **câu hỏi dài tự nhiên** — thứ agent thật sự gửi vào `memory_search`:
 *   · `tri` khớp nguyên cụm ⇒ **56/56 câu trả 0 kết quả**. Nửa sức FTS chết hẳn, và vì
 *     fail-open nên KHÔNG có gì báo — cổng vẫn xanh, chỉ recall âm thầm mất.
 *   · `word` AND ⇒ trung bình còn **5,4 ứng viên** trên cả kho 215k tin; `prose` recall@10
 *     chỉ **3%**. Pool bị cắt sạch TRƯỚC khi có gì để xếp hạng.
 * Đây là lời giải cho báo cáo "search trả rác": hỏi câu dài thì nhận về một hai kết quả
 * gần như ngẫu nhiên. Không phải lỗi model (đã đo: đồng nghĩa VI 0,824 vs khác nghĩa 0,602),
 * cũng không phải số chiều.
 *
 * Thêm `word` OR làm LƯỚI VÉT, và cho `tri` khớp theo TỪ thay vì nguyên cụm. Kết quả đo:
 *   câu DÀI  — prose @10 **3% → 38%** · tool_use 0% → 14% · tool_result 0% → 13%
 *   câu NGẮN — không thua chỗ nào: tool_use 86%@1 giữ nguyên, tool_result 75% → **88%**@1,
 *              prose @10 76% → 88%
 *
 * ⚠ GIỮ lane AND, đừng bỏ. Bảng câu-dài xét riêng thì bỏ AND còn hơn (@10 41% so với 38%),
 * nhưng đo trên truy vấn NGẮN 2–3 từ khoá — lối dùng phổ biến nhất — thì bỏ AND kéo
 * `tool_result` @1 **75% → 63%**. Đổi 3 điểm ở nhóm yếu lấy 12 điểm ở nhóm mạnh là lỗ.
 * Trọng số OR cố ý THẤP hơn AND: nó rộng nên là lưới vét, không phải luồng chính.
 */
function ftsStreams(db: MemoryDB, terms: string[], scopedProject?: string): WeightedStream[] {
  const quoted = terms.map((t) => `"${t}"`);
  const wordAnd = quoted.join(" "); // AND ngầm — chính xác cao khi truy vấn NGẮN
  const anyTerm = quoted.join(" OR "); // lưới vét — cứu truy vấn DÀI
  const streams: WeightedStream[] = [
    { ranks: streamRanks(db, "messages_fts", wordAnd, scopedProject), w: W_WORD },
    { ranks: streamRanks(db, "messages_fts_tri", anyTerm, scopedProject), w: W_TRI },
    { ranks: streamRanks(db, "messages_fts", anyTerm, scopedProject), w: W_OR },
  ];
  if (rareEnabled()) {
    // LUỒNG TỪ-HIẾM: chỉ giữ vài từ IDF cao NHẤT của chính câu hỏi.
    //
    // Khác RM3 ở chỗ then chốt: RM3 THÊM từ mới (và đo được là thêm nhiễu), còn luồng này
    // BỎ BỚT — nó hỏi lại kho bằng đúng phần mang thông tin của câu người dùng đã gõ.
    // Cơ sở: BM25 bão hoà kém với truy vấn dài; câu 15–25 từ nhét vào hàng chục từ thông
    // dụng làm loãng trọng số của `crypto_pipeline_binance`·`8756`·`suno_dl.py`. Dò tay
    // 2026-08-09: hỏi bằng 3 từ hiếm thì đáp án nằm hạng 6–24, còn cả câu thì KHÔNG vào pool.
    const rare = rareTerms(db, terms);
    if (rare.length) {
      const match = rare.map((t) => `"${t}"`).join(" OR ");
      streams.push({ ranks: streamRanks(db, "messages_fts", match, scopedProject), w: W_RARE });
    }
  }
  if (rm3Enabled()) {
    const expanded = rm3Expand(db, terms, scopedProject);
    if (expanded.length) {
      const match = expanded.map((t) => `"${t}"`).join(" OR ");
      streams.push({ ranks: streamRanks(db, "messages_fts", match, scopedProject), w: W_RM3 });
    }
  }
  return streams;
}

// ─────────────────────────── RM3 — pseudo-relevance feedback ───────────────────────────
//
// VẤN ĐỀ ĐO ĐƯỢC (2026-08-09): nghẽn recall của kho này KHÔNG phải kích thước pool — nới
// `POOL` 60 → 200 → 500 hồi 05/08 không đổi MỘT con số nào. Nghẽn nằm ở chỗ ứng viên được
// SINH RA: đáp án của lớp `tool_use` chỉ vào pool 1/14 dù dò thẳng chỉ mục FTS bằng 3 từ
// HIẾM thì chúng nằm ở hạng 6–24. Khác biệt duy nhất là cách dựng truy vấn — câu hỏi tự
// nhiên dài 15–25 từ, và BM25 bão hoà kém với truy vấn dài: từ đặc trưng
// (`crypto_pipeline_binance`, `8756`, `suno_dl.py`) bị pha loãng giữa hàng chục từ thông dụng.
//
// RM3 là lời giải kinh điển và hợp điều 6 bậc ① (script tất định làm được thì script làm):
//   ① chạy truy vấn gốc → lấy top-k tài liệu phản hồi
//   ② rút từ có tf cao trong k tài liệu đó, cân theo IDF của cả kho
//   ③ thêm các từ đó thành MỘT luồng RRF nữa (không thay truy vấn gốc)
//
// Vì sao THÊM LUỒNG chứ không viết lại truy vấn: cùng doctrine đã thắng ở `vecMix` — *trộn*
// ăn hơn *thay hẳn*. Truy vấn gốc giữ nguyên trọng số của nó; RM3 chỉ góp thêm ứng viên.
// Hỏng/rỗng ⇒ trả mảng rỗng ⇒ không có luồng thứ tư, hành vi y như cũ (điều 9 fail-open).
//
// Đây là bản KHÔNG-CẦN-LLM của thứ đã chứng minh thắng ở kho này: đa-truy-vấn (agent gửi 3
// lối nói) cho `prose@40` 68% → 94%. RM3 lấy cùng lợi ích đó cho NGƯỜI dùng trong app, nơi
// không có agent nào viết biến thể hộ.
const RM3_FB = Number(process.env.ZEMORY_RM3_FB) || 10; // số tài liệu phản hồi
const RM3_TERMS = Number(process.env.ZEMORY_RM3_TERMS) || 8; // số từ giãn thêm
const RM3_CAND = Number(process.env.ZEMORY_RM3_CAND) || 40; // trần ứng viên đem đi tra df
const RM3_MAX_DF = Number(process.env.ZEMORY_RM3_MAX_DF) || 0.05; // bỏ từ có mặt ở >5% kho
const RM3_MIN_DOCS = Number(process.env.ZEMORY_RM3_MIN_DOCS) || 2; // phải ≥2 tài liệu cùng xác nhận
const RM3_DOC_CHARS = Number(process.env.ZEMORY_RM3_DOC_CHARS) || 2000; // cắt đuôi dump
const W_RM3 = Number(process.env.ZEMORY_W_RM3) || 0.35;

const RARE_K = Number(process.env.ZEMORY_RARE_K) || 3; // giữ mấy từ hiếm nhất
const W_RARE = Number(process.env.ZEMORY_W_RARE) || 0.45;

/** Mặc định TẮT cho tới khi qua cổng (điều 12). Bật: `ZEMORY_RARE=1`. */
export function rareEnabled(force?: boolean): boolean {
  if (force !== undefined) return force;
  const v = process.env.ZEMORY_RARE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

/**
 * `RARE_K` từ hiếm nhất của truy vấn (df thấp nhất), bỏ từ quá phổ biến.
 * Truy vấn vốn đã ngắn (≤ RARE_K từ) ⇒ trả rỗng: luồng này sẽ trùng lane OR, thêm chỉ tốn.
 */
function rareTerms(db: MemoryDB, terms: string[]): string[] {
  if (terms.length <= RARE_K) return [];
  try {
    const scored = terms.map((t) => ({ t, d: docFreq(db, t) })).filter((x) => x.d > 0);
    scored.sort((a, b) => a.d - b.d);
    return scored.slice(0, RARE_K).map((x) => x.t);
  } catch {
    return [];
  }
}

/** Mặc định TẮT cho tới khi qua cổng corpus có nhãn (điều 12). Bật: `ZEMORY_RM3=1`. */
export function rm3Enabled(force?: boolean): boolean {
  if (force !== undefined) return force;
  const v = process.env.ZEMORY_RM3?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

/** df của một term, cache trong tiến trình — đo 2026-08-09: ~3 ms/từ chưa cache. */
const dfCache = new Map<string, number>();
function docFreq(db: MemoryDB, term: string): number {
  const hit = dfCache.get(term);
  if (hit !== undefined) return hit;
  let n: number;
  try {
    n = (db.prepare("SELECT count(*) c FROM messages_fts WHERE messages_fts MATCH ?").get(`"${term}"`) as { c: number })
      .c;
  } catch {
    n = 0; // term hỏng sau sanitize ⇒ coi như không tra được, sẽ bị loại
  }
  if (dfCache.size > 5000) dfCache.clear(); // trần thô, tránh phình theo phiên dài
  dfCache.set(term, n);
  return n;
}

/** Tách từ cho phía TÀI LIỆU — rộng hơn `ftsTerms` vì phải cắt cả dấu câu trong văn bản thật. */
function docTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}_.\-/]+/u)
    .map((t) => t.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter((t) => t.length >= 3 && t.length <= 40);
}

function rm3Expand(db: MemoryDB, terms: string[], scopedProject?: string): string[] {
  try {
    const seedMatch = terms.map((t) => `"${t}"`).join(" OR ");
    const seed = streamRanks(db, "messages_fts", seedMatch, scopedProject).slice(0, RM3_FB);
    if (seed.length < 3) return []; // quá ít phản hồi ⇒ giãn từ chỉ thêm nhiễu
    const ids = seed.map((r) => r.rowid);
    const rows = db
      .prepare(`SELECT content FROM messages WHERE id IN (${ids.map(() => "?").join(",")})`)
      .all(...ids) as { content: string | null }[];

    // ĐẾM THEO SỐ TÀI LIỆU CHỨA TỪ, KHÔNG cộng dồn tần suất thô.
    //
    // Bản đầu của chính hàm này cộng tf qua mọi tài liệu và HỎNG ngay lần đo đầu: một tin
    // tool dump dài vài chục KB đóng góp hàng trăm token nên chiếm trọn danh sách giãn —
    // đo được nó nhả ra `os.listdir`·`qubit`·`app_name`, tức từ vựng của ĐÚNG MỘT tài liệu
    // lạc đề. Đây là "query drift" kinh điển: RM3 khuếch đại chất lượng của lượt lấy đầu,
    // nên lượt đầu lẫn rác thì nó nhân rác lên.
    //
    // Cân theo SỰ HIỆN DIỆN (có mặt ở mấy trong k tài liệu) làm hai việc cùng lúc: chặn một
    // tài liệu dài thống trị, và đòi từ phải được NHIỀU tài liệu cùng xác nhận mới đáng tin.
    // Kèm cắt nội dung mỗi tài liệu ở `RM3_DOC_CHARS` — phần đuôi của một dump không mang
    // thêm tín hiệu chủ đề, chỉ mang thêm token.
    const already = new Set(terms);
    const docCount = new Map<string, number>();
    for (const r of rows) {
      const seen = new Set(docTokens((r.content ?? "").slice(0, RM3_DOC_CHARS)));
      for (const t of seen) {
        if (already.has(t)) continue;
        docCount.set(t, (docCount.get(t) ?? 0) + 1);
      }
    }
    const tf = new Map([...docCount].filter(([, n]) => n >= RM3_MIN_DOCS));
    if (!tf.size) return [];

    const total = (db.prepare("SELECT count(*) c FROM messages").get() as { c: number }).c || 1;
    const maxDf = total * RM3_MAX_DF;
    // Cắt theo tf TRƯỚC rồi mới tra df — df là phần tốn tiền, đừng tra cho cả nghìn token.
    const cand = [...tf.entries()].sort((a, b) => b[1] - a[1]).slice(0, RM3_CAND);
    const scored: { t: string; s: number }[] = [];
    for (const [t, f] of cand) {
      const d = docFreq(db, t);
      if (d <= 0 || d > maxDf) continue; // quá phổ biến ⇒ đúng thứ đang làm loãng truy vấn
      scored.push({ t, s: f * Math.log(total / d) });
    }
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, RM3_TERMS).map((x) => x.t);
  } catch {
    return []; // fail-open: không có luồng RM3 thì hệ chạy y như trước
  }
}

/** Reciprocal Rank Fusion across weighted streams → rowids by descending score. */
function rrf(streams: WeightedStream[]): { rowid: number; s: number }[] {
  const score = new Map<number, number>();
  for (const { ranks, w } of streams) {
    for (const r of ranks) score.set(r.rowid, (score.get(r.rowid) ?? 0) + w / (RRF_K + r.rank));
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([rowid, s]) => ({ rowid, s }));
}

/** Batch-fetch message timestamps for candidate rowids (for the recency blend). */
function timestampsFor(db: MemoryDB, rowids: number[]): Map<number, string | null> {
  const map = new Map<number, string | null>();
  const CHUNK = 400;
  for (let i = 0; i < rowids.length; i += CHUNK) {
    const chunk = rowids.slice(i, i + CHUNK);
    const rows = db
      .prepare(`SELECT id, timestamp FROM messages WHERE id IN (${chunk.map(() => "?").join(",")})`)
      .all(...chunk) as { id: number; timestamp: string | null }[];
    for (const r of rows) map.set(r.id, r.timestamp);
  }
  return map;
}

/**
 * Blend recency into an already relevance-ranked candidate list so the freshest
 * relevant hit wins (agents stop pulling stale memory). Applied AFTER RRF/rerank
 * so it modulates the final relevance order rather than replacing it; fail-open
 * (returns the input unchanged when disabled).
 */
function rankWithRecency(
  db: MemoryDB,
  ranked: { rowid: number; s: number }[],
  opts: SearchOptions,
): { rowid: number; s: number }[] {
  if (!recencyEnabled(opts.recency) || ranked.length < 2) return ranked;
  const ts = timestampsFor(
    db,
    ranked.map((r) => r.rowid),
  );
  return blendRecency(ranked, (r) => ts.get(r.rowid) ?? null, true);
}

/**
 * HẠ ĐIỂM đầu ra của tool trong recall thường — chống "recall blindness".
 *
 * Vấn đề đo được 2026-07-27: 20 kết quả đầu cho một truy vấn thật có **8 là tin TOOL**
 * (40% ngân sách recall đổ vào nội dung máy sinh — dump file, kết quả lệnh). Chúng khớp
 * từ khoá rất tốt vì dài và đầy mã định danh, nên đẩy câu trả lời thật của con người
 * xuống dưới. (Hermes xử cùng vấn đề bằng cách ẩn hẳn phiên `subagent`/`tool` khỏi search
 * mặc định; ở đây chọn cách nhẹ hơn — xem dưới.)
 *
 * HẠ ĐIỂM, KHÔNG LOẠI BỎ — có chủ ý:
 *   · Loại hẳn thì mất luôn trường hợp câu trả lời CHỈ nằm trong tool output.
 *   · Đã đo trường hợp xấu nhất (truy vấn thông báo lỗi — `ERR_HTTP_HEADERS_SENT`,
 *     `BFCArena`, `ENOENT`…): văn xuôi vẫn chiếm 8–10/10 vì agent có bàn về lỗi bằng lời.
 *     Nên rủi ro mất thông tin là thấp, còn khi tool là nguồn DUY NHẤT thì nó vẫn ra.
 *   · Hỏi thẳng `--role tool` thì KHÔNG phạt gì cả.
 *
 * Đặt SAU RRF/rerank, cùng tầng với recency: nó điều biến thứ tự cuối chứ không tranh
 * chấp với phép xếp hạng theo thứ tự của RRF.
 */
// HAI MỨC, chọn theo LANE — không phải một hằng số cho cả hệ (đo 2026-08-09, 68 nhãn):
//
//   TOOL_DEMOTE   FTS-thuần MRR   hybrid MRR
//   0,3           **0,204**       0,282
//   0,5           0,105           0,298
//   0,7           0,121           **0,319**
//
// FTS-thuần ở 0,3 hơn 0,7 tới **69%**; hybrid thì ngược lại. Không mức nào tốt cho cả hai, và
// lý do rất vật lý: trong FTS-thuần, tin tool khớp từ khoá RẤT mạnh (dài, đầy mã định danh —
// đúng phát hiện gốc 2026-07-27: 8/20 kết quả đầu là tin tool) và **không có lane vector để
// bù**; trong hybrid thì vector bù được, nên phạt nhẹ đi lại lợi. Tiêu chí tách vì thế là
// "có tín hiệu semantic tham gia hay không", KHÔNG phải "hàm nào được gọi" — vector fail-open
// trả rỗng thì lane đó THỰC SỰ là FTS-thuần và phải dùng mức mạnh.
//
// 🔴 Bài học cách đo: bản vá 0,3→0,7 đầu tiên quét CHỈ bằng `searchHybrid`, nên không thấy
// lane FTS-thuần tụt MRR 0,204 → 0,121 — mà đó là **đường nhanh của app** (`search()`) và
// đường fail-open. Đo một cấu hình bằng bề mặt HẸP HƠN bề mặt sẽ chịu ảnh hưởng là cách làm
// hỏng thứ không ai đang nhìn.
const TOOL_DEMOTE_FTS = Number(process.env.ZEMORY_TOOL_DEMOTE_FTS) || 0.3;
const TOOL_DEMOTE_HYBRID = Number(process.env.ZEMORY_TOOL_DEMOTE) || 0.7;

function demoteToolOutput(
  db: MemoryDB,
  ranked: { rowid: number; s: number }[],
  opts: SearchOptions,
  /** Lane vector CÓ THẬT SỰ tham gia không (không phải "có gọi hybrid không"). */
  hasVector = false,
): { rowid: number; s: number }[] {
  if (opts.role === "tool" || opts.includeTools) return ranked; // hỏi thẳng tool ⇒ không phạt
  if (ranked.length < 2) return ranked;
  const factor = hasVector ? TOOL_DEMOTE_HYBRID : TOOL_DEMOTE_FTS;
  const ids = ranked.map((r) => r.rowid);
  const rows = db
    .prepare(
      `SELECT id, role, substr(COALESCE(content,''), 1, 16) AS head, tool_name
       FROM messages WHERE id IN (${ids.map(() => "?").join(",")})`,
    )
    .all(...ids) as { id: number; role: string; head: string; tool_name: string | null }[];
  const isTool = new Map<number, boolean>();
  for (const r of rows) {
    // Cùng dấu hiệu tất định mà roleMatches() dùng — một định nghĩa "tin tool" duy nhất.
    isTool.set(r.id, Boolean(r.tool_name) || (r.role === "user" && TOOL_RESULT_PREFIX.test(r.head)));
  }
  return ranked
    .map((r) => (isTool.get(r.rowid) ? { rowid: r.rowid, s: r.s * factor } : r))
    .sort((a, b) => b.s - a.s);
}

// ── GỘP NEAR-DUPLICATE (plan 17 §1.2) — OPT-IN, TRƯỢT CỔNG ───────────────────
// Bệnh nhắm tới (đo 2026-08-08): 16/34 ca trượt lớp `prose` là vì một tin MỚI HƠN cùng chủ
// đề chiếm chỗ tin có nhãn — kho chat bàn đi bàn lại một việc hàng chục lần nên top-N đầy
// bản gần trùng.
//
// 🔴 NHƯNG ĐO TRÊN BỀ MẶT THẬT THÌ NÓ TRƯỢT (điều 12 ⇒ KHÔNG bật mặc định):
//     1 truy vấn: MRR 0,255 → **0,223** · `@10` 39% → **32%**
//     3 truy vấn: `@10` 45% → **39%** · `@40` 64% → **41%**
// Phép thử ngoại tuyến trước đó hứa MRR +29% — **con số đó SAI vì thước sai**: nó chấm theo
// *"cụm chứa đáp án nằm ở vị trí mấy"*, tức cho điểm dù thứ TRẢ VỀ là tin khác. Bản cài thật
// trả về ĐẠI DIỆN, nên đáp án là bản-trùng thì bị đẩy khỏi top-10. Đã thử cả hai lối (xoá
// bản trùng · hạ chúng xuống sau) — hạ tốt hơn xoá ở `@40` nhưng cả hai đều không cứu `@10`.
//
// Vì sao GIỮ code lại thay vì xoá: giá trị thật của gộp là *"trả về một tin TƯƠNG ĐƯƠNG cũng
// được"* — mà thước hiện tại đòi ĐÚNG MỘT uuid nên nó không thể ghi nhận điều đó (đúng món nợ
// `plan 17 §4.3` nhãn đa-uuid). Chưa sửa thước thì KHÔNG được tuyên nó thắng; để opt-in cho
// bề mặt NGƯỜI đọc (danh sách gọn hơn) và để đo lại khi có nhãn đa-uuid.
const COLLAPSE_SIM = Number(process.env.ZEMORY_COLLAPSE_SIM) || 0.85;
// Lấy dư rồi mới gộp: gộp SAU khi đã cắt còn `limit` thì mỗi bản trùng vẫn chiếm một suất
// trong `limit`. ⚠ Lấy dư cũng làm mất phần "sạch hơn": suất trống được LẤP BẰNG RÁC MỚI, nên
// ca âm vẫn 40 kết quả/câu (phép thử cũ tưởng 40 → 22 vì nó không lấp lại).
const COLLAPSE_OVERFETCH = 4;
/** Trần số ID bản-trùng trả kèm mỗi dòng: đủ để mở, không phá tinh thần "lớp mỏng trước". */
const SIMILAR_IDS_CAP = 5;

/**
 * Gộp near-duplicate — **MẶC ĐỊNH BẬT (user chốt 2026-08-09)**, sau khi thước TƯƠNG ĐƯƠNG
 * đảo phán quyết cũ.
 *
 * 🔄 **Supersede kết luận "TRƯỢT CỔNG, mặc định TẮT" của chính khối này.** Hai thước nói NGƯỢC
 * nhau về cùng thay đổi, và cả hai đều đúng vì đo hai việc khác:
 *   · thước NGHIÊM (đúng 1 uuid): gộp THUA — MRR 0,319 → 0,288
 *   · thước TƯƠNG ĐƯƠNG (gần trùng cũng tính): gộp THẮNG — MRR 0,407 → **0,413**,
 *     `@10` 49% → **54%**, `@40` 60% → **63%**; `prose@40` 76% → **82%**,
 *     `tool_result@10` 63% → **75%**
 * Thước nghiêm phạt gộp nặng nhất trong mọi thay đổi, vì bản chất của gộp LÀ gom bản trùng nên
 * đại diện cụm thường không phải đúng uuid được đánh dấu — dù nội dung y hệt. Với mục đích thật
 * của zemory (agent tra cứu để BIẾT VIỆC, không phải hệ trích dẫn một uuid) thì tương đương là
 * thước cầm lái. `ZEMORY_COLLAPSE=0` để tắt.
 *
 * KHÔNG có gì bị ẩn: mỗi đại diện mang `similar` (số bản đã gom) + `similarIds` (mở được ngay
 * bằng `memory_show`). Agent nào cần thấy từng bản riêng thì gọi lại với `collapse:false`.
 */
export function collapseEnabled(force?: boolean): boolean {
  if (force !== undefined) return force;
  const v = process.env.ZEMORY_COLLAPSE?.trim().toLowerCase();
  return !(v === "0" || v === "false" || v === "off");
}

// ── CỔNG "KHÔNG BIẾT" (abstention — plan 17 §1.3) ────────────────────────────
// Bệnh đo được 2026-08-08: **8/8** câu hỏi mà kho CHẮC CHẮN không có đáp án vẫn trả về ~40
// kết quả, và ĐIỂM ĐẦU gần bằng ca có đáp án thật ⇒ người đọc không phân biệt được thật với
// rác. Đây đúng triệu chứng user báo ("search trả kết quả lạc repo, không liên quan").
//
// Tín hiệu tách được rất sạch — ca dương khoảng cách cosine top-1 cao nhất **0,812**, ca âm
// thấp nhất **0,844**: θ=0,82 chặn 8/8 ca âm, giết oan **0/56**, và trên pipeline đa-truy-vấn
// **mất 0 kết quả đang ở top-10**.
// θ và M đo 2026-08-09 trên 68 nhãn dương + 8 ca âm cũ + 10 ca âm GIỮ RIÊNG (chưa từng dùng
// để chọn tham số). Cấu hình chốt: chặn 5/8 ca âm cũ · 4/10 giữ riêng · **giết oan 0/68**.
const ABSTAIN_DIST = Number(process.env.ZEMORY_ABSTAIN_DIST) || 0.86;
// MARGIN = khoảng cách của hit thứ 10 trừ hit đầu, trên chính pool vector đã lấy.
//
// Vì sao margin mà không phải khoảng cách tuyệt đối: câu hỏi ĐÚNG CHỦ ĐỀ có một hit NỔI TRỘI
// khỏi nhóm; câu lạc đề thì mọi ứng viên đều tầm tầm như nhau nên hit đầu gần như không hơn
// hit thứ mười. Margin không phụ thuộc thang đo — đúng chỗ khoảng cách tuyệt đối thất bại, vì
// truy vấn kiểu từ khoá NẰM XA một cách hợp lệ (lớp `keyword` chạm 0,856 trong khi ca âm giữ
// riêng tụt tới 0,806 ⇒ hai phân bố chồng nhau, không θ nào tách nổi).
const ABSTAIN_MARGIN = Number(process.env.ZEMORY_ABSTAIN_MARGIN) || 0.05;

/**
 * Cổng "không biết" — **MẶC ĐỊNH TẮT** cho tới khi trả xong nợ đo lường (plan 17 §4.1/§4.2):
 * θ hiện tại hiệu chỉnh trên CHÍNH 8 ca âm dùng để chấm nó (fit trên tập test), và corpus
 * chưa có truy vấn kiểu từ khoá để kiểm điều kiện ②. Bật: `ZEMORY_ABSTAIN=1`.
 */
export function abstainEnabled(force?: boolean): boolean {
  if (force !== undefined) return force;
  const v = process.env.ZEMORY_ABSTAIN?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

/**
 * Có nên nói "kho không có gì đủ khớp" không: hit đầu vừa XA vừa KHÔNG nổi trội khỏi nhóm.
 *
 * 🔴 Hai điều kiện ② trước đó đã bị BÁC bằng đo, ghi lại để không ai dựng lại:
 *   · *"lane AND rỗng"* — tưởng là dấu hiệu câu hỏi tự nhiên dài. Thực đo: lane AND **không
 *     bao giờ rỗng**, nó trả 1–3 ứng viên cho cả câu "công thức nấu phở bò gia truyền Nam
 *     Định". Trong 215k tin có tin đủ dài để chứa mọi từ thông dụng ⇒ cửa không bao giờ mở.
 *   · *"truy vấn không mang từ hiếm"* — tưởng câu tán gẫu chỉ có từ thông dụng. Thực đo NGƯỢC:
 *     ca âm mang từ HIẾM HƠN ca dương (`minDF` trung vị 19 so với 213) vì câu lạc đề chứa từ
 *     vựng kho gần như không có ("arabica", "plank", "vali"). Tín hiệu ngược dấu.
 *
 * Còn lại margin, và nó không phụ thuộc thang đo nên sống được ở chỗ hai cái kia chết.
 */
function shouldAbstain(topDist: number | undefined, margin: number | undefined, force?: boolean): boolean {
  if (!abstainEnabled(force)) return false;
  if (topDist === undefined || margin === undefined) return false; // không có số đo ⇒ KHÔNG chặn (điều 9)
  return topDist > ABSTAIN_DIST && margin < ABSTAIN_MARGIN;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s; // vector trong chỉ mục đã chuẩn hoá đơn vị ⇒ dot product LÀ cosine
}

/**
 * Gộp các hit gần trùng nội dung: đại diện cụm (hit xếp cao nhất) lên trước, bản trùng
 * **HẠ XUỐNG SAU** chứ KHÔNG bị loại — cùng doctrine với `demoteToolOutput`.
 *
 * 🔴 Vì sao phải HẠ chứ không XOÁ (bài học đo được 2026-08-08, sửa bản đầu của chính mình):
 * bản đầu xoá bản trùng và giữ mỗi đại diện. Đo trên kho thật thì nó làm recall **TỆ ĐI**
 * (`@40` 64% → 41%): khi một tin gần trùng xếp CAO HƠN tin đang tìm, tin đang tìm bị xoá
 * hẳn khỏi kết quả. Phép thử ngoại tuyến của tôi không thấy điều đó vì nó chấm theo "cụm
 * của đáp án nằm ở vị trí mấy" — tức tính điểm cho một cụm dù thứ TRẢ VỀ là tin khác. Hạ
 * xuống thì mặt trên sạch mà không mất gì: `@40` giữ nguyên, `similar` cho biết có bản trùng.
 */
function collapseHits(hits: SearchHit[], dbPath: string | undefined, limit: number): SearchHit[] {
  if (hits.length < 2) return hits.slice(0, limit);
  const vecs = vectorsByRowid(
    hits.map((h) => h.id),
    dbPath ?? currentMemoryDb(),
  );
  const reps: { hit: SearchHit; vec: Float32Array | undefined }[] = [];
  const dupes: SearchHit[] = [];
  for (const h of hits) {
    const v = vecs.get(h.id);
    let joined = false;
    if (v) {
      for (const r of reps) {
        if (r.vec && cosine(v, r.vec) >= COLLAPSE_SIM) {
          r.hit.similar = (r.hit.similar ?? 0) + 1;
          // Kèm ID để mở được đúng bản cần bằng một lượt `memory_show`, khỏi tìm lại cả kho.
          if ((r.hit.similarIds ??= []).length < SIMILAR_IDS_CAP) r.hit.similarIds.push(h.id);
          dupes.push({ ...h });
          joined = true;
          break;
        }
      }
    }
    if (!joined) reps.push({ hit: { ...h }, vec: v });
  }
  return [...reps.map((r) => r.hit), ...dupes].slice(0, limit);
}

/** Hydrate fused rowids → hits: scope filter + per-session cap + snippet. */
function hydrate(
  db: MemoryDB,
  ranked: { rowid: number; s: number }[],
  terms: string[],
  opts: SearchOptions,
): SearchHit[] {
  const limit = opts.limit ?? DEFAULT_SEARCH_LIMIT;
  const perSession = opts.perSession ?? 2;
  const getRow = db.prepare(
    `SELECT m.id, m.session_id, m.role, m.content, m.timestamp, s.source, s.origin, s.host, s.project_root
     FROM messages m JOIN sessions s ON s.id = m.session_id WHERE m.id = ?`,
  );
  const wantProject = !opts.all && opts.project ? norm(opts.project) : null;
  // Tra qua `attachment_link` (ánh xạ ĐẦY ĐỦ tin↔đính kèm), KHÔNG qua `attachment.message_id`
  // — cột đó chỉ giữ tin đầu tiên mang nội dung ấy vì dedup theo sha256. `message_id` là cột
  // dẫn đầu của PRIMARY KEY nên phép tra này đi thẳng vào index.
  const hasAtt = opts.hasAttachment
    ? db.prepare("SELECT 1 FROM attachment_link WHERE message_id = ? LIMIT 1")
    : null;
  const excludeLanes = opts.excludeLanes ?? getScopeExclude();
  const perSessionCount = new Map<string, number>();
  const hits: SearchHit[] = [];
  for (const { rowid, s } of ranked) {
    const row = getRow.get(rowid) as
      | { id: number; session_id: string; role: string; content: string; timestamp: string | null; source: string; origin: string | null; host: string | null; project_root: string | null }
      | undefined;
    if (!row) continue;
    if (wantProject && norm(row.project_root ?? "") !== wantProject) continue;
    if (opts.source && row.source !== opts.source) continue;
    if (opts.origin && (row.origin ?? "local") !== opts.origin) continue;
    if (opts.role && !roleMatches(row.role, row.content, opts.role)) continue;
    // Scoped recall: drop lanes the user excluded (still in the DB, just hidden).
    if (excludeLanes.length && isExcluded({ origin: row.origin ?? "local", host: row.host, source: row.source }, excludeLanes)) continue;
    if (opts.sinceMs && !(Date.parse(row.timestamp ?? "") >= opts.sinceMs)) continue;
    if (hasAtt && !hasAtt.get(row.id)) continue;
    const used = perSessionCount.get(row.session_id) ?? 0;
    if (used >= perSession) continue;
    perSessionCount.set(row.session_id, used + 1);
    hits.push({
      id: row.id,
      sessionId: row.session_id,
      source: row.source,
      origin: row.origin ?? "local",
      project: row.project_root ?? "(unknown)",
      role: row.role,
      timestamp: row.timestamp,
      score: s,
      snippet: makeSnippet(row.content, terms),
    });
    if (hits.length >= limit) break;
  }
  // NOTE: recall is NOT logged as a token "saving" — its benefit is
  // counterfactual, so claiming a % would be fake.
  return hits;
}

// ── TRỘN COSINE (rerank RẺ — plan 17 §3.1 đường ③) ───────────────────────────
// Xếp lại ứng viên bằng cosine trên vector ĐÃ LƯU rồi TRỘN với thứ tự RRF. Đo 2026-08-09 trên
// 68 nhãn: MRR 0,258 → **0,282** · `@1` 18% → 21% · `prose` MRR 0,410 → **0,458** (`@1` 26% →
// 35%) · `tool_result` MRR 0,039 → 0,087. Giá **119 ms/truy vấn** — cross-encoder tốn 10–32
// GIÂY và làm recall TỆ ĐI, nên đây là lớp rerank duy nhất ở repo này vừa rẻ vừa thắng.
//
// TRỘN chứ không THAY: thay hẳn bằng cosine cho MRR 0,276, trộn cho 0,282 — giữ lại tín hiệu
// từ khoá là có giá trị thật.
// ⚠ ĐÁNH ĐỔI ĐÃ BIẾT: lớp `keyword` tệ đi (`@1` 25% → 17%) — xếp lại theo NGỮ NGHĨA đúng là
// thứ làm hỏng truy vấn mà người ta gõ nguyên văn từ khoá. Tắt bằng `ZEMORY_VECMIX=0`.
const VECMIX_POOL = 60;

/** Trộn cosine vào thứ hạng: mặc định BẬT (thắng net trên corpus có nhãn — điều 12). */
export function vecMixEnabled(force?: boolean): boolean {
  if (force !== undefined) return force;
  const v = process.env.ZEMORY_VECMIX?.trim().toLowerCase();
  return !(v === "0" || v === "false" || v === "off");
}

/** RRF giữa thứ tự hiện có và thứ tự cosine tới truy vấn. Thiếu vector ⇒ giữ nguyên (điều 9). */
function mixByCosine(hits: SearchHit[], qv: Float32Array | undefined, dbPath: string | undefined): SearchHit[] {
  if (!qv || hits.length < 3) return hits;
  const ids = hits.slice(0, VECMIX_POOL).map((h) => h.id);
  const vecs = vectorsByRowid(ids, dbPath ?? currentMemoryDb());
  if (!vecs.size) return hits;
  // Tin không có vector: điểm -2 ⇒ rơi xuống đáy của lượt cosine nhưng KHÔNG bị loại, vì nó
  // vẫn giữ nguyên hạng trong lượt RRF và hai lượt được cộng lại.
  const byCos = [...ids]
    .map((id) => ({ id, s: vecs.get(id) ? cosine(qv, vecs.get(id) as Float32Array) : -2 }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.id);
  const score = new Map<number, number>();
  hits.forEach((h, i) => score.set(h.id, (score.get(h.id) ?? 0) + 1 / (RRF_K + i + 1)));
  byCos.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 / (RRF_K + i + 1)));
  const pos = new Map(hits.map((h) => [h.id, h]));
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => pos.get(id) as SearchHit)
    .filter(Boolean);
}

/**
 * Chặng cuối dùng chung cho CẢ HAI đường (FTS và hybrid): lấy dư → trộn cosine → gộp
 * near-duplicate → cắt về `limit`. Một chỗ duy nhất để hai đường không lệch thứ tự (bài học
 * `demoteToolOutput` từng chỉ nằm ở một đường, và đường bị bỏ sót lại chính là đường mặc định).
 *
 * Thứ tự này KHÔNG tuỳ tiện: trộn cosine đặt đúng chỗ phép đo đã chạy — trên danh sách ĐÃ qua
 * hạ-điểm-tool và recency, chứ không phải trên thứ hạng RRF thô.
 */
function finish(
  db: MemoryDB,
  ordered: { rowid: number; s: number }[],
  terms: string[],
  opts: SearchOptions,
  qv?: Float32Array,
): SearchHit[] {
  const limit = opts.limit ?? DEFAULT_SEARCH_LIMIT;
  const collapse = collapseEnabled(opts.collapse);
  const mix = vecMixEnabled(opts.vecMix);
  if (!collapse && !mix) return hydrate(db, ordered, terms, opts);
  const wide = hydrate(db, ordered, terms, { ...opts, limit: limit * COLLAPSE_OVERFETCH });
  const mixed = mix ? mixByCosine(wide, qv, opts.dbPath) : wide;
  return collapse ? collapseHits(mixed, opts.dbPath, limit) : mixed.slice(0, limit);
}

/** Run a recall query — FTS5 word + trigram fused with RRF (the always-on baseline). */
export function search(query: string, opts: SearchOptions = {}): SearchHit[] {
  const terms = ftsTerms(query);
  if (!terms.length) return [];
  const db = openMemory(opts.dbPath ?? currentMemoryDb());
  try {
    const scopedProject = !opts.all ? opts.project : undefined;
    const ranked = rrf(ftsStreams(db, terms, scopedProject));
    if (!ranked.length) return [];
    const ordered = rankWithRecency(db, demoteToolOutput(db, ranked, opts), opts);
    return finish(db, ordered, terms, opts);
  } finally {
    db.close();
  }
}

/**
 * Hybrid recall setting. Source of truth = the persistent UI toggle
 * (~/.zemory/config.json, default ON). `ZEMORY_HYBRID` env, when set, is an
 * explicit override (1/on or 0/off). Safe to leave on before the vector
 * backfill — searchHybrid fail-opens to FTS when a message has no vector yet.
 */
export function hybridEnabled(): boolean {
  const v = process.env.ZEMORY_HYBRID?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  if (v === "1" || v === "true" || v === "on") return true;
  return getHybridSetting();
}

/**
 * Cross-encoder rerank on? Per-call `opts.rerank` wins; else `ZEMORY_RERANK`
 * env override (1/on or 0/off); else the persistent setting (default OFF).
 */
export function rerankEnabled(force?: boolean): boolean {
  if (force !== undefined) return force;
  const v = process.env.ZEMORY_RERANK?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  if (v === "1" || v === "true" || v === "on") return true;
  return getRerankSetting();
}

/**
 * Optional rerank stage: rescore the top `RERANK_POOL` fused candidates with a
 * cross-encoder and reorder them, leaving the long tail in RRF order. FAIL-OPEN:
 * if the reranker is unavailable or returns a bad shape, the RRF order is kept.
 */
async function maybeRerank(
  db: MemoryDB,
  ranked: { rowid: number; s: number }[],
  query: string,
  force?: boolean,
): Promise<{ rowid: number; s: number }[]> {
  if (!rerankEnabled(force) || ranked.length < 2) return ranked;
  const pool = ranked.slice(0, RERANK_POOL);
  const getContent = db.prepare("SELECT content FROM messages WHERE id = ?");
  const docs = pool.map(
    (r) => ((getContent.get(r.rowid) as { content: string } | undefined)?.content ?? "").slice(0, RERANK_CHARS),
  );
  const scores = await rerank(query, docs);
  if (!scores || scores.length !== pool.length) return ranked; // fail-open → RRF order
  const reordered = pool
    .map((r, i) => ({ rowid: r.rowid, s: scores[i] }))
    .sort((a, b) => b.s - a.s);
  return [...reordered, ...ranked.slice(RERANK_POOL)];
}

/**
 * Fused recall core: FTS (word+trigram) + an optional semantic vector stream,
 * blended with RRF, then an optional cross-encoder rerank. FAIL-OPEN at every
 * added stage — degrades to exactly `search()` (FTS-only) when vectors and the
 * reranker are unavailable.
 */
async function fusedSearch(query: string, opts: SearchOptions, useVector: boolean): Promise<RecallResult> {
  const terms = ftsTerms(query);
  const probe = useVector ? await vectorProbe(query, { dbPath: opts.dbPath, pool: POOL }) : { ranks: [] };
  const vec = probe.ranks;
  const topDistance = vec.length ? vec[0].dist : undefined;
  // Độ vượt trội của hit đầu so với nhóm — tín hiệu của cổng "không biết" (xem shouldAbstain).
  const spread = vec.length >= 3 ? vec.slice(0, 10) : [];
  const margin = spread.length >= 3 ? (spread[spread.length - 1].dist ?? 0) - (spread[0].dist ?? 0) : undefined;
  if (!terms.length && !vec.length) return { hits: [] };
  const db = openMemory(opts.dbPath ?? currentMemoryDb());
  try {
    const scopedProject = !opts.all ? opts.project : undefined;
    const streams = terms.length ? ftsStreams(db, terms, scopedProject) : [];
    if (vec.length) streams.push({ ranks: vec, w: W_VEC });
    let ranked = rrf(streams);
    if (!ranked.length) return { hits: [], topDistance };
    if (shouldAbstain(topDistance, margin, opts.abstain)) return { hits: [], abstained: true, topDistance };
    ranked = await maybeRerank(db, ranked, query, opts.rerank);
    // SAU rerank, TRƯỚC recency — cùng vị trí như ở search() để hai đường cho cùng
    // thứ tự. Bỏ sót đây là bỏ sót đường CHÍNH: hybrid bật mặc định, UI đi lối này.
    // `vec.length > 0`, KHÔNG phải `useVector`: vector fail-open trả rỗng thì lane này thực sự
    // là FTS-thuần và phải chịu mức phạt mạnh của FTS.
    ranked = demoteToolOutput(db, ranked, opts, vec.length > 0);
    ranked = rankWithRecency(db, ranked, opts);
    return { hits: finish(db, ranked, terms, opts, probe.qv), topDistance };
  } finally {
    db.close();
  }
}

/**
 * Kết quả recall KÈM LÝ DO — bề mặt nào cần phân biệt *"không tìm thấy"* với *"có tìm nhưng
 * không đủ khớp nên tôi không trả"* thì gọi đường này (plan 17 §1.3). Trả rỗng mà im lặng
 * là đúng cái làm người đọc tưởng kho trống.
 */
export interface RecallResult {
  hits: SearchHit[];
  /** Cổng "không biết" đã nổ: có ứng viên nhưng không cái nào đủ gần. */
  abstained?: boolean;
  /** Khoảng cách cosine của hit vector gần nhất — số để người/agent tự phán. */
  topDistance?: number;
}

/** Recall entry point used by the surfaces: hybrid when enabled, else FTS-only. */
export async function recall(query: string, opts: SearchOptions = {}): Promise<SearchHit[]> {
  return (await fusedSearch(query, opts, hybridEnabled())).hits;
}

/** Như `recall()` nhưng nói luôn vì sao rỗng (dùng cho CLI/MCP). */
export async function recallChecked(query: string, opts: SearchOptions = {}): Promise<RecallResult> {
  return fusedSearch(query, opts, hybridEnabled());
}

/**
 * Hybrid recall — FTS (word+trigram) + a semantic vector stream, fused with RRF,
 * plus the optional cross-encoder rerank. FAIL-OPEN: if the query can't be
 * embedded or no vectors exist, the vector stream is empty and this degrades to
 * FTS-only. Vector/rerank are additive, never a replacement.
 */
export async function searchHybrid(query: string, opts: SearchOptions = {}): Promise<SearchHit[]> {
  return (await fusedSearch(query, opts, true)).hits;
}

/**
 * ĐA-TRUY-VẤN: một câu hỏi, nhiều cách diễn đạt, gộp bằng RRF (plan 17 §1.1).
 *
 * Vì sao: đo 2026-08-08 trên corpus 56 nhãn — hỏi cùng một việc bằng BA cách nâng
 * `@10` 39% → 50% và `@40` 45% → 64%; riêng lớp `prose` `@40` **68% → 94%**. Tức cái
 * "trần pool" từng bị chẩn là nghẽn ở lớp NHÚNG (lý do bỏ 43 giờ dựng 768 chiều) phần
 * lớn là giới hạn của MỘT cách diễn đạt, không phải của model.
 *
 * AI sinh biến thể? **AGENT ĐANG GỌI** — HP điều 6② (token của phiên nó; lõi zemory không
 * sinh văn bản). Ở đây chỉ gộp, thuần tất định.
 *
 * Gộp ở tầng DANH SÁCH CUỐI, không phải tầng stream: đó đúng là chỗ phép đo đã chạy, nên
 * số đo và code nói về cùng một thứ. Một truy vấn ⇒ đi thẳng `recall()`, hành vi y như cũ.
 */
export async function searchMulti(queries: string[], opts: SearchOptions = {}): Promise<SearchHit[]> {
  const qs = queries.map((q) => q.trim()).filter(Boolean);
  if (!qs.length) return [];
  if (qs.length === 1) return recall(qs[0], opts);
  const limit = opts.limit ?? DEFAULT_SEARCH_LIMIT;
  // Từng lượt lấy DƯ và KHÔNG gộp: gộp phải xảy ra SAU khi hợp nhất, vì bản gần trùng của
  // nhau thường do các lối nói KHÁC nhau kéo về — gộp sớm ở từng danh sách thì mỗi danh sách
  // chỉ thấy một phần của cụm. Đây cũng đúng chỗ phép thử đã đo (gộp trên danh sách đã fuse).
  const sub = { ...opts, collapse: false, limit: limit * COLLAPSE_OVERFETCH };
  const lists: SearchHit[][] = [];
  // Tuần tự có chủ ý: mỗi truy vấn nhúng một lần qua CÙNG một session ONNX; chạy song song
  // là hai lượt giẫm chân nhau trên cùng CPU (bài học bench↔embed 2026-08-07).
  for (const q of qs) lists.push(await recall(q, sub));
  const fused = fuseHitLists(lists, limit * COLLAPSE_OVERFETCH);
  return collapseEnabled(opts.collapse) ? collapseHits(fused, opts.dbPath, limit) : fused.slice(0, limit);
}

/** RRF trên nhiều danh sách hit đã hoàn chỉnh; giữ metadata của lần xuất hiện đầu tiên. */
function fuseHitLists(lists: SearchHit[][], limit: number): SearchHit[] {
  const score = new Map<number, number>();
  const meta = new Map<number, SearchHit>();
  for (const hits of lists) {
    hits.forEach((h, i) => {
      score.set(h.id, (score.get(h.id) ?? 0) + 1 / (RRF_K + i + 1));
      if (!meta.has(h.id)) meta.set(h.id, h);
    });
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, s]) => ({ ...(meta.get(id) as SearchHit), score: s }));
}

/** Progressive disclosure: fetch one message's full content + context. */
export function getMessage(id: number, dbPath: string = currentMemoryDb()) {
  const db = openMemory(dbPath);
  try {
    return db
      .prepare(
        `SELECT m.id, m.session_id, m.role, m.content, m.tool_name, m.timestamp, s.source, s.project_root, s.title
         FROM messages m JOIN sessions s ON s.id = m.session_id WHERE m.id = ?`,
      )
      .get(id);
  } finally {
    db.close();
  }
}

export interface ContextMessage {
  id: number;
  role: string;
  content: string;
  timestamp: string | null;
  isHit: boolean;
}

export interface MessageContext {
  sessionId: string;
  source: string;
  project: string;
  title: string | null;
  messages: ContextMessage[];
  /** Set when a giant session got cut at the thread cap (not the full transcript). */
  truncated?: boolean;
}

/** A hit in its conversation: the message plus `window` neighbours each side. */
export function getMessageContext(
  id: number,
  window = 3,
  dbPath: string = currentMemoryDb(),
): MessageContext | null {
  const db = openMemory(dbPath);
  try {
    const target = db
      .prepare(
        `SELECT m.id, m.session_id, m.role, m.content, m.timestamp, s.source, s.project_root, s.title
         FROM messages m JOIN sessions s ON s.id = m.session_id WHERE m.id = ?`,
      )
      .get(id) as
      | {
          id: number;
          session_id: string;
          role: string;
          content: string;
          timestamp: string | null;
          source: string;
          project_root: string | null;
          title: string | null;
        }
      | undefined;
    if (!target) return null;
    const neighbour = (cmp: string, order: string) =>
      db
        .prepare(
          `SELECT id, role, content, timestamp FROM messages
           WHERE session_id = ? AND id ${cmp} ? ORDER BY id ${order} LIMIT ?`,
        )
        .all(target.session_id, id, window) as ContextMessage[];
    const before = neighbour("<", "DESC").reverse();
    const after = neighbour(">", "ASC");
    const messages: ContextMessage[] = [
      ...before.map((m) => ({ ...m, isHit: false })),
      { id: target.id, role: target.role, content: target.content, timestamp: target.timestamp, isHit: true },
      ...after.map((m) => ({ ...m, isHit: false })),
    ];
    return {
      sessionId: target.session_id,
      source: target.source,
      project: target.project_root ?? "(unknown)",
      title: target.title,
      messages,
    };
  } finally {
    db.close();
  }
}

/** Safety cap for the full-thread dialog — a UI answer, not a hard truth; the
 *  result says `truncated` when it kicked in so callers can show that. */
const THREAD_CAP = 5000;

/** The ENTIRE session transcript (all messages, ordered) for the full-thread dialog. */
export function getSessionThread(sessionId: string, dbPath: string = currentMemoryDb()): MessageContext | null {
  if (!sessionId) return null;
  const db = openMemory(dbPath);
  try {
    const s = db.prepare("SELECT source, project_root, title FROM sessions WHERE id = ?").get(sessionId) as
      | { source: string; project_root: string | null; title: string | null }
      | undefined;
    if (!s) return null;
    const rows = db
      .prepare("SELECT id, role, content, timestamp FROM messages WHERE session_id = ? ORDER BY id ASC LIMIT ?")
      .all(sessionId, THREAD_CAP + 1) as { id: number; role: string; content: string; timestamp: string | null }[];
    const truncated = rows.length > THREAD_CAP;
    if (truncated) rows.length = THREAD_CAP;
    return {
      sessionId,
      source: s.source,
      project: s.project_root ?? "(unknown)",
      title: s.title,
      messages: rows.map((m) => ({ ...m, isHit: false })),
      truncated,
    };
  } finally {
    db.close();
  }
}

const SNIP = 90;
/** Max chars a single hit's snippet spans (a ±SNIP window around the match). */
export const SNIPPET_MAX_CHARS = SNIP * 2;

// A window around the first matching term (so the hit, not the head, shows).
function makeSnippet(content: string, terms: string[]): string {
  const flat = content.replace(/\s+/g, " ").trim();
  const low = flat.toLowerCase();
  let at = -1;
  for (const t of terms) {
    const i = low.indexOf(t);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) return flat.slice(0, SNIP * 2) + (flat.length > SNIP * 2 ? "…" : "");
  const start = Math.max(0, at - SNIP);
  const end = Math.min(flat.length, at + SNIP);
  return (start > 0 ? "…" : "") + flat.slice(start, end) + (end < flat.length ? "…" : "");
}
