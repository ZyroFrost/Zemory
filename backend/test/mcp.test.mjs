import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { openMemory } from "../../dist/memory/db.js";
import { importDoc } from "../../dist/docs/plan.js";
import { callMcpTool, handleMcpRequest } from "../../dist/mcp.js";
import { TOOLS } from "../../dist/tools/index.js";
import { tempDir } from "./helpers.mjs";

function seedMcpDb(t) {
  const root = tempDir(t, "zemory-mcp-");
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  const dbPath = join(root, "memory.db");
  const db = openMemory(dbPath);
  try {
    db.prepare("INSERT INTO sessions(id, source, project_root, message_count) VALUES (?,?,?,?)").run(
      "mcp-session",
      "codex",
      root,
      1,
    );
    db.prepare("INSERT INTO messages(session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run(
      "mcp-session",
      "mcp-message",
      "user",
      "remember the brass compass calibration note",
      "2026-06-29T00:00:00Z",
    );
  } finally {
    db.close();
  }
  const rel = join("docs", "plan", "mcp.md");
  writeFileSync(join(root, rel), "# MCP Notes\n\nThe recall server exposes memory_search and plan_search tools.\n");
  importDoc(join(root, rel), rel, root, "plan", dbPath);
  return { projectRoot: root, dbPath };
}

function textPayload(result) {
  return JSON.parse(result.content[0].text);
}

test("MCP tool list exposes recall tools", async () => {
  const res = await handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.equal(res.id, 1);
  const names = res.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, [
    "memory_search",
    "memory_show",
    "changelog_search",
    "memory_context",
    "project_current",
    "memory_stats",
    "plan_search",
    "plan_show",
  ]);
});

test("mỗi tool phải nói KHI NÀO gọi, không chỉ nói nó là gì", () => {
  // Bài học lấy từ engram (đo 2026-08-02): mô tả tool là thứ DUY NHẤT quyết định agent có
  // gọi hay không — y hệt `description` của một SKILL.md. zemory bắt mọi skill phải có, mà
  // quên áp cho chính tool MCP của mình: "Show one plan/doc section by id." đúng nhưng
  // không bảo agent lúc nào thì cần tới nó.
  const weak = TOOLS.filter((t) => {
    const d = (t.description ?? "").toLowerCase();
    return d.length < 80 || !/(when to call|use this|call this|before |after )/.test(d);
  });
  assert.deepEqual(
    weak.map((t) => t.name),
    [],
    "mô tả phải nêu tình huống gọi (WHEN TO CALL / use this when …), không phải chỉ định nghĩa",
  );
});

test("tool chỉ-đọc để dò tình trạng thì KHÔNG được đòi tham số", () => {
  // project_current/memory_stats là lối thoát khi agent không chắc đang ở đâu. Bắt truyền
  // tham số thì đúng lúc cần nhất lại không gọi được (engram ghi thẳng "NEVER errors").
  for (const name of ["project_current", "memory_stats"]) {
    const tool = TOOLS.find((t) => t.name === name);
    assert.ok(tool, `thiếu tool ${name}`);
    assert.deepEqual(tool.inputSchema.required ?? [], [], `${name} không được có tham số bắt buộc`);
  }
});

test("MCP memory tools search and show a message", async (t) => {
  const env = seedMcpDb(t);
  const search = await callMcpTool("memory_search", { query: "brass compass", limit: 5 }, env);
  const hits = textPayload(search);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].sessionId, "mcp-session");

  const show = await callMcpTool("memory_show", { id: hits[0].id }, env);
  const message = textPayload(show);
  assert.equal(message.content, "remember the brass compass calibration note");
});

test("MCP memory search works without a project harness scope", async (t) => {
  const { dbPath } = seedMcpDb(t);
  const search = await callMcpTool("memory_search", { query: "brass compass", limit: 5 }, { dbPath, projectRoot: null });
  const hits = textPayload(search);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].sessionId, "mcp-session");
});

test("MCP plan tools search and show a section", async (t) => {
  const env = seedMcpDb(t);
  const search = await callMcpTool("plan_search", { query: "recall server", limit: 5 }, env);
  const hits = textPayload(search);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].heading, "MCP Notes");

  const show = await callMcpTool("plan_show", { id: hits[0].id }, env);
  const section = textPayload(show);
  assert.equal(section.heading, "MCP Notes");
  assert.match(section.body, /memory_search/);
});
