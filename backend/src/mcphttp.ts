// MCP over HTTP — bề mặt thứ hai của CÙNG bộ tool (`tools/index.ts`), cho agent không
// spawn được tiến trình con: chạy trong máy ảo/sandbox, hoặc host chỉ nói HTTP.
//
// Vì sao cần (đối chiếu engram 2026-08-02): engram có `serve`, zemory chỉ stdio — stdio đòi
// host phải khởi được tiến trình `zemory` trên CÙNG máy. Agent nào không làm được thì coi
// như zemory không tồn tại.
//
// KHÔNG có tool nào mới ở đây: cùng `handleMcpRequest`, chỉ đổi lớp chuyên chở. Thêm tool
// vào một transport mà transport kia không có là đúng thứ làm sổ nói khác code.
//
// GIỚI HẠN, nói thẳng để không ai kỳ vọng sai: server bind LOOPBACK (HP điều 7 — dữ liệu
// không rời máy). Container Docker mặc định KHÔNG với tới `127.0.0.1` của host: phải chạy
// `--network host`, hoặc map cổng, hoặc để agent nói qua một chặng chuyển tiếp trên host.
// Bind ra ngoài loopback là mở kho nhớ ra mạng — không làm mặc định, và không lén làm.

import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleMcpRequest } from "./mcp.js";
import { checkLoopback } from "./util/loopback.js";

export const DEFAULT_MCP_HTTP_PORT = 4445; // 4444 là daemon UI; cạnh nhau cho dễ nhớ

const MAX_BODY = 1_000_000; // JSON-RPC của MCP là tin nhắn nhỏ; chặn ở đây để không ai nhồi RAM

function send(res: ServerResponse, code: number, body: unknown): void {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(code, {
    "content-type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json",
    "content-length": Buffer.byteLength(text),
  });
  res.end(text);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export async function handleHttpMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const guard = checkLoopback(req);
  if (!guard.ok) return send(res, 403, `forbidden (${guard.why})`);

  const path = (req.url ?? "/").split("?")[0];
  if (req.method === "GET" && (path === "/ping" || path === "/")) {
    return send(res, 200, { app: "zemory-mcp", transport: "http", pid: process.pid });
  }
  if (req.method !== "POST") return send(res, 405, "use POST /mcp with a JSON-RPC body");
  if (path !== "/mcp" && path !== "/") return send(res, 404, "not found (POST /mcp)");

  let text: string;
  try {
    text = await readBody(req);
  } catch {
    return send(res, 413, "body too large");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return send(res, 200, {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: err instanceof Error ? err.message : "Parse error." },
    });
  }
  // Batch: MCP cho phép gửi mảng. Trả mảng đúng thứ tự, bỏ các phần tử là notification
  // (handleMcpRequest trả undefined) — y hệt đường stdio, không đẻ ngữ nghĩa riêng.
  if (Array.isArray(parsed)) {
    const out = (await Promise.all(parsed.map((m) => handleMcpRequest(m)))).filter((r) => r !== undefined);
    return out.length ? send(res, 200, out) : send(res, 202, "");
  }
  const response = await handleMcpRequest(parsed as Parameters<typeof handleMcpRequest>[0]);
  // Notification (`notifications/*`) không có phản hồi ⇒ 202, KHÔNG phải body rỗng 200:
  // client chờ JSON mà nhận chuỗi rỗng sẽ báo lỗi parse ở phía nó.
  return response ? send(res, 200, response) : send(res, 202, "");
}

export async function runMcpHttp(port = DEFAULT_MCP_HTTP_PORT): Promise<void> {
  const server = createServer((req, res) => {
    void handleHttpMcp(req, res).catch(() => send(res, 500, "internal error"));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  console.error(`zemory mcp — HTTP transport on http://127.0.0.1:${port}/mcp (loopback only)`);
  await new Promise<void>(() => {}); // chạy tới khi bị dừng
}
