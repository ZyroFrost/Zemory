// LLM-facing tool DEFINITIONS + binding (03_STRUCTURE §3 `tools/`): the four
// recall tools an agent can call, each schema + a thin dispatcher that
// delegates execution to the owning slots (memory/search, docs/plan). The MCP
// JSON-RPC surface that ships these over stdio lives in ../mcp.ts — keep wire
// framing OUT of here and tool knowledge OUT of the surface.

import { findProjectRoot, normalizeRoot } from "../core/config.js";
import { getMessage, getMessageContext, recall } from "../memory/search.js";
import { searchSections, showSection } from "../docs/plan.js";
import { searchChangelog } from "../docs/changelog.js";
import { recallCard } from "../memory/recall.js";
import { memoryInfo } from "../memory/ingest.js";

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
      "Search the local cross-agent global memory (hybrid keyword+semantic). Returns lightweight hits; call memory_show for full text. " +
      "Grade the hits before trusting them: if they do not actually answer the question, rewrite the query — synonyms, a different phrasing, " +
      "or the other language in a bilingual workspace — and search again (up to 2 rewrites) before concluding the memory has nothing.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query." },
        all: { type: "boolean", description: "Search all projects instead of the current project." },
        project: { type: "string", description: "Project root to scope search to; ignored when all=true." },
        limit: { type: "number", description: "Maximum hits, default 12, max 50." },
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
      + "to re-explain context. Cheap and read-only. For a specific question use memory_search instead.",
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
];

export async function callMcpTool(name: string, args: JsonObject = {}, env: McpEnv = {}) {
  if (name === "memory_search") {
    const query = asString(args.query).trim();
    if (!query) return errorResult("memory_search requires a non-empty query.");
    const hits = await recall(query, {
      all: Boolean(args.all),
      project: currentProject(args, env),
      limit: clampLimit(args.limit, 12, 50),
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

  return errorResult(`Unknown zemory MCP tool: ${name}`);
}
