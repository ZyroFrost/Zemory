import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
    "memory_doctor",
    "memory_conflicts",
    "session_pin",
    "project_merge",
    "plan_search",
    "plan_show",
    // Graph mirror (plan 13 §5) — nối 2026-08-06, đóng khoảng trống "mcp.ts 0 match graph".
    "graph_impact",
    "graph_neighbors",
  ]);
});

test("mọi tool khai trong danh sách phải có người thực thi — không có tool ma", async () => {
  // Khai một tool rồi quên nối dispatcher là lỗi im lặng tệ nhất của bề mặt này: agent thấy
  // nó trong tools/list, gọi, và nhận "Unknown zemory MCP tool" — trông như zemory hỏng.
  for (const t of TOOLS) {
    const r = await callMcpTool(t.name, {}, { dbPath: ":memory:", projectRoot: null });
    const text = r.content?.[0]?.text ?? "";
    assert.ok(!/^Unknown zemory MCP tool/.test(text), `${t.name} khai mà không có dispatcher`);
  }
});

test("memory_search KHÔNG rerank theo mặc định — rerank là lối chót, phải xin", () => {
  // Đo trong tiến trình đã ấm trên kho 198.334 tin: FTS 172ms · hybrid **746ms** ·
  // hybrid+rerank **29.420ms**. Tool này từng gọi `recall()` nên ăn theo công tắc rerank của
  // MÁY — đo thật qua MCP: **27–34s MỖI lần tìm**, không chỉ lần đầu. Agent gọi search liên
  // tục ⇒ đó là thuế khổng lồ, đổi lấy thứ chưa thắng: corpus gate có nhãn cho rerank 8/8 =
  // hybrid 8/8. Sau khi sửa: **0,9–1,05s**.
  const src = readFileSync(new URL("../src/tools/index.ts", import.meta.url), "utf8").replace(/\/\/[^\n]*/g, "");
  assert.ok(!/\brecall\(/.test(src), "không được gọi recall() — nó thừa hưởng công tắc rerank của máy");
  assert.match(src, /rerank:\s*Boolean\(args\.deep\)/u, "rerank chỉ bật khi người gọi xin deep");
  const tool = TOOLS.find((t) => t.name === "memory_search");
  assert.ok(tool.inputSchema.properties.deep, "phải phơi cờ deep để agent tự chọn");
  assert.match(tool.description, /last resort/i, "mô tả phải nói rõ deep là lối chót, không phải mặc định tốt hơn");
  assert.match(tool.description, /slower/i, "mô tả phải nêu cái GIÁ, không thì agent bật bừa");
});

test("tool ĐỔI DỮ LIỆU phải mặc định KHÔNG đổi gì", () => {
  // `project_merge` là tool duy nhất ghi vào DB. Agent gọi tool thì không có ai gật ở giữa,
  // nên mặc định phải là dry-run và `apply` phải là thứ người ta cố ý bật.
  const merge = TOOLS.find((t) => t.name === "project_merge");
  assert.ok(merge, "thiếu project_merge");
  assert.deepEqual(merge.inputSchema.required ?? [], [], "không được bắt buộc tham số nào");
  assert.match(merge.description, /dry run/i, "mô tả phải nói rõ mặc định là dry run");
  assert.ok(merge.inputSchema.properties.apply, "phải có cờ apply tường minh");
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

test("session_pin: ghim phiên CŨ vẫn nổi lên đầu memory_context", async (t) => {
  const { projectRoot, dbPath } = seedMcpDb(t);
  const env = { dbPath, projectRoot };
  const db = openMemory(dbPath);
  try {
    // 6 phiên MỚI HƠN đứng trước; phiên đáng nhớ thì cũ nhất — đúng ca ghim sinh ra để trị.
    for (let i = 0; i < 6; i++) {
      db.prepare(
        "INSERT INTO sessions(id, source, project_root, title, ended_at, message_count) VALUES (?,?,?,?,?,?)",
      ).run(`newer-${i}`, "codex", projectRoot, `phiên mới ${i}`, `2026-07-1${i}T00:00:00Z`, 3);
    }
    db.prepare("UPDATE sessions SET title=?, ended_at=? WHERE id=?").run(
      "quyết định gốc",
      "2026-01-01T00:00:00Z",
      "mcp-session",
    );
  } finally {
    db.close();
  }

  const before = (await callMcpTool("memory_context", {}, env)).content[0].text;
  assert.ok(!before.includes("quyết định gốc"), "chưa ghim thì phiên cũ phải bị đẩy ra khỏi thẻ");

  const pin = textPayload(await callMcpTool("session_pin", { session_id: "mcp-session" }, env));
  assert.equal(pin.pinned, true);

  const after = (await callMcpTool("memory_context", {}, env)).content[0].text;
  assert.match(after, /📌.*quyết định gốc/, "ghim rồi phải nổi lên đầu, có dấu vì sao nó ở đó");

  const off = textPayload(await callMcpTool("session_pin", { session_id: "mcp-session", on: false }, env));
  assert.equal(off.pinned, false);
  assert.ok(!(await callMcpTool("memory_context", {}, env)).content[0].text.includes("quyết định gốc"), "bỏ ghim phải trả về như cũ");

  const bad = await callMcpTool("session_pin", { session_id: "khong-co-that" }, env);
  assert.equal(bad.isError, true, "id sai phải BÁO, không được im lặng coi như xong");
});

test("project_merge: dry-run KHÔNG đổi gì, apply gộp mà KHÔNG xoá dòng nào", async (t) => {
  const { projectRoot, dbPath } = seedMcpDb(t);
  const env = { dbPath, projectRoot };
  const db = openMemory(dbPath);
  const lower = projectRoot.replace(/^([A-Z]):/, (m, d) => `${d.toLowerCase()}:`);
  try {
    db.prepare("INSERT INTO sessions(id, source, project_root, cwd, message_count) VALUES (?,?,?,?,?)").run(
      "split-a",
      "claude-code",
      `${lower}\\`, // cùng thư mục, viết khác: hoa/thường + gạch cuối
      `${lower}\\`,
      5,
    );
  } finally {
    db.close();
  }

  const dry = textPayload(await callMcpTool("project_merge", {}, env));
  assert.equal(dry.applied, false);
  assert.equal(dry.split_groups.length, 1, "phải thấy đúng một nhóm bị tách");
  assert.equal(dry.outcomes.length, 0, "dry-run không được đổi gì");

  const applied = textPayload(await callMcpTool("project_merge", { apply: true }, env));
  assert.equal(applied.applied, true);
  assert.equal(applied.outcomes[0].sessionsMoved, 1);

  const after = openMemory(dbPath);
  try {
    const roots = after.prepare("SELECT DISTINCT project_root FROM sessions WHERE project_root IS NOT NULL").all();
    assert.equal(roots.length, 1, "sau khi gộp chỉ còn MỘT khoá project");
    const rows = after.prepare("SELECT COUNT(*) c FROM sessions").get();
    assert.equal(rows.c, 2, "KHÔNG được xoá dòng nào — chỉ trỏ lại project_root");
    const kept = after.prepare("SELECT cwd FROM sessions WHERE id='split-a'").get();
    assert.equal(kept.cwd, `${lower}\\`, "cwd gốc phải còn nguyên để truy ngược");
  } finally {
    after.close();
  }
});

test("memory_conflicts: chỉ ghép CẶP, tuyệt đối không tự phán", async (t) => {
  const { projectRoot, dbPath } = seedMcpDb(t);
  const env = { dbPath, projectRoot };
  const db = openMemory(dbPath);
  try {
    const add = (uuid, content, when) =>
      db
        .prepare("INSERT INTO messages(session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)")
        .run("mcp-session", uuid, "user", content, when);
    add("d1", "chốt: rerank luôn bật mặc định cho mọi máy", "2026-03-01T00:00:00Z");
    add("d2", "quyết định đổi hướng: rerank KHÔNG bật mặc định nữa, chỉ opt-in", "2026-06-01T00:00:00Z");
  } finally {
    db.close();
  }

  const r = textPayload(await callMcpTool("memory_conflicts", { topic: "rerank mặc định" }, env));
  assert.ok(r.candidates.length >= 1, "hai câu chốt ngược nhau, cách nhau 3 tháng ⇒ phải thành cặp");
  const c = r.candidates[0];
  assert.ok(Date.parse(c.newer.timestamp) > Date.parse(c.older.timestamp), "phải nêu rõ bên nào MỚI hơn");
  assert.ok(c.daysApart >= 1);
  assert.match(r.note, /CANDIDATES ONLY|did not judge/i, "phải nói rõ zemory KHÔNG phán — agent mới là người phán");
  const tool = TOOLS.find((x) => x.name === "memory_conflicts");
  assert.match(tool.description, /YOU judge/i, "mô tả phải giao việc phán cho agent (HP điều 6: ①script → ②agent)");
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
