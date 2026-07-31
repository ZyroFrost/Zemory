// Lane `claude-cowork` — phiên Cowork trên claude.ai.
//
// Vì sao lane này tồn tại: Cowork KHÔNG nằm trong `chat_conversations` mà ở
// `/v1/code/sessions`, nên trước đây toàn bộ nó rơi ngoài bộ nhớ và sổ ghi "mọi quyết
// định bàn trong Cowork là không tra lại được". Fixture dưới đây dựng theo đúng hình
// dạng đo được 2026-07-31 trên phiên thật (218 event).

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { coworkAdapter } from "../../dist/memory/adapters/cowork.js";
import { allAdapters } from "../../dist/memory/adapters/index.js";
import { PLATFORMS } from "../../dist/memory/scanweb.js";
import { tempDir } from "./helpers.mjs";

// Hai vai có HAI hình dạng content khác nhau — đây chính là chỗ dễ parse hụt.
const SESSION = {
  id: "cse_01NmCPrZvnYsDFANCMMMypyT",
  title: "Claude-swap setup",
  created_at: "2026-07-16T02:00:15.106870Z",
  events: [
    { event_id: "e1", event_type: "user", created_at: "2026-07-16T02:22:22.319087Z", payload: { message: { content: "vậy phải mở session mới?", role: "user" } } },
    { event_id: "e2", event_type: "assistant", created_at: "2026-07-16T02:22:32.427071Z", payload: { message: { content: [{ type: "text", text: "Đúng rồi. Setting đó chỉ áp dụng cho task mới." }] } } },
    { event_id: "e3", event_type: "assistant", created_at: "2026-07-16T02:23:00Z", payload: { message: { content: [{ type: "tool_use", name: "Bash", input: { cmd: "ls" } }, { type: "tool_result", content: "kết quả" }] } } },
    { event_id: "s1", event_type: "system", created_at: "2026-07-16T02:22:00Z", payload: { message: { content: "nội bộ" } } },
    { event_id: "c1", event_type: "control_request", created_at: "2026-07-16T02:22:01Z", payload: { response: {} } },
    { event_id: "l1", event_type: "env_manager_log", created_at: "2026-07-16T02:22:02Z", payload: {} },
  ],
};

function dump(t, sessions) {
  const dir = tempDir(t, "zemory-cowork-");
  mkdirSync(dir, { recursive: true });
  const f = join(dir, "scan-web-part.json");
  writeFileSync(f, JSON.stringify(sessions));
  return f;
}

test("parse: giữ user + assistant, BỎ control/system/log", (t) => {
  const out = coworkAdapter.parseFileMulti(dump(t, [SESSION]));
  assert.equal(out.length, 1);
  const s = out[0];
  assert.equal(s.sessionId, "coworkweb-cse_01NmCPrZvnYsDFANCMMMypyT");
  assert.equal(s.title, "Claude-swap setup");
  assert.deepEqual(s.messages.map((m) => m.role), ["user", "assistant", "assistant"], "chỉ hai vai này là hội thoại");
  assert.equal(s.messages.length, 3, "system/control/log KHÔNG được thành tin");
});

test("hai hình dạng content: user là CHUỖI, assistant là MẢNG block", (t) => {
  const out = coworkAdapter.parseFileMulti(dump(t, [SESSION]));
  const [u, a] = out[0].messages;
  assert.equal(u.content, "vậy phải mở session mới?", "content chuỗi phải đọc thẳng");
  assert.ok(a.content.includes("Đúng rồi"), "content mảng phải ghép các block text");
  assert.equal(u.timestamp, "2026-07-16T02:22:22.319087Z");
  assert.equal(u.uuid, "e1", "uuid = event_id ⇒ dedup + kéo lại idempotent");
});

test("khối tool được GIỮ, gắn nhãn đúng quy ước các adapter Claude khác", (t) => {
  const out = coworkAdapter.parseFileMulti(dump(t, [SESSION]));
  const tool = out[0].messages[2].content;
  assert.ok(tool.includes("[tool_use:Bash]"), "nhãn tool_use phải khớp quy ước");
  assert.ok(tool.includes("[tool_result]") && tool.includes("kết quả"), "nội dung tool_result KHÔNG bị cắt");
});

test("phiên chỉ có control/log ⇒ bỏ hẳn, không đẻ phiên rỗng", (t) => {
  const f = dump(t, [{ id: "cse_x", events: [{ event_id: "s", event_type: "system", payload: { message: { content: "x" } } }] }]);
  assert.equal(coworkAdapter.parseFileMulti(f), null);
});

test("file hỏng ⇒ null, không ném (fail-open)", (t) => {
  const dir = tempDir(t, "zemory-cowork-bad-");
  const f = join(dir, "x.json");
  writeFileSync(f, "{ khong phai json");
  assert.equal(coworkAdapter.parseFileMulti(f), null);
});

