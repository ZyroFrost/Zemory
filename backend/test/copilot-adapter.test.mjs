// ADAPTER GITHUB COPILOT — canh đúng RANH GIỚI giữa *đọc được* và *đoán bừa*.
//
// Bối cảnh (2026-09-12): đường kéo đã mở và ĐO ĐƯỢC tới bước liệt kê (`/github/chat/threads` với
// scheme `GitHub-Bearer`), nhưng tài khoản trả `{threads: []}` ở cả hai lượt đo — nên hình dạng NỘI
// DUNG một hội thoại chưa có mẫu thật. `plan/07 §1` cấm viết parser bằng phỏng đoán, vì vậy adapter
// chỉ nhận những hình dạng nó NHẬN RA, còn lại trả `null` ("không đọc được file này") để lượt quét
// sau nạp lại khi parser thật xong — thay vì nhét dữ liệu méo vào kho (HP điều 15).
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copilotAdapter } from "../../dist/memory/adapters/copilot.js";

const dir = mkdtempSync(join(tmpdir(), "zm-ghcp-"));
const w = (name, obj) => { const f = join(dir, name); writeFileSync(f, JSON.stringify(obj), "utf8"); return f; };

test("① hình dạng NHẬN RA được thì đọc: {messages:[{role,content}]}", () => {
  const f = w("ok.json", [{ threadId: "th_1", title: "Sửa hàm tính thuế", raw: { messages: [
    { id: "m1", role: "user", content: "hàm này sai ở đâu?", createdAt: "2026-09-12T01:00:00Z" },
    { id: "m2", role: "assistant", content: "thiếu nhánh chia cho 0", createdAt: "2026-09-12T01:00:05Z" },
  ] } }]);
  const [s] = copilotAdapter.parseFileMulti(f);
  assert.equal(s.sessionId, "copilotweb-th_1");
  assert.equal(s.title, "Sửa hàm tính thuế");
  assert.deepEqual(s.messages.map((m) => m.role), ["user", "assistant"]);
  assert.deepEqual(s.messages.map((m) => m.uuid), ["m1", "m2"], "uuid lấy id của nền — khoá dedup");
  assert.equal(s.messages[0].timestamp, "2026-09-12T01:00:00Z");
});

test("② chữ nằm trong khối `content[].text` cũng đọc được", () => {
  const f = w("blocks.json", [{ threadId: "th_2", raw: { messages: [
    { role: "user", content: [{ type: "text", text: "phần một" }, { type: "text", text: "phần hai" }] },
    { role: "assistant", content: [{ type: "text", text: "trả lời" }] },
  ] } }]);
  const [s] = copilotAdapter.parseFileMulti(f);
  assert.equal(s.messages[0].content, "phần một\nphần hai");
  assert.equal(s.messages.length, 2);
});

test("③ vai được quy về bộ chuẩn (`copilot`/`model`/`human` → user|assistant)", () => {
  const f = w("roles.json", [{ threadId: "th_3", raw: { messages: [
    { role: "human", content: "a" }, { role: "copilot", content: "b" }, { role: "model", content: "c" },
  ] } }]);
  const [s] = copilotAdapter.parseFileMulti(f);
  assert.deepEqual(s.messages.map((m) => m.role), ["user", "assistant", "assistant"]);
});

test("④ 🔴 hình dạng LẠ ⇒ null, KHÔNG đoán — đây là bất biến chính của file này", () => {
  // Payload thật của GitHub có thể khác hẳn (chưa ai đo được). Gặp thứ không nhận ra thì phải NÓI
  // KHÔNG ĐỌC ĐƯỢC: `ingestFile` sẽ bỏ qua và KHÔNG ghi `ingest_state`, nên khi có parser thật thì
  // lượt quét sau nạp lại đủ. Nếu ở đây "cố vớt" thì kho nhận dữ liệu méo mà không ai biết.
  assert.equal(copilotAdapter.parseFileMulti(w("weird1.json", [{ threadId: "t", raw: { turns: [{ q: "hỏi", a: "đáp" }] } }])), null);
  assert.equal(copilotAdapter.parseFileMulti(w("weird2.json", [{ threadId: "t", raw: { conversation: "một chuỗi dài" } }])), null);
  // Có vai nhưng KHÔNG có chữ ⇒ cũng không đẻ hàng trống.
  assert.equal(copilotAdapter.parseFileMulti(w("weird3.json", [{ threadId: "t", raw: { messages: [{ role: "user", content: "" }] } }])), null);
  // Có chữ nhưng KHÔNG nhận ra vai ⇒ bỏ, vì gán bừa `user` là bịa nguồn phát ngôn.
  assert.equal(copilotAdapter.parseFileMulti(w("weird4.json", [{ threadId: "t", raw: { messages: [{ role: "tool-ish", content: "chữ" }] } }])), null);
});

test("⑤ file hỏng ⇒ null, KHÔNG ném", () => {
  const f = join(dir, "bad.json");
  writeFileSync(f, "{khong phai json", "utf8");
  assert.equal(copilotAdapter.parseFileMulti(f), null);
});

test("⑥ tiền tố phiên KHỚP `sessionPrefix` khai trong PLATFORMS", async () => {
  const { PLATFORMS } = await import("../../dist/memory/scanweb.js");
  const f = w("pfx.json", [{ threadId: "th_9", raw: { messages: [{ role: "user", content: "x" }] } }]);
  const [s] = copilotAdapter.parseFileMulti(f);
  assert.ok(s.sessionId.startsWith(PLATFORMS.copilot.sessionPrefix));
});
