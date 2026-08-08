// Recall over the global memory. Two FTS5 streams — word (unicode61) + trigram
// (substring / Vietnamese) — fused with Reciprocal Rank Fusion (idea from
// Context Mode / agentmemory). Returns lightweight hits (progressive
// disclosure: id + snippet first, full text on demand via getMessage). Default
// scope = the current project; pass all=true for cross-project recall.

import { type MemoryDB, currentMemoryDb, openMemory } from "./db.js";
import { vectorRanks } from "./vectors.js";
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
  /** Provenance lanes to EXCLUDE from results; undefined = the saved scope list. */
  excludeLanes?: ScopeLane[];
}

/** Default hits a recall returns (progressive disclosure: snippet first, full
 *  text on demand). The UI derives the per-recall token budget from this. */
export const DEFAULT_SEARCH_LIMIT = 12;

const RRF_K = 60;
const W_WORD = 1.0;
const W_TRI = 0.6;
/** Luồng "khớp BẤT KỲ từ nào" — lưới vét cho truy vấn dài. Trọng số THẤP hơn AND có chủ ý:
 *  nó rộng nên dùng để pool không rỗng, không phải để quyết thứ hạng đầu. */
const W_OR = 0.6;
const W_VEC = 1.0; // semantic stream weight (hybrid)
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
  return [
    { ranks: streamRanks(db, "messages_fts", wordAnd, scopedProject), w: W_WORD },
    { ranks: streamRanks(db, "messages_fts_tri", anyTerm, scopedProject), w: W_TRI },
    { ranks: streamRanks(db, "messages_fts", anyTerm, scopedProject), w: W_OR },
  ];
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
const TOOL_DEMOTE = 0.3;

function demoteToolOutput(
  db: MemoryDB,
  ranked: { rowid: number; s: number }[],
  opts: SearchOptions,
): { rowid: number; s: number }[] {
  if (opts.role === "tool" || opts.includeTools) return ranked; // hỏi thẳng tool ⇒ không phạt
  if (ranked.length < 2) return ranked;
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
    .map((r) => (isTool.get(r.rowid) ? { rowid: r.rowid, s: r.s * TOOL_DEMOTE } : r))
    .sort((a, b) => b.s - a.s);
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

/** Run a recall query — FTS5 word + trigram fused with RRF (the always-on baseline). */
export function search(query: string, opts: SearchOptions = {}): SearchHit[] {
  const terms = ftsTerms(query);
  if (!terms.length) return [];
  const db = openMemory(opts.dbPath ?? currentMemoryDb());
  try {
    const scopedProject = !opts.all ? opts.project : undefined;
    const ranked = rrf(ftsStreams(db, terms, scopedProject));
    if (!ranked.length) return [];
    return hydrate(db, rankWithRecency(db, demoteToolOutput(db, ranked, opts), opts), terms, opts);
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
async function fusedSearch(query: string, opts: SearchOptions, useVector: boolean): Promise<SearchHit[]> {
  const terms = ftsTerms(query);
  const vec = useVector ? await vectorRanks(query, { dbPath: opts.dbPath, pool: POOL }) : [];
  if (!terms.length && !vec.length) return [];
  const db = openMemory(opts.dbPath ?? currentMemoryDb());
  try {
    const scopedProject = !opts.all ? opts.project : undefined;
    const streams = terms.length ? ftsStreams(db, terms, scopedProject) : [];
    if (vec.length) streams.push({ ranks: vec, w: W_VEC });
    let ranked = rrf(streams);
    if (!ranked.length) return [];
    ranked = await maybeRerank(db, ranked, query, opts.rerank);
    // SAU rerank, TRƯỚC recency — cùng vị trí như ở search() để hai đường cho cùng
    // thứ tự. Bỏ sót đây là bỏ sót đường CHÍNH: hybrid bật mặc định, UI đi lối này.
    ranked = demoteToolOutput(db, ranked, opts);
    ranked = rankWithRecency(db, ranked, opts);
    return hydrate(db, ranked, terms, opts);
  } finally {
    db.close();
  }
}

/** Recall entry point used by the surfaces: hybrid when enabled, else FTS-only. */
export async function recall(query: string, opts: SearchOptions = {}): Promise<SearchHit[]> {
  return fusedSearch(query, opts, hybridEnabled());
}

/**
 * Hybrid recall — FTS (word+trigram) + a semantic vector stream, fused with RRF,
 * plus the optional cross-encoder rerank. FAIL-OPEN: if the query can't be
 * embedded or no vectors exist, the vector stream is empty and this degrades to
 * FTS-only. Vector/rerank are additive, never a replacement.
 */
export async function searchHybrid(query: string, opts: SearchOptions = {}): Promise<SearchHit[]> {
  return fusedSearch(query, opts, true);
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
