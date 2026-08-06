// MCP mirror của graph (plan 13 §5) — `graph_impact` + `graph_neighbors`.
//
// Trước bản này `mcp.ts` có **0 match** `graph`: năng lực blast-radius đã build từ 07-21
// nhưng chỉ sống ở CLI, nên host nào nối MCP thì mất hẳn lớp đó. Đường giao hàng chính vẫn
// là CLI (hệ agent của user lái terminal) — MCP là GƯƠNG, và gương phải phản đúng.

import assert from "node:assert/strict";
import test from "node:test";
import { TOOLS, callMcpTool } from "../../dist/tools/index.js";

const ROOT = process.cwd(); // chính repo này — graph thật, không phải fixture

const textOf = (r) => r.content.map((c) => c.text).join("\n");

test("hai tool graph có mặt trong danh mục MCP, kèm mô tả nói RÕ khi nào gọi", () => {
  const names = TOOLS.map((t) => t.name);
  assert.ok(names.includes("graph_impact"), "mcp.ts từng 0 match `graph` — đó là khoảng trống thật");
  assert.ok(names.includes("graph_neighbors"));
  const impact = TOOLS.find((t) => t.name === "graph_impact");
  assert.match(impact.description, /BEFORE/i, "mô tả phải nói khi nào gọi, không chỉ nói nó làm gì");
  assert.match(impact.description, /ADVISORY|never blocks/i, "phải nói rõ nó KHÔNG chặn sửa file (HP điều 10)");
});

test("graph_impact trả fan-in/fan-out THẬT của một file trong repo này", async () => {
  const r = await callMcpTool("graph_impact", { file: "memory/db.ts", project: ROOT });
  assert.ok(!r.isError, textOf(r));
  const out = JSON.parse(textOf(r));
  assert.match(out.file, /memory\/db\.ts$/);
  assert.ok(out.fanIn > 0, "db.ts phải có người import — nếu 0 thì graph hỏng, không phải file cô lập");
  assert.ok(Array.isArray(out.importers) && out.importers.length > 0);
});

test("tên MƠ HỒ ⇒ trả CANDIDATES, tuyệt đối không đoán bừa một file", async () => {
  // `index.ts` có nhiều bản trong repo. Đoán đại một cái là đưa agent đi sửa nhầm file.
  const r = await callMcpTool("graph_impact", { file: "index.ts", project: ROOT });
  assert.ok(r.isError, "mơ hồ mà trả một kết quả chắc nịch là tệ hơn trả lỗi");
  assert.match(textOf(r), /ambiguous/i);
});

test("không có file nào khớp ⇒ nói thẳng, không trả rỗng như thể file đó cô lập", async () => {
  const r = await callMcpTool("graph_impact", { file: "khong-he-ton-tai-abc.ts", project: ROOT });
  assert.ok(r.isError);
  assert.match(textOf(r), /No file matching/i);
});

test("graph_neighbors lọc theo hướng và tôn trọng limit", async () => {
  const both = JSON.parse(textOf(await callMcpTool("graph_neighbors", { file: "memory/db.ts", project: ROOT })));
  assert.ok("importedBy" in both && "imports" in both, "mặc định là cả hai chiều");

  const inOnly = JSON.parse(textOf(await callMcpTool("graph_neighbors", { file: "memory/db.ts", direction: "in", project: ROOT })));
  assert.ok("importedBy" in inOnly);
  assert.ok(!("imports" in inOnly), "direction=in thì KHÔNG được kèm chiều ra");

  const capped = JSON.parse(textOf(await callMcpTool("graph_neighbors", { file: "memory/db.ts", direction: "in", limit: 2, project: ROOT })));
  assert.ok(capped.importedBy.length <= 2);
  assert.ok(capped.fanIn >= capped.importedBy.length, "fanIn là số THẬT, không bị limit cắt theo");
});

test("thiếu file ⇒ báo lỗi rõ, không ném vỡ phiên MCP", async () => {
  const r = await callMcpTool("graph_impact", { project: ROOT });
  assert.ok(r.isError);
  assert.match(textOf(r), /non-empty file/i);
});
