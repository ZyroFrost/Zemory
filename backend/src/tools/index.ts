// LLM-facing tool DEFINITIONS + binding (03_STRUCTURE §3 `tools/`): the four
// recall tools an agent can call, each schema + a thin dispatcher that
// delegates execution to the owning slots (memory/search, docs/plan). The MCP
// JSON-RPC surface that ships these over stdio lives in ../mcp.ts — keep wire
// framing OUT of here and tool knowledge OUT of the surface.

import { findProjectRoot, normalizeRoot } from "../core/config.js";
import { getCodeGraph } from "../memory/graph/graph-cache.js";
import { fileImpact } from "../memory/graph/graph.js";
import { getMessage, getMessageContext, searchHybrid } from "../memory/search.js";
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
      "~40x slower (tens of seconds) and has never beaten plain hybrid on this repo's labelled benchmark — a last resort, not a better default.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query." },
        all: { type: "boolean", description: "Search all projects instead of the current project." },
        project: { type: "string", description: "Project root to scope search to; ignored when all=true." },
        limit: { type: "number", description: "Maximum hits, default 12, max 50." },
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
    const hits = await searchHybrid(query, {
      all: Boolean(args.all),
      project: currentProject(args, env),
      limit: clampLimit(args.limit, 12, 50),
      rerank: Boolean(args.deep),
      dbPath: env.dbPath,
    });
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
