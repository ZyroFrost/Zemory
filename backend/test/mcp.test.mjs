import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { openBrain } from "../../dist/brain/db.js";
import { createDoc } from "../../dist/docs/plan.js";
import { callMcpTool, handleMcpRequest } from "../../dist/mcp.js";
import { tempDir } from "./helpers.mjs";

function seedMcpDb(t) {
  const root = tempDir(t, "zemory-mcp-");
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  const dbPath = join(root, "brain.db");
  const db = openBrain(dbPath);
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
  createDoc(
    join("docs", "plan", "mcp.md"),
    "# MCP Notes\n\nThe recall server exposes brain_search and plan_search tools.\n",
    root,
    "plan",
    dbPath,
  );
  return { projectRoot: root, dbPath };
}

function textPayload(result) {
  return JSON.parse(result.content[0].text);
}

test("MCP tool list exposes recall tools", async () => {
  const res = await handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.equal(res.id, 1);
  const names = res.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, ["brain_search", "brain_show", "plan_search", "plan_show"]);
});

test("MCP brain tools search and show a message", async (t) => {
  const env = seedMcpDb(t);
  const search = await callMcpTool("brain_search", { query: "brass compass", limit: 5 }, env);
  const hits = textPayload(search);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].sessionId, "mcp-session");

  const show = await callMcpTool("brain_show", { id: hits[0].id }, env);
  const message = textPayload(show);
  assert.equal(message.content, "remember the brass compass calibration note");
});

test("MCP brain search works without a project harness scope", async (t) => {
  const { dbPath } = seedMcpDb(t);
  const search = await callMcpTool("brain_search", { query: "brass compass", limit: 5 }, { dbPath, projectRoot: null });
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
  assert.match(section.body, /brain_search/);
});
