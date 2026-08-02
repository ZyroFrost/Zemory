// MCP over HTTP — bề mặt THỨ HAI của cùng bộ tool. Hai thứ phải luôn đúng:
//   · PARITY: hai transport ship y hệt một danh sách tool. Lệch nhau là agent dùng đường
//     này thấy tool, đường kia không — kiểu lỗi chỉ lộ ra ở máy người dùng.
//   · Guard loopback còn nguyên: server này mở cổng ra máy, và nó nói chuyện với kho nhớ.

import assert from "node:assert/strict";
import test from "node:test";
import { createServer, request as httpRequest } from "node:http";
import { handleHttpMcp } from "../../dist/mcphttp.js";
import { handleMcpRequest } from "../../dist/mcp.js";
import { TOOLS } from "../../dist/tools/index.js";

async function withServer(fn) {
  const server = createServer((req, res) => void handleHttpMcp(req, res));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  try {
    return await fn(`http://127.0.0.1:${port}`, port);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

const rpc = (url, body, headers = {}) =>
  fetch(`${url}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

test("HTTP ship ĐÚNG bộ tool của stdio — không transport nào được đi riêng", async () => {
  await withServer(async (url) => {
    const res = await rpc(url, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    assert.equal(res.status, 200);
    const body = await res.json();
    const overHttp = body.result.tools.map((t) => t.name);
    const overStdio = (await handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" })).result.tools.map(
      (t) => t.name,
    );
    assert.deepEqual(overHttp, overStdio, "hai transport phải cùng một danh sách");
    assert.deepEqual(overHttp, TOOLS.map((t) => t.name));
  });
});

test("initialize trả đúng danh tính server", async () => {
  await withServer(async (url) => {
    const body = await (await rpc(url, { jsonrpc: "2.0", id: 7, method: "initialize" })).json();
    assert.equal(body.id, 7);
    assert.equal(body.result.serverInfo.name, "zemory");
    assert.ok(body.result.protocolVersion);
  });
});

// `fetch` KHÔNG cho ghi đè header `Host` (undici tự đặt theo URL) — bản đầu của test này
// dùng fetch và XANH GIẢ: server nhận Host thật nên guard không hề bị thử. Phải xuống
// `node:http` mới giả được đúng trang DNS-rebinding.
const rawPost = (port, headers, body) =>
  new Promise((resolve, reject) => {
    const req = httpRequest(
      { host: "127.0.0.1", port, path: "/mcp", method: "POST", headers: { "content-type": "application/json", ...headers } },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => resolve({ status: res.statusCode, text }));
      },
    );
    req.on("error", reject);
    req.end(JSON.stringify(body));
  });

test("Host không phải loopback ⇒ 403 (chống DNS-rebinding)", async () => {
  await withServer(async (_url, port) => {
    const sane = await rawPost(port, {}, { jsonrpc: "2.0", id: 1, method: "ping" });
    assert.equal(sane.status, 200, "đường bình thường phải chạy — không thì phép thử dưới vô nghĩa");
    const evil = await rawPost(port, { host: "evil.example.com" }, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    assert.equal(evil.status, 403);
  });
});

test("request cross-site ⇒ 403 kể cả khi Host hợp lệ", async () => {
  await withServer(async (url) => {
    const res = await rpc(url, { jsonrpc: "2.0", id: 1, method: "tools/list" }, { "sec-fetch-site": "cross-site" });
    assert.equal(res.status, 403);
  });
});

test("JSON hỏng ⇒ lỗi JSON-RPC đúng khuôn, KHÔNG sập server", async () => {
  await withServer(async (url) => {
    const body = await (await rpc(url, "{ khong phai json")).json();
    assert.equal(body.error.code, -32700);
    // server vẫn sống sau đó
    const ok = await (await rpc(url, { jsonrpc: "2.0", id: 2, method: "ping" })).json();
    assert.equal(ok.id, 2);
  });
});

test("notification không có phản hồi ⇒ 202, không trả body rỗng kiểu 200", async () => {
  await withServer(async (url) => {
    const res = await rpc(url, { jsonrpc: "2.0", method: "notifications/initialized" });
    assert.equal(res.status, 202, "200 với body rỗng làm client báo lỗi parse");
  });
});

test("GET /ping nhận diện được tiến trình", async () => {
  await withServer(async (url) => {
    const body = await (await fetch(`${url}/ping`)).json();
    assert.equal(body.app, "zemory-mcp");
    assert.equal(body.transport, "http");
    assert.equal(typeof body.pid, "number");
  });
});

test("gọi thật một tool qua HTTP", async () => {
  await withServer(async (url) => {
    const body = await (
      await rpc(url, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "project_current", arguments: {} } })
    ).json();
    const payload = JSON.parse(body.result.content[0].text);
    assert.equal(typeof payload.connected, "boolean", "project_current không bao giờ được lỗi");
  });
});
