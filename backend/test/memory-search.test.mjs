import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { search } from "../../dist/memory/search.js";
import { tempDir } from "./helpers.mjs";

test("project search applies scope before the global candidate limit", (t) => {
  const root = tempDir(t, "zemory-search-");
  const dbPath = join(root, "memory.db");
  const db = openMemory(dbPath);
  try {
    const addSession = db.prepare(
      "INSERT INTO sessions (id, source, project_root, message_count) VALUES (?, 'test', ?, 1)",
    );
    const addMessage = db.prepare(
      "INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?, ?, 'user', ?, ?)",
    );
    for (let i = 0; i < 70; i++) {
      addSession.run(`other-${i}`, "C:\\other");
      addMessage.run(`other-${i}`, `other-message-${i}`, "shared needle", `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}Z`);
    }
    addSession.run("target", "C:\\target");
    addMessage.run("target", "target-message", "shared needle target", "2026-01-02T00:00:00Z");
  } finally {
    db.close();
  }

  const hits = search("shared needle", { project: "C:/target", dbPath });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].sessionId, "target");
});

// ── Hạ điểm đầu ra của tool (chống "recall blindness") ──────────────────────────
// Đo 2026-07-27 trên DB thật: 20 kết quả đầu có 8 tin TOOL — 40% ngân sách recall đổ
// vào nội dung máy sinh (dump file, output lệnh) vì chúng dài và đầy mã định danh nên
// khớp từ khoá rất tốt, đẩy câu trả lời của con người xuống dưới.
// HẠ ĐIỂM chứ KHÔNG loại — hai test cuối khoá đúng ranh giới đó.
function seed(t, rows) {
  const root = tempDir(t, "zemory-demote-");
  const p = join(root, "memory.db");
  const db = openMemory(p);
  try {
    db.prepare("INSERT INTO sessions (id, source, project_root, message_count) VALUES ('s','claude-code','C:\\p',0)").run();
    const add = db.prepare("INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp) VALUES ('s',?,?,?,?,?)");
    rows.forEach((r, i) => add.run(`u${i}`, r.role, r.content, r.tool ?? null, `2026-07-01T00:0${i}:00Z`));
  } finally {
    db.close();
  }
  return p;
}

test("tin tool bị hạ xuống dưới văn xuôi, nhưng KHÔNG bị loại khỏi kết quả", (t) => {
  const p = seed(t, [
    { role: "user", content: "[tool_result] fitness fitness fitness dump fitness" },
    { role: "user", content: "[tool_result] fitness fitness fitness khác fitness" },
    { role: "assistant", content: "bàn về fitness của graph" },
  ]);
  const isTool = (h) => /^\s*\[tool_result/i.test(h.snippet ?? "");
  const on = search("fitness", { dbPath: p, all: true, limit: 10, perSession: 10 });
  const off = search("fitness", { dbPath: p, all: true, limit: 10, perSession: 10, includeTools: true });
  assert.ok(on.length >= 2, "phải trả về cả hai loại");
  assert.ok(!isTool(on[0]), "văn xuôi phải đứng trước tin tool sau khi hạ điểm");
  assert.ok(on.some(isTool), "tin tool vẫn PHẢI có mặt — hạ điểm, không phải loại bỏ");
  assert.equal(on.length, off.length, "hạ điểm không được làm MẤT kết quả nào");
});

// Trường hợp xấu nhất: câu trả lời CHỈ nằm trong tool output. Hạ điểm không được nuốt nó.
test("khi tool là nguồn DUY NHẤT, kết quả vẫn ra", (t) => {
  const p = seed(t, [{ role: "user", content: "[tool_result] mã lỗi hiếm zqx9910 chỉ có ở đây" }]);
  assert.equal(search("zqx9910", { dbPath: p, all: true }).length, 1, "không có văn xuôi cạnh tranh ⇒ tin tool vẫn phải ra");
});

test("hỏi thẳng role=tool thì không bị phạt", (t) => {
  const p = seed(t, [{ role: "user", content: "[tool_result] enoentxyz trong output công cụ" }]);
  assert.equal(search("enoentxyz", { dbPath: p, all: true, role: "tool" }).length, 1);
});
