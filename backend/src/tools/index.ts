// LLM-facing tool DEFINITIONS + binding (03_STRUCTURE §3 `tools/`): the four
// recall tools an agent can call, each schema + a thin dispatcher that
// delegates execution to the owning slots (memory/search, docs/plan). The MCP
// JSON-RPC surface that ships these over stdio lives in ../mcp.ts — keep wire
// framing OUT of here and tool knowledge OUT of the surface.

import { findProjectRoot } from "../core/config.js";
import { getMessage, getMessageContext, recall } from "../memory/search.js";
import { searchSections, showSection } from "../docs/plan.js";

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
  return asString(args.project) || env.projectRoot || findProjectRoot() || undefined;
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
    description: "Show one full memory message by id, optionally with neighbouring conversation messages.",
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
    name: "plan_search",
    description: "Search project docs/plan sections (search index). Returns section ids; call plan_show for full section text.",
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
    description: "Show one plan/doc section by id.",
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
