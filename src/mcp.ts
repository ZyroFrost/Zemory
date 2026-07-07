import { stdin, stdout } from "node:process";
import { findProjectRoot } from "./core/config.js";
import { getMessage, getMessageContext, recall } from "./brain/search.js";
import { logRecall } from "./brain/savings.js";
import { searchSections, showSection } from "./docs/plan.js";

type JsonObject = Record<string, unknown>;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: JsonObject;
}

interface ToolCall {
  name?: string;
  arguments?: JsonObject;
}

interface McpEnv {
  dbPath?: string;
  projectRoot?: string | null;
}

const PROTOCOL_VERSION = "2024-11-05";

const clampLimit = (n: unknown, fallback: number, max: number): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : fallback;
  return Math.max(1, Math.min(max, v));
};

const clampWindow = (n: unknown): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : 0;
  return Math.max(0, Math.min(10, v));
};

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

const currentProject = (args: JsonObject, env: McpEnv): string | undefined => {
  if (args.all) return undefined;
  if (env.projectRoot === null) return undefined;
  // No harness in cwd is NOT an error: zemory is installed machine-wide, so
  // recall falls back to the whole global brain instead of scoping to cwd.
  return asString(args.project) || env.projectRoot || findProjectRoot() || undefined;
};

const jsonText = (value: unknown): string => JSON.stringify(value, null, 2);

function toolResult(value: unknown) {
  return { content: [{ type: "text", text: typeof value === "string" ? value : jsonText(value) }] };
}

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text", text: message }] };
}

const TOOLS = [
  {
    name: "brain_search",
    description: "Search the local cross-agent global brain. Returns lightweight hits; call brain_show for full text.",
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
    name: "brain_show",
    description: "Show one full brain message by id, optionally with neighbouring conversation messages.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Message id returned by brain_search." },
        window: { type: "number", description: "Neighbour messages on each side. Default 0, max 10." },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "plan_search",
    description: "Search DB-source project docs/plan sections. Returns section ids; call plan_show for full section text.",
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
    description: "Show one DB-source plan/doc section by id.",
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
  if (name === "brain_search") {
    const query = asString(args.query).trim();
    if (!query) return errorResult("brain_search requires a non-empty query.");
    const hits = await recall(query, {
      all: Boolean(args.all),
      project: currentProject(args, env),
      limit: clampLimit(args.limit, 12, 50),
      dbPath: env.dbPath,
    });
    logRecall(hits, query, env.dbPath); // agent recall via MCP → log token-savings estimate
    return toolResult(hits);
  }

  if (name === "brain_show") {
    const id = Number(args.id);
    if (!Number.isFinite(id) || id <= 0) return errorResult("brain_show requires a positive numeric id.");
    const window = clampWindow(args.window);
    const value = window > 0 ? getMessageContext(id, window, env.dbPath) : getMessage(id, env.dbPath);
    return value ? toolResult(value) : errorResult(`No brain message #${id}.`);
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

function success(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function failure(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

export async function handleMcpRequest(req: JsonRpcRequest, env: McpEnv = {}) {
  const id = req.id;
  const method = req.method;
  if (!method) return failure(id, -32600, "Invalid JSON-RPC request.");

  if (method === "initialize") {
    return success(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "zemory", version: "0.0.1" },
    });
  }
  if (method === "ping") return success(id, {});
  if (method === "tools/list") return success(id, { tools: TOOLS });
  if (method === "tools/call") {
    const call = (req.params ?? {}) as ToolCall;
    return success(id, await callMcpTool(asString(call.name), call.arguments ?? {}, env));
  }

  if (method.startsWith("notifications/")) return undefined;
  return failure(id, -32601, `Unsupported MCP method: ${method}`);
}

type WireMode = "line" | "header";

class McpWire {
  private buffer = Buffer.alloc(0);
  private mode: WireMode | null = null;

  constructor(
    private readonly write: (msg: JsonObject, mode: WireMode) => void,
    private readonly env: McpEnv = {},
  ) {}

  async push(chunk: Buffer): Promise<void> {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const frame = this.nextFrame();
      if (!frame) break;
      let response: JsonObject | undefined;
      try {
        response = await handleMcpRequest(JSON.parse(frame.text) as JsonRpcRequest, this.env);
      } catch (err) {
        response = failure(null, -32700, err instanceof Error ? err.message : "Parse error.");
      }
      if (response) this.write(response, frame.mode);
    }
  }

  private nextFrame(): { text: string; mode: WireMode } | null {
    const s = this.buffer.toString("utf8");
    if (s.startsWith("Content-Length:")) {
      this.mode = "header";
      const end = s.indexOf("\r\n\r\n");
      if (end < 0) return null;
      const header = s.slice(0, end);
      const len = Number(/Content-Length:\s*(\d+)/i.exec(header)?.[1]);
      if (!Number.isFinite(len)) throw new Error("Invalid Content-Length frame.");
      const bodyStart = Buffer.byteLength(s.slice(0, end + 4));
      if (this.buffer.length < bodyStart + len) return null;
      const body = this.buffer.subarray(bodyStart, bodyStart + len).toString("utf8");
      this.buffer = this.buffer.subarray(bodyStart + len);
      return { text: body, mode: "header" };
    }

    this.mode ??= "line";
    const nl = s.indexOf("\n");
    if (nl < 0) return null;
    const line = s.slice(0, nl).trim();
    this.buffer = this.buffer.subarray(Buffer.byteLength(s.slice(0, nl + 1)));
    return line ? { text: line, mode: this.mode } : this.nextFrame();
  }
}

function writeMessage(msg: JsonObject, mode: WireMode): void {
  const text = JSON.stringify(msg);
  if (mode === "header") {
    stdout.write(`Content-Length: ${Buffer.byteLength(text, "utf8")}\r\n\r\n${text}`);
  } else {
    stdout.write(`${text}\n`);
  }
}

export async function runMcpStdio(): Promise<void> {
  const wire = new McpWire(writeMessage);
  stdin.on("data", (chunk) => void wire.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  await new Promise<void>((resolve) => stdin.on("end", resolve));
}