test("khai đúng lane + được ĐĂNG KÝ (adapter không đăng ký = không ai đọc)", () => {
  assert.equal(coworkAdapter.source, "claude-cowork");
  assert.equal(coworkAdapter.origin, "web", "phải nằm lane web để scope-tree tách khỏi transcript local");
  assert.equal(coworkAdapter.mode, "whole", "kéo lại là thay toàn bộ phiên, idempotent");
  assert.ok(allAdapters().some((a) => a.source === "claude-cowork"), "phải có trong allAdapters()");
  assert.ok(coworkAdapter.signature.endsWith("cowork"), "thư mục import phải là imports/cowork — discovery lấy đoạn cuối signature");
});

// Cowork dùng CHUNG trang claude.ai ⇒ là lane phụ của platform claude, không phải nền thứ ba.
test("lane phụ gắn đúng vào platform claude, dùng chung cửa sổ + cổng", () => {
  const sub = PLATFORMS.claude.sub;
  assert.ok(sub, "claude phải khai lane phụ");
  assert.equal(sub.source, "claude-cowork");
  assert.equal(sub.sessionPrefix, "coworkweb-", "phải khớp id adapter sinh ra, nếu không resume chết lặng");
  assert.ok(!Object.values(PLATFORMS).some((p) => p.key === "cowork"), "KHÔNG được tạo PLATFORMS thứ ba cho cùng một site");
});

test("năm header bắt buộc phải có trong cả hai expr (thiếu là 400 dù đã đăng nhập)", () => {
  const sub = PLATFORMS.claude.sub;
  for (const expr of [sub.listExpr, sub.convExpr("cse_x")]) {
    for (const h of ["anthropic-version", "anthropic-beta", "anthropic-client-feature", "anthropic-client-platform", "x-organization-uuid"]) {
      assert.ok(expr.includes(h), `thiếu header ${h}`);
    }
    assert.ok(expr.includes("/v1/code/sessions"), "phải gọi đúng namespace /v1/code/sessions");
  }
});

// Đo 2026-07-31: tài khoản đang đăng nhập chỉ có 1 phiên Cowork; 3 phiên user cần nằm ở
// một tài khoản Claude KHÁC. Không có khe tài khoản ⇒ muốn lấy chúng phải đăng xuất cái
// đang dùng, tức đổi mất phiên này để lấy phiên kia.
test("nhiều TÀI KHOẢN cho cùng một nền: profile riêng + cổng riêng, main giữ nguyên tên cũ", async () => {
  const { accountSlot, accountPort, PLATFORMS: P } = await import("../../dist/memory/scanweb.js");
  assert.equal(accountSlot("claude"), "claude", "khe main PHẢI giữ đúng tên cũ — đổi tên là mất phiên đang đăng nhập");
  assert.equal(accountSlot("claude", "main"), "claude");
  assert.equal(accountSlot("claude", "2"), "claude-2");
  assert.equal(accountSlot("claude", "../evil"), "claude-evil", "tên khe phải được lọc, không cho thoát thư mục");
  assert.equal(accountPort(P.claude.port), P.claude.port, "khe main dùng đúng cổng cũ");
  assert.notEqual(accountPort(P.claude.port, "2"), P.claude.port, "khe khác PHẢI khác cổng — chung cổng là mất CDP một cửa sổ");
  const ports = new Set([accountPort(9223), accountPort(9223, "2"), accountPort(9223, "3")]);
  assert.equal(ports.size, 3, "mỗi khe một cổng");
});

test("app quét MỌI tài khoản, và có nút thêm tài khoản (bỏ sót khe = mất cả tài khoản đó)", () => {
  const ui = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  assert.ok(/function accountsOf\(/.test(ui), "phải liệt kê được các khe");
  assert.ok(/for \(const acct of account \? \[account\] : accountsOf\(platform\)\)/.test(ui), "quét phải lặp qua mọi khe khi không chỉ định khe");
  assert.ok(ui.includes('p === "/add-account"'), "phải có đường thêm tài khoản");
  const js = readFileSync(new URL("../../frontend/scripts/app.js", import.meta.url), "utf8");
  assert.ok(/data-addacct=/.test(js) && /\/add-account\?platform=/.test(js), "UI phải có nút thêm tài khoản và gọi đúng endpoint");
  assert.ok(/data-acct=/.test(js) && /&account='\+encodeURIComponent\(acct\)/.test(js), "nút nối phải mang theo khe tài khoản");
});

test("lane phụ hỏng KHÔNG được kéo lane chat xuống theo (fail-open)", () => {
  const src = readFileSync(new URL("../src/memory/scanweb.ts", import.meta.url), "utf8");
  const tail = src.slice(src.indexOf("LANE PHỤ"));
  assert.ok(/catch \(e\) \{[\s\S]{0,200}lane failed/.test(tail), "phải bọc try/catch quanh cả lane phụ");
  assert.ok(/if \(p\.sub && !interrupted && !cdp\.dead\)/.test(tail), "chỉ chạy khi lane chính còn khoẻ");
});
