// LLM-facing tool DEFINITIONS + binding (03_STRUCTURE §3 `tools/`): the four
// recall tools an agent can call, each schema + a thin dispatcher that
// delegates execution to the owning slots (memory/search, docs/plan). The MCP
// JSON-RPC surface that ships these over stdio lives in ../mcp.ts — keep wire
// framing OUT of here and tool knowledge OUT of the surface.

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findProjectRoot, normalizeRoot, uiPort } from "../core/config.js";
import { scan } from "../memory/ingest.js";
import { scanWebPlatforms } from "../memory/scanweb.js";
import { vectorRemaining } from "../memory/vectors.js";
import { acquireCliWriteLock, cliWriteHolder, daemonJobBusyExternal, releaseCliWriteLock } from "../jobs/writegate.js";
import { getCodeGraph } from "../memory/graph/graph-cache.js";
import { fileImpact } from "../memory/graph/graph.js";
import { getMessage, getMessageContext, searchHybrid, searchMulti } from "../memory/search.js";
import { searchSections, showSection } from "../docs/plan.js";
import { searchChangelog } from "../docs/changelog.js";
import { listPinned, pinSession, recallCard } from "../memory/recall.js";
import { mergeSplitProjects } from "../memory/mergeprojects.js";
import { conflictCandidates } from "../memory/conflicts.js";
import { memoryInfo } from "../memory/ingest.js";
import { gatherStatus } from "../status.js";
import { runCheck } from "../checks.js";

export type JsonObject = Record<string, unknown>;

export interface McpEnv {
  dbPath?: string;
  projectRoot?: string | null;
}

const clampLimit = (n: unknown, fallback: number, max: number): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : fallback;
  return Math.max(1, Math.min(max, v));
};

const clampWindow = (n: unknown): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : 0;
  return Math.max(0, Math.min(10, v));
};

export const asString = (v: unknown): string => (typeof v === "string" ? v : "");

const currentProject = (args: JsonObject, env: McpEnv): string | undefined => {
  if (args.all) return undefined;
  if (env.projectRoot === null) return undefined;
  // No harness in cwd is NOT an error: zemory is installed machine-wide, so
  // recall falls back to the whole global memory instead of scoping to cwd.
  // The MCP caller's `project` / env root arrives in whatever casing it had; normalize
  // it or a scoped search looks up a key the index never wrote (see normalizeRoot).
  const picked = asString(args.project) || env.projectRoot;
  return picked ? normalizeRoot(picked) : findProjectRoot() || undefined;
};

const jsonText = (value: unknown): string => JSON.stringify(value, null, 2);

/** Engine chỉ probe được bằng cách NẠP MODEL — đắt, nên chỉ chạy khi gọi `deep`. */
export const DEEP_ONLY_CHECKS = ["vector", "rerank"] as const;

/**
 * Những capability `memory_doctor` sẽ probe.
 *
 * Tách thành hàm THUẦN để cổng kiểm khẳng định được lời hứa mà không phải nạp model: bản
 * test đầu tiên gọi thật với `deep` mất **48 giây** (đo 2026-08-02) — một phép kiểm đắt như
 * thế thì hoặc bị bỏ, hoặc làm cả gate chậm. `listFeatures()` là danh mục cho màn Home (3
 * dòng: memory/validate/grill); hai engine đắt nằm trong `runCheck` nên phải nối thêm ở đây
 * — audit 2026-08-02 bắt đúng chỗ này: tool trả 3 feature trong khi mô tả nói "engines are loaded".
 */
export function doctorFeatureKeys(base: string[], deep: boolean): string[] {
  return deep ? [...new Set([...base, ...DEEP_ONLY_CHECKS])] : base;
}

function toolResult(value: unknown) {
  return { content: [{ type: "text", text: typeof value === "string" ? value : jsonText(value) }] };
}

// ── Hạ tầng dùng chung cho ba tool ĐIỀU KHIỂN ────────────────────────────────

/**
 * Ai đang ghi kho, hay `null` khi rảnh.
 *
 * Hai nguồn, và phải là hai nguồn ĐỌC ĐƯỢC TỪ TIẾN TRÌNH KHÁC: máy chủ MCP là một tiến
 * trình RIÊNG, nên `daemonJobBusy()` / `schedulerChildRunning()` (biến trong bộ nhớ daemon)
 * ở đây **luôn** trả false — dùng chúng là tự dựng một bề mặt nói dối. Khoá FILE và marker
 * FILE mới là thứ xuyên tiến trình.
 */
function writeBusy(): string | null {
  const held = cliWriteHolder();
  if (held) return `${held.label} (pid ${held.pid})`;
  if (daemonJobBusyExternal()) return "a daemon background job";
  return null;
}

