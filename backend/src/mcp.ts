// MCP stdio SURFACE (thin, per 03_STRUCTURE §2 "surface/entry MỎNG"): JSON-RPC
// framing (line- and Content-Length-delimited) over stdin/stdout. Tool
// DEFINITIONS + binding live in ./tools/ — this file only ships them.

import { stdin, stdout } from "node:process";
import { TOOLS, asString, callMcpTool, type JsonObject, type McpEnv } from "./tools/index.js";

export { callMcpTool } from "./tools/index.js";

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

const PROTOCOL_VERSION = "2024-11-05";

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