/** Hỏi daemon một endpoint. `null` = daemon không trả lời — KHÔNG suy ra "không có gì chạy". */
async function askDaemon<T>(path: string, ms = 800): Promise<T | null> {
  try {
    const r = await fetch(`http://127.0.0.1:${uiPort()}${path}`, { signal: AbortSignal.timeout(ms) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Đường tới CLI đã dựng — cùng phép tính với `scheduler.ts` (cả hai ở `dist/<slot>/`). */
function cliEntry(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "cli.js");
}

/**
 * Số tin còn chờ nhúng — HỎI DAEMON TRƯỚC, đếm thẳng là đường CUỐI.
 *
 * Đo 2026-08-28 trên kho thật (309k tin · 2,5 GB): `vectorRemaining()` là anti-join toàn
 * bảng mất **15,7 giây**, trong khi daemon đã cache đúng con số đó và trả trong **107 ms**
 * (7,4 s lượt lạnh). Bản đầu của `memory_jobs` gọi thẳng `vectorRemaining()` và vì thế
 * KHÔNG kịp trả lời trong 6 giây — mô tả tool khi đó ghi "read-only and cheap", tức bề mặt
 * tự khai sai về chính mình. `ui.ts heavyStatsSync` đã ghi cùng bài học từ 08-23 (16,7 s
 * lượt lạnh làm đứng cả daemon); không có lý do để đi lại con đường đó ở tiến trình khác.
 *
 * Trả kèm `source` để người đọc biết con số TƯƠI tới đâu — cache của daemon có tuổi, và
 * trình bày số cũ như số mới là đúng thứ điều 12 cấm.
 */
async function embedBacklog(dbPath: string | undefined, forceDirect = false): Promise<{ value: number | string; source: string }> {
  // Kho RIÊNG ⇒ luôn đếm thẳng: daemon cache số của kho MẶC ĐỊNH, trả nó cho người đang hỏi
  // một kho khác là đưa số của kho người ta. Suy ở ĐÂY chứ không bắt nơi gọi nhớ — hai nơi
  // gọi hiện tại đều truyền đúng, nhưng "đúng vì có người nhớ" là chỗ hỏng của lần thứ ba.
  const direct = forceDirect || Boolean(dbPath);
  if (!direct) {
    // 6 s: đo 2026-08-28 — lượt ẤM 107 ms, lượt LẠNH 7,4 s. Ngưỡng 3 s của bản đầu bắt được
    // lượt ấm nhưng trượt mọi lượt lạnh, mà lượt lạnh chính là lúc người ta cần con số nhất
    // (vừa mở máy). Lạnh chỉ xảy ra một lần mỗi đời daemon: `heavyStats` sau đó trả số cũ
    // NGAY rồi tính lại ở tiến trình con (`ui.ts §heavyStats`), nên đây không phải giá thường kỳ.
    const st = await askDaemon<{ vectors?: { remaining?: number }; cachedAgeMs?: number }>("/memory-status", 6000);
    const v = st?.vectors?.remaining;
    if (typeof v === "number") {
      return { value: v, source: `daemon cache (${Math.round((st?.cachedAgeMs ?? 0) / 1000)}s old)` };
    }
  }
  if (!direct) {
    return {
      value: "not counted — costs ~16s on a store this size; the daemon (which caches it) is not answering",
      source: "skipped",
    };
  }
  try {
    return { value: vectorRemaining(dbPath), source: "direct count (full anti-join)" };
  } catch (e) {
    // Điều 9 + điều 12: hỏng thì NÓI hỏng, đừng trả 0 (0 đọc ra là "đã nhúng xong hết").
    return { value: `unknown — could not count (${e instanceof Error ? e.message : "read failed"})`, source: "failed" };
  }
}

/** Câu trả lời chung khi có kẻ khác đang ghi. Từ chối RÕ, không tranh khoá (plan 14 §C). */
function busyResult(tool: string, who: string) {
  return toolResult({
    ok: false,
    busy: true,
    heldBy: who,
    note: `${tool} did not run: ${who} is writing the memory store right now. Nothing was changed. `
      + "Wait and retry, or call memory_jobs to watch it finish — do NOT try to force it.",
  });
}

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text", text: message }] };
}

export const TOOLS = [
  {
    name: "memory_search",
    description:
      "Search the local cross-agent global memory (hybrid keyword+semantic, about a second). Returns lightweight hits; call memory_show " +
      "for full text. Grade the hits before trusting them: if they do not actually answer the question, rewrite the query — synonyms, a " +
      "different phrasing, or the other language in a bilingual workspace — and search again (up to 2 rewrites) before concluding the " +
      "memory has nothing. Only when rewriting still fails, retry once with deep=true: it adds cross-encoder re-ranking, which measures " +
      "~40x slower (tens of seconds) and has never beaten plain hybrid on this repo's labelled benchmark — a last resort, not a better default. " +
      "BETTER THAN REWRITING TWICE: send ONE well-formed rewrite in `also` on the FIRST call. Measured 2026-08-10 on this repo's labelled " +
      "corpus (prose, n=34): a single GOOD variant lifts recall@10 from 50% to 71% and recall@40 from 65% to 79% — the answer is often in " +
      "the store but invisible to the exact words you picked. But QUALITY decides the sign: a vague restatement of the same question dropped " +
      "MRR to 0.189, far WORSE than sending nothing (0.407). A variant must be as specific as the original — different words, same amount of " +
      "detail. If you cannot write one that specific, send none. Costs one extra search (~1s).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query." },
        also: {
          type: "array",
          items: { type: "string" },
          description:
            "ONE other phrasing of the SAME question — synonyms, the other language, keyword-style vs natural-sentence. Results " +
            "are fused by rank, so a hit found by either phrasing surfaces. Two rules, both measured: (1) keep it AS SPECIFIC as " +
            "the original — a vaguer restatement is worse than sending nothing; (2) more is not better — a second, weaker variant " +
            "dragged prose recall@10 from 71% back down to 50%. Do NOT put different questions here.",
        },
        all: { type: "boolean", description: "Search all projects instead of the current project." },
        project: { type: "string", description: "Project root to scope search to; ignored when all=true." },
        limit: { type: "number", description: "Maximum hits, default 12, max 50." },
        expand_duplicates: {
          type: "boolean",
          description:
            "Off by default: this store discusses the same work across many sessions, so near-identical messages are " +
            "MERGED into one line carrying `similar` (how many were folded in) and `similarIds` (their ids — open any " +
            "with memory_show, no second search needed). NOTHING is hidden. Set true only when you need every copy " +
            "listed separately — e.g. tracing how one decision was worded over time, or the merged line is not the " +
            "exact message you must cite.",
        },
        deep: { type: "boolean", description: "Add cross-encoder re-ranking. LAST RESORT: ~40x slower (tens of seconds)." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "memory_show",
    description:
      "Get the FULL text of one memory message. WHEN TO CALL: right after memory_search, on the hits that "
      + "look relevant — search returns short snippets on purpose. Set `window` to also read the messages "
      + "around it when you need the conversation, not just the line (search → show(window) → decide).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Message id returned by memory_search." },
        window: { type: "number", description: "Neighbour messages on each side. Default 0, max 10." },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "changelog_search",
    description:
      "Search this project's DECISION LOG (06_CHANGES + its archive). WHEN TO CALL: before acting on any rule, "
      + "convention or past decision — and always before saying 'we never did X'. A hit that a later entry reversed "
      + "comes back flagged `supersededBy`; when you see that flag, read the newer entry and follow IT, not the hit. "
      + "This is the only surface that knows a decision is dead: memory_search returns the old wording as confidently "
      + "as the new one.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query." },
        all: { type: "boolean", description: "Search every project instead of the current one." },
        project: { type: "string", description: "Project root to scope to; ignored when all=true." },
        limit: { type: "number", description: "Maximum hits, default 10, max 50." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "memory_context",
    description:
      "Where the last sessions in this project left off — recent sessions, what was touched, open threads. "
      + "WHEN TO CALL: as the FIRST call of a session in an unfamiliar or resumed project, before asking the user "
      + "to re-explain context — and again right AFTER your context was compacted or summarised, because the full "
      + "session survives here even though your context does not. Cheap and read-only. For a specific question use "
      + "memory_search instead.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Project root; defaults to the current one." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "project_current",
    description:
      "Which project zemory thinks you are in, and whether a harness is connected. NEVER fails — returns "
      + "`connected:false` instead of erroring. WHEN TO CALL: first, when you are unsure whether the other tools "
      + "will be scoped to the right project, or when a scoped search comes back empty and you suspect the scope.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "memory_stats",
    description:
      "Size and shape of the memory store: sessions, messages, agents, date range. WHEN TO CALL: to sanity-check "
      + "an empty or surprising search result — an empty store and a bad query look identical from memory_search.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "memory_doctor",
    description:
      "Diagnose this machine's zemory install: harness docs present, providers resolved, capabilities probed. "
      + "WHEN TO CALL: when a memory tool behaves oddly — empty results, missing project scope, a feature the "
      + "user says should be on — before blaming the query. Read-only. Default is the FAST pass (a second or "
      + "two). Pass deep=true to also load and exercise the vector + rerank engines — that is the only way to "
      + "tell 'switched on' from 'actually works', but it costs ~30-60s because the ONNX models get loaded.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Project root to diagnose; defaults to the current one." },
        deep: { type: "boolean", description: "Also probe the vector/rerank engines (slow: loads models)." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "memory_conflicts",
    description:
      "Find memory records about one topic that may CONTRADICT each other — an older decision still being "
      + "returned as if it were live. WHEN TO CALL: before you rely on something 'the memory says', when two "
      + "recalls disagree, or when the user says a rule changed. zemory only PAIRS the candidates (same topic, "
      + "decision-shaped wording, far apart in time) — YOU judge whether they actually conflict, and the newer "
      + "one wins unless it says otherwise. If a decision really was reversed, say so and record it in "
      + "06_CHANGES with a Supersede line naming the old entry's date key; that is what makes it machine-visible next time.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "The subject to check, in the words the memory would use." },
        all: { type: "boolean", description: "Check every project instead of the current one." },
        project: { type: "string", description: "Project root to scope to; ignored when all=true." },
        limit: { type: "number", description: "How many hits to scan, default 20, max 50." },
      },
      required: ["topic"],
      additionalProperties: false,
    },
  },
  {
    name: "session_pin",
    description:
      "Pin (or unpin) one memory session so it always shows at the top of memory_context, however old it gets. "
      + "WHEN TO CALL: when the user says a session matters long-term — the decision thread, the incident, the "
      + "one they keep asking you to re-read. Pin the session id from memory_search/memory_context. Pass on=false "
      + "to unpin. Pinning changes ranking only: nothing is copied, edited or deleted.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Session id to pin." },
        on: { type: "boolean", description: "true = pin (default), false = unpin." },
      },
      required: ["session_id"],
      additionalProperties: false,
    },
  },
  {
    name: "project_merge",
    description:
      "Find (and optionally fix) projects the index SPLIT into two keys for the same folder — 'D:\\x' vs 'd:\\x', "
      + "trailing slash, mixed separators. WHEN TO CALL: when a project-scoped search returns far less than the user "
      + "expects, or memory_stats shows a folder listed twice. Defaults to a DRY RUN that only reports the groups; "
      + "pass apply=true (after showing the user what would move) to repoint them. Never deletes a row — only the "
      + "grouping field changes, each session keeps its original cwd.",
    inputSchema: {
      type: "object",
      properties: {
        apply: { type: "boolean", description: "false (default) = report only; true = actually merge." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "plan_search",
    description:
      "Search this project's design docs (docs/plan/*). WHEN TO CALL: before proposing or changing a design, "
      + "to find what was already specified — the plan is the source of truth for HOW things are meant to work, "
      + "while memory_search holds what actually happened. Returns section ids; call plan_show for full text.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query." },
        all: { type: "boolean", description: "Search docs across all projects instead of the current project." },
        project: { type: "string", description: "Project root to scope search to; ignored when all=true." },
        limit: { type: "number", description: "Maximum hits, default 10, max 50." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "plan_show",
    description:
      "Get the full text of one plan/doc section. WHEN TO CALL: after plan_search, on the section you actually "
      + "need — do not guess a spec from its snippet.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Section id returned by plan_search." },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  // ── Điều khiển (plan 14) — ba tool MỞ CỬA, không đẻ chức năng ────────────────
  // User chốt 2026-08-27: *"mọi chức năng đã có sẵn trên zemory hết rồi, MCP chỉ là điều
  // khiển và quản lý"*. Nên cả ba chỉ delegate: `scan()` · CLI `memory embed --all` ·
  // bốn nguồn trạng thái đã có. Không tool nào cài thêm logic nạp/nhúng.
  {
    name: "memory_jobs",
    description:
      "What zemory is doing RIGHT NOW: daemon alive, background job running, embed backlog, who holds the write "
      + "lock. WHEN TO CALL: before memory_scan/memory_embed (they refuse while another writer holds the store, and "
      + "this says who) · when a search returns less than expected and you suspect ingest is behind · when the user "
      + "asks why zemory feels slow. Read-only, and fast because it reads the daemon's cached numbers (~100ms) "
      + "rather than recounting. Facts only the daemon knows come back as \"unknown\" when the daemon is down — that "
      + "is NOT the same as \"nothing is running\", and this tool will never pretend it is. Same for the embed "
      + "backlog: with the daemon down it is reported as not-counted rather than guessed, because counting it "
      + "directly is a full table scan (measured ~16s on a 300k-message store). Pass deep=true to pay that cost.",
    inputSchema: {
      type: "object",
      properties: {
        deep: { type: "boolean", description: "Count the embed backlog directly instead of reading the daemon's cache. Accurate but slow (~16s on a large store)." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "memory_scan",
    description:
      "Ingest new conversations into the store: agent transcripts on disk, and optionally web chats (ChatGPT / "
      + "Claude.ai). WHEN TO CALL: when the user says something recent is missing from memory, or right before a "
      + "recall that must include today's work — the daemon already scans on its own about every 30 minutes, so do "
      + "NOT call this routinely. Runs INLINE and can take a while (deep=true walks the whole machine). REFUSES with "
      + "`busy` instead of fighting for the lock when another writer is active — call memory_jobs to see who. "
      + "web=true may need the user: if a platform comes back `need-login`, a browser window is ALREADY OPEN waiting "
      + "for them — say so immediately and name the platform, do not sit silent or report it as a failure.",
    inputSchema: {
      type: "object",
      properties: {
        deep: { type: "boolean", description: "Walk the whole machine for agent stores, not just known ones. Much slower; first run only." },
        web: { type: "boolean", description: "Also pull web chats for platforms already set up on this machine. Opens a browser window; may return need-login." },
        platform: { type: "string", description: "Limit the web pass to one platform ('chatgpt' or 'claude'). Ignored unless web=true." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "memory_embed",
    description:
      "START the semantic (vector) indexing of messages that do not have one yet, then RETURN IMMEDIATELY — it "
      + "does not wait, because at roughly 58 messages/minute a backlog of a few thousand runs for an hour and no "
      + "tool call survives that. WHEN TO CALL: after a large memory_scan or import, when memory_jobs shows a big "
      + "embed backlog and the user wants semantic recall to cover it now. Otherwise leave it alone: the daemon "
      + "already drains the backlog on its own schedule. Returns the job pid and an ETA; poll memory_jobs to watch "
      + "the backlog fall. REFUSES with `busy` when another writer is active — two embed passes on one store is a "
      + "known way to corrupt it, so this never starts a second one.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "graph_impact",
    description:
      "Blast radius of ONE file: who imports it, who it imports, how far a change reaches. WHEN TO CALL: BEFORE "
      + "editing a file you did not write, to find out what breaks — this answers 'if I change X, who is affected', "
      + "which memory_search (what happened) and plan_search (what was designed) cannot. ADVISORY ONLY: it never "
      + "blocks an edit, it hands you the facts. Ambiguous name returns candidates instead of guessing.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Repo-relative path or a suffix of it (e.g. 'memory/db.ts')." },
        project: { type: "string", description: "Project root; defaults to the current project." },
      },
      required: ["file"],
      additionalProperties: false,
    },
  },
  {
    name: "graph_neighbors",
    description:
      "Immediate neighbours of one file in the code graph, one line each. WHEN TO CALL: to walk the structure "
      + "cheaply instead of opening several files — each hop costs a line, not a file read. Use graph_impact when "
      + "you need reach and hub status rather than just the adjacent nodes.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Repo-relative path or a suffix of it." },
        direction: { type: "string", description: "'in' (importers) · 'out' (imports) · 'both' (default)." },
        limit: { type: "number", description: "Max neighbours per direction, default 20, max 100." },
        project: { type: "string", description: "Project root; defaults to the current project." },
      },
      required: ["file"],
      additionalProperties: false,
    },
  },
];

export async function callMcpTool(name: string, args: JsonObject = {}, env: McpEnv = {}) {
  if (name === "memory_search") {
    const query = asString(args.query).trim();
    if (!query) return errorResult("memory_search requires a non-empty query.");
    // Mặc định: FTS + vector (hybrid), KHÔNG rerank. Đo trong tiến trình ĐÃ ẤM trên kho
    // 198.334 tin: FTS 172ms · hybrid **746ms** · hybrid+rerank **29.420ms**. Trước đây tool
    // này gọi `recall()` nên ăn theo công tắc rerank của máy — đo thật qua MCP: **27–34s MỖI
    // lần tìm**, không chỉ lần đầu. Agent gọi search liên tục, nên đó là thuế khổng lồ để
    // đổi lấy thứ chưa chứng minh được: trên corpus gate có nhãn, rerank 8/8 = hybrid 8/8.
    // `deep=true` khi agent thật sự cần xếp hạng kỹ hơn — nó tự chọn, có số để chọn.
    // `also`: cách diễn đạt KHÁC của cùng câu hỏi, gộp bằng RRF (plan 17 §1.1). Đo trên
    // corpus 56 nhãn: `@10` 39% → 50%, `prose@40` **68% → 94%**. Giá: mỗi lối nói thêm là
    // một lượt tìm nữa (~0,9 s). Agent viết biến thể — điều 6②, lõi không sinh văn bản.
    const also = Array.isArray(args.also) ? args.also.map(asString).filter((s) => s.trim()) : [];
    const sOpts = {
      all: Boolean(args.all),
      project: currentProject(args, env),
      limit: clampLimit(args.limit, 12, 50),
      rerank: Boolean(args.deep),
      // `expand_duplicates:true` ⇒ TẮT gộp (liệt kê từng bản riêng). Mặc định gộp BẬT.
      ...(args.expand_duplicates ? { collapse: false } : {}),
      dbPath: env.dbPath,
    };
    const hits = also.length ? await searchMulti([query, ...also], sOpts) : await searchHybrid(query, sOpts);
    return toolResult(hits);
  }

  if (name === "memory_show") {
    const id = Number(args.id);
    if (!Number.isFinite(id) || id <= 0) return errorResult("memory_show requires a positive numeric id.");
    const window = clampWindow(args.window);
    const value = window > 0 ? getMessageContext(id, window, env.dbPath) : getMessage(id, env.dbPath);
    // memory_show is a drill-down WITHIN a recall already counted by memory_search;
    // not logged separately (same 'recall' feature) to avoid double-counting.
    return value ? toolResult(value) : errorResult(`No memory message #${id}.`);
  }

  if (name === "changelog_search") {
    const query = asString(args.query).trim();
    if (!query) return errorResult("changelog_search requires a non-empty query.");
    return toolResult(
      searchChangelog(query, {
        project: currentProject(args, env),
        limit: clampLimit(args.limit, 10, 50),
        dbPath: env.dbPath,
      }),
    );
  }

  if (name === "memory_context") {
    // Fail-open by design: no project resolved ⇒ say so, never throw. An agent calling
    // this at session start must not be blocked by a missing harness.
    const project = asString(args.project) || env.projectRoot || findProjectRoot();
    if (!project) return toolResult("No project resolved — nothing to summarise. Call project_current for details.");
    const card = recallCard(normalizeRoot(project), env.dbPath);
    return toolResult(card || "No sessions recorded for this project yet.");
  }

  if (name === "project_current") {
    const root = env.projectRoot ?? findProjectRoot();
    return toolResult({
      connected: Boolean(root),
      project_root: root ? normalizeRoot(root) : null,
      detected_from: env.projectRoot ? "caller" : root ? "cwd walk (docs/.harness.json)" : "none",
      note: root
        ? "Tools scope to this root unless you pass all=true."
        : "No docs/.harness.json found upward from cwd — searches fall back to the WHOLE memory.",
    });
  }

  if (name === "memory_stats") {
    return toolResult(memoryInfo(env.dbPath));
  }

  if (name === "memory_doctor") {
    // Chỉ-đọc, và cố ý PROBE thật: bản chỉ-đọc-công-tắc từng báo "on" cho một engine không
    // tải nổi model (sửa 2026-07-27). Một chẩn đoán nói dối còn tệ hơn không có chẩn đoán.
    const root = asString(args.project) || env.projectRoot || undefined;
    const s = await gatherStatus(root ?? undefined);
    const keys = doctorFeatureKeys(s.features.map((f) => f.key), Boolean(args.deep));
    const meta = new Map(s.features.map((f) => [f.key, f]));
    const features = await Promise.all(
      keys.map(async (key) => {
        const c = await runCheck(key, s.project.root ?? undefined);
        const f = meta.get(key);
        return { key, group: f?.group ?? "token", label: f?.label ?? key, state: c.state, ok: c.ok, detail: c.detail };
      }),
    );
    const missingDocs = s.docs.filter((d) => !d.ok).map((d) => d.file);
    return toolResult({
      project: { connected: s.project.connected, root: s.project.root, docs: s.project.docs },
      setup: s.setup,
      docs: { missing: missingDocs, ok: missingDocs.length === 0 },
      plan: s.plan,
      features,
      failing: features.filter((f) => !f.ok).map((f) => f.key),
      // Nói RÕ cái gì CHƯA được thử, thay vì để người đọc tưởng đã soi hết: một chẩn đoán
      // im lặng về phần mình bỏ qua chính là cách nó nói dối.
      notProbed: args.deep ? [] : [...DEEP_ONLY_CHECKS],
      hint: args.deep ? undefined : "Pass deep=true to actually load and exercise the vector/rerank engines (~30-60s).",
    });
  }

  if (name === "memory_conflicts") {
    const topic = asString(args.topic).trim();
    if (!topic) return errorResult("memory_conflicts requires a topic.");
    const r = await conflictCandidates(topic, {
      all: Boolean(args.all),
      project: currentProject(args, env),
      limit: clampLimit(args.limit, 20, 50),
      dbPath: env.dbPath,
    });
    // Nói rõ mức tin: đây là CẶP ĐÁNG NHÌN, không phải phán quyết. zemory không phán —
    // giữ đúng ranh giới điều 6 (script lọc, agent phán).
    return toolResult({
      ...r,
      note:
        r.candidates.length === 0
          ? "No decision-shaped pairs far enough apart in time. This is NOT proof the memory agrees with itself — only that this topic has no obvious pair."
          : "CANDIDATES ONLY — zemory did not judge these. Read both sides, decide if they truly conflict, and prefer the newer one unless it says otherwise.",
    });
  }

  if (name === "session_pin") {
    const sid = asString(args.session_id).trim();
    if (!sid) return errorResult("session_pin requires a session_id.");
    const on = args.on === undefined ? true : Boolean(args.on);
    const ok = pinSession(sid, on, env.dbPath);
    if (!ok) return errorResult(`No session "${sid}" — pin not applied. Check the id from memory_search.`);
    return toolResult({ session_id: sid, pinned: on, pinned_now: listPinned(undefined, env.dbPath).length });
  }

  if (name === "project_merge") {
    // Mặc định DRY RUN: đây là lệnh đổi dữ liệu, mà agent gọi tool thì không có ai gật ở
    // giữa. Muốn ghi thì phải nói apply=true một cách tường minh.
    const apply = Boolean(args.apply);
    const r = mergeSplitProjects({ apply, dbPath: env.dbPath });
    if (!r.groups.length) return toolResult({ split_groups: [], note: "No split projects found." });
    return toolResult({
      applied: r.applied,
      split_groups: r.groups,
      outcomes: r.outcomes,
      note: r.applied
        ? "Merged. Each session kept its original cwd; nothing was deleted."
        : "DRY RUN — nothing changed. Show these groups to the user, then call again with apply=true.",
    });
  }

  if (name === "plan_search") {
    const query = asString(args.query).trim();
    if (!query) return errorResult("plan_search requires a non-empty query.");
    const hits = searchSections(query, {
      project: currentProject(args, env),
      limit: clampLimit(args.limit, 10, 50),
      dbPath: env.dbPath,
    });
    return toolResult(hits);
  }

  if (name === "plan_show") {
    const id = Number(args.id);
    if (!Number.isFinite(id) || id <= 0) return errorResult("plan_show requires a positive numeric id.");
    const section = showSection(id, env.dbPath);
    return section ? toolResult(section) : errorResult(`No plan section #${id}.`);
  }

  // ── Ba tool ĐIỀU KHIỂN (plan 14) ───────────────────────────────────────────

  if (name === "memory_jobs") {
    // Đọc-thuần, KHÔNG qua write-gate: đây chính là thứ NÓI cho người gọi biết gate đang
    // bận hay rảnh. Bắt nó xin gate thì lúc bận nhất lại là lúc không hỏi được.
    // THỨ TỰ CÓ CHỦ ĐÍCH: hỏi `/ping` (rẻ) TRƯỚC `/memory-status` (có thể nặng).
    //
    // Bản đầu làm ngược và tự bắn vào chân mình — đo 2026-08-28: `/memory-status` lượt lạnh
    // mất 7,4 s và KHOÁ event loop của daemon suốt thời gian đó, nên `/ping` gửi ngay sau
    // xếp hàng phía sau rồi hết giờ ⇒ tool báo "daemon không trả lời" trong khi curl cùng
    // lúc ping được trong 110 ms. Nghĩa là chính phép đo đã tạo ra thứ nó đo.
    //
    // 2 s chứ không 600 ms: `/ping` đo được 85–183 ms lúc rảnh, nhưng daemon đang chạy job
    // nặng thì trả chậm hẳn — `06_CHANGES [2026-08-27b]` còn ghi một ca nghẽn ~4 phút sau
    // khởi động. Ngưỡng chặt biến "đang bận" thành "đã chết".
    const ping = await askDaemon<{ pid: number; version: string; host: string }>("/ping", 2000);
    const alive = ping !== null;
    const jobFresh = daemonJobBusyExternal();
    // Ba sự thật CHỈ daemon biết. Daemon chết ⇒ "unknown", KHÔNG phải false — luật
    // `02_RULES §Hành xử`: chưa xác minh được thì nói chưa xác minh được. Trả false ở đây
    // là đúng kiểu "vỏ rỗng trông như đang sống" mà luật §Bề mặt CHẾT THEO nền cấm.
    //
    // Hai endpoint RẺ này phải chạy TRƯỚC `embedBacklog` (đường `/memory-status`, lượt lạnh
    // 7,4 s và khoá event loop): đo 2026-08-28, đặt sau nó thì cả hai bị bỏ đói và tool in
    // "daemon not responding" ngay dưới dòng `alive:true`. Cùng một bài học hai lần trong
    // một lượt — thứ tự hỏi LÀ một phần của phép đo, không phải chi tiết sắp xếp.
    const automation = alive ? await askDaemon<{ embedRunning: boolean; scheduler: boolean; autosync: boolean }>("/automation", 2000) : null;
    const sync = alive ? await askDaemon<Record<string, unknown>>("/sync-status", 2000) : null;
    const backlog = await embedBacklog(env.dbPath, Boolean(args.deep));
    const held = cliWriteHolder();
    // Phân biệt HAI kiểu không-biết. Gộp chúng lại là nói dối một nửa: "daemon not
    // responding" in ra cạnh `alive:true` thì người đọc không biết tin dòng nào.
    const UNKNOWN = alive ? "unknown — daemon is alive but did not answer in time" : "unknown — daemon not responding";
    return toolResult({
      // KHÔNG trả lời ≠ ĐÃ CHẾT. Marker job của daemon còn tươi mà `/ping` im thì suy ra
      // "daemon chết" là một câu SAI và tự mâu thuẫn với chính dòng `daemonJobRunning:true`
      // ngay dưới — đo được đúng cặp đó lúc nghiệm thu 2026-08-28, và nó là lý do có nhánh
      // thứ ba này thay vì một cờ nhị phân.
      daemon: alive
        ? { alive: true, pid: ping.pid, version: ping.version, host: ping.host }
        : { alive: jobFresh ? "unknown — not answering, but a background job marker is fresh (busy, not dead)" : false },
      writeLock: held ? { holder: held.label, pid: held.pid, store: held.db, since: new Date(held.at).toISOString() } : null,
      daemonJobRunning: jobFresh,
      embedBacklog: backlog.value,
      embedBacklogSource: backlog.source,
      embedRunning: automation ? automation.embedRunning : UNKNOWN,
      scheduler: automation ? automation.scheduler : UNKNOWN,
      autosync: automation ? automation.autosync : UNKNOWN,
      sync: sync ?? UNKNOWN,
      canWriteNow: writeBusy() === null,
      note: alive
        ? undefined
        : (jobFresh
            ? "The daemon did not answer within 2s but a background job marker is fresh — it is most likely ALIVE and "
              + "busy, not dead. Treat its fields as unknown, not as zero. "
            : "The daemon is not answering, so anything only it knows is reported as unknown rather than guessed. ")
          + "Scans/embeds still work from here (they fall back to direct access), and `writeLock` + "
          + "`daemonJobRunning` are read from files so they stay trustworthy.",
    });
  }

  if (name === "memory_scan") {
    const busy = writeBusy();
    if (busy) return busyResult("memory_scan", busy);
    // Khoá XUYÊN TIẾN TRÌNH: hai kẻ ghi cùng kho là nguyên nhân hỏng kho HAI LẦN (03+04/08,
    // sinh ra HP điều 11). `acquireCliWriteLock` TỪ CHỐI khi tiến trình khác đang giữ —
    // khác hẳn `acquireCliWrite` đời cũ vốn không bao giờ từ chối.
    const lock = acquireCliWriteLock("mcp memory_scan");
    if (!lock.ok) return busyResult("memory_scan", `${lock.heldBy?.label} (pid ${lock.heldBy?.pid})`);
    try {
      const report = scan({ deep: Boolean(args.deep), dbPath: env.dbPath });
      // Quét đĩa TRƯỚC rồi mới tới web — phần web mở trình duyệt và có thể dừng hỏi đăng
      // nhập, nhưng kết quả quét đĩa thì người dùng phải nhận được trong MỌI trường hợp.
      const platform = asString(args.platform).trim();
      // Agent gọi qua MCP ⇒ kéo NGẦM: không có người ngồi trước màn hình để đăng nhập, mở cửa sổ là mở vào khoảng không.
      const web = args.web ? await scanWebPlatforms(platform ? [platform] : undefined, undefined, { hidden: true }) : undefined;
      const needLogin = (web ?? []).filter((r) => r.status === "need-login");
      return toolResult({
        ok: true,
        deep: report.deep,
        scannedFiles: report.scannedFiles,
        changedFiles: report.changedFiles,
        totals: report.totals,
        // Lane bị loại phải HIỆN RA — cắt âm thầm là cách bộ nhớ thiếu mà không ai biết.
        skippedLanes: report.skippedLanes,
        unknownStores: report.unknown,
        web,
        // Không đứng im khi trình duyệt đang chờ: đây là việc của NGƯỜI, và tool là chỗ
        // duy nhất biết cửa sổ đã mở. Không nói ra thì user ngồi đợi một thứ đang đợi họ.
        action_required: needLogin.length
          ? `A browser window is OPEN and waiting for the user to sign in: ${needLogin
              .map((r) => `${r.platform}${r.account && r.account !== "main" ? `#${r.account}` : ""}`)
              .join(" · ")}. Tell them NOW, then call memory_scan again with web=true once they are signed in.`
          : undefined,
      });
    } finally {
      releaseCliWriteLock();
    }
  }

  if (name === "memory_embed") {
    const busy = writeBusy();
    if (busy) return busyResult("memory_embed", busy);
    // Cache của daemon là đủ để quyết "có việc hay không": nó cũ nhiều nhất vài phút, còn
    // đếm thẳng mất ~16 s cho một quyết định nhị phân. Không hỏi được daemon ⇒ mới đếm thật,
    // vì ở đây con số PHẢI có: phóng một job giữ khoá ghi hàng giờ mà không có việc là chặn
    // mọi lượt quét để đổi lấy con số không.
    const backlog = await embedBacklog(env.dbPath);
    const remaining = typeof backlog.value === "number" ? backlog.value : await embedBacklog(env.dbPath, true).then((b) => b.value);
    if (typeof remaining !== "number") return errorResult(`memory_embed could not count the backlog: ${remaining}`);
    if (remaining === 0) {
      return toolResult({ ok: true, started: false, remaining: 0, source: backlog.source, note: "Nothing to embed — every message already has a vector." });
    }
    // PHÓNG RỒI TRẢ NGAY. Ba ràng buộc, mỗi cái có lý do đã trả giá:
    //  · KHÔNG cầm khoá ở đây — con là một CLI bình thường, nó tự xin khoá; cầm hộ là để
    //    nó chờ chính mình (đúng bug `ZEMORY_DAEMON_CHILD` sinh ra để tránh).
    //  · `detached` + `unref` ⇒ job sống qua phiên agent (plan 19 §3: hai job dài từng
    //    chết theo console ngày 10/08).
    //  · `stdio: ignore` vì không ai đọc — tiến độ đọc bằng `memory_jobs`, không bằng log.
    let pid: number | undefined;
    try {
      const child = spawn(process.execPath, [cliEntry(), "memory", "embed", "--all"], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env: { ...process.env, ...(env.dbPath ? { GLOBAL_MEMORY_DB: env.dbPath } : {}) },
      });
      child.unref();
      pid = child.pid;
    } catch (e) {
      return errorResult(`memory_embed could not start the job: ${e instanceof Error ? e.message : "spawn failed"}`);
    }
    // ~58 tin/phút đo trên máy này. Nêu ước lượng để agent biết đây là hàng GIỜ, không phải
    // hàng giây — và nói rõ nó là ước lượng, không phải cam kết (điều 12).
    const etaMin = Math.max(1, Math.round(remaining / 58));
    return toolResult({
      ok: true,
      started: true,
      pid,
      remaining,
      etaMinutes: etaMin,
      note: `Embedding ${remaining} message(s) in a detached background job — this call did NOT wait for it. `
        + `Rough estimate ${etaMin} minute(s) at ~58 messages/minute measured on this machine; treat it as an `
        + "order of magnitude, not a promise. Call memory_jobs to watch `embedBacklog` fall. The job survives "
        + "this session, and it takes the write lock itself, so scans will report busy while it runs.",
    });
  }

  // ── Graph (plan 13 §5) — bản MIRROR của `zemory graph impact` cho host nói MCP.
  //
  // Vì sao mãi tới giờ mới nối: hệ agent của user lái TERMINAL, nên CLI là đường giao hàng
  // chính và MCP chỉ là gương (plan 13 §9). Nhưng "không ai dùng" khác "không nối được" —
  // `mcp.ts` 0 match `graph` là một khoảng trống thật, và nó khiến host nào CÓ nối MCP thì
  // mất hẳn lớp blast-radius. Hai tool này KHÔNG chặn sửa file (quyền thuộc host, HP điều
  // 10) — chúng chỉ đưa dữ kiện, đúng vai "cổng TƯ VẤN".
  if (name === "graph_impact" || name === "graph_neighbors") {
    const file = asString(args.file).trim();
    if (!file) return errorResult(`${name} requires a non-empty file.`);
    const root = currentProject(args, env);
    if (!root) return errorResult(`${name} needs a project root (pass project=, or run inside a project).`);
    let impact;
    try {
      const { graph } = await getCodeGraph(root);
      impact = fileImpact(graph, file);
    } catch (error) {
      // Fail-open (điều 9): graph hỏng/thiếu không được làm chết cả phiên MCP.
      return errorResult(`graph unavailable for ${root}: ${error instanceof Error ? error.message : "build failed"}`);
    }
    if (!impact.file) {
      return impact.candidates.length
        ? errorResult(`"${file}" is ambiguous — did you mean: ${impact.candidates.join(" · ")}`)
        : errorResult(`No file matching "${file}" in the code graph of ${root}.`);
    }
    if (name === "graph_impact") return toolResult(impact);

    const dir = asString(args.direction).trim() || "both";
    const cap = clampLimit(args.limit, 20, 100);
    return toolResult({
      file: impact.file,
      isHub: impact.isHub,
      ...(dir === "out" ? {} : { importedBy: impact.importers.slice(0, cap), fanIn: impact.fanIn }),
      ...(dir === "in" ? {} : { imports: impact.imports.slice(0, cap), fanOut: impact.fanOut }),
    });
  }

  return errorResult(`Unknown zemory MCP tool: ${name}`);
}
