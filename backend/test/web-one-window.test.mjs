// MỘT KHE = MỘT CỬA SỔ — cổng cho lỗi "hai cửa sổ Sign in - Claude" (user chụp 3 lần, 2026-08-28).
//
// Cơ chế đo được: Chromium single-instance theo profile ⇒ `spawn` lần hai vào profile đang chạy
// KHÔNG dựng tiến trình mới mà mở THÊM một cửa sổ trong tiến trình cũ. CDP liệt kê 3 tab
// `claude.ai/login` cùng pid. Ba lớp chặn dưới đây đều là hàm THUẦN, đo bằng hành vi chứ không
// grep chữ trong nguồn (bẫy `06_CHANGES [2026-08-27b]`).
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.GLOBAL_MEMORY_DB = join(mkdtempSync(join(tmpdir(), "zemory-onewin-")), "global_memory.db");
const { coalesceByKey, extraPageIds, launchPlan } = await import("../../dist/memory/scanweb.js");

// ── ① quyết định mở: sống thì KHÔNG spawn ─────────────────────────────────────

test("launchPlan: trình duyệt còn sống thì không bao giờ spawn", () => {
  assert.equal(launchPlan(false, false), "spawn", "chưa chạy ⇒ mở tiến trình (cửa sổ đầu, hợp lệ)");
  assert.equal(launchPlan(true, false), "tab", "đang chạy mà thiếu tab ⇒ mở TAB, không mở cửa sổ");
  assert.equal(launchPlan(true, true), "none", "đang chạy và có tab ⇒ không làm gì — spawn lúc này = cửa sổ trùng");
  // Ca ÂM tường minh: không tổ hợp nào của alive=true ra "spawn".
  for (const hasTab of [true, false]) assert.notEqual(launchPlan(true, hasTab), "spawn");
});

// ── ② tab thừa: giữ đúng một, không đụng nền khác ────────────────────────────

test("extraPageIds: giữ tab đầu của nền, đóng phần còn lại, tab nền khác và iframe để yên", () => {
  const re = /claude\.ai/;
  const pages = [
    { id: "A", type: "page", url: "https://claude.ai/login" },
    { id: "F", type: "iframe", url: "https://claude.ai/captcha" }, // iframe của chính tab — không phải cửa sổ
    { id: "B", type: "page", url: "https://claude.ai/login" },
    { id: "G", type: "page", url: "https://chatgpt.com/" }, // nền khác chung tiến trình? không đụng
    { id: "C", type: "page", url: "https://claude.ai/new" },
  ];
  assert.deepEqual(extraPageIds(pages, re), ["B", "C"], "đóng mọi tab claude trừ tab đầu danh sách (tab đang hoạt động)");
  assert.deepEqual(extraPageIds(pages.slice(0, 2), re), [], "một tab + iframe của nó ⇒ không có gì thừa");
  assert.deepEqual(extraPageIds([], re), [], "không tab ⇒ không đóng gì");
  assert.deepEqual(extraPageIds([{ id: "G", type: "page", url: "https://chatgpt.com/" }], re), [], "chỉ có nền khác ⇒ không đụng");
});

// ── ③ hai lượt cùng khe chạy chồng ⇒ MỘT lượt thật ────────────────────────────

test("coalesceByKey: N lời gọi đồng thời cùng khoá chạy ĐÚNG MỘT lần; khoá khác chạy riêng; settle xong thì dọn", async () => {
  const bag = new Map();
  let runs = 0;
  let release;
  const gate = new Promise((r) => (release = r));
  const run = async () => {
    runs++;
    await gate;
    return "ok";
  };
  const a = coalesceByKey(bag, "claude", run);
  const b = coalesceByKey(bag, "claude", run);
  const c = coalesceByKey(bag, "chatgpt", run);
  assert.equal(a.shared, false, "lượt đầu chạy thật");
  assert.equal(b.shared, true, "lượt hai dùng chung — đây chính là cửa sổ thứ hai bị chặn");
  assert.equal(c.shared, false, "khe khác không bị gộp nhầm");
  assert.equal(runs, 2, "hai khe ⇒ hai lần chạy, không phải ba");
  assert.equal(a.p, b.p, "cùng một promise");
  release();
  assert.deepEqual(await Promise.all([a.p, b.p, c.p]), ["ok", "ok", "ok"]);
  assert.equal(bag.size, 0, "settle xong phải dọn khoá — không thì lượt kế bị gộp vào kết quả cũ");
  const d = coalesceByKey(bag, "claude", async () => "again");
  assert.equal(d.shared, false, "sau khi xong, lượt mới chạy thật");
  assert.equal(await d.p, "again");
});

test("coalesceByKey: lượt đầu NÉM thì khoá vẫn được dọn, lượt sau không kẹt vĩnh viễn", async () => {
  const bag = new Map();
  const { p } = coalesceByKey(bag, "k", async () => {
    throw new Error("boom");
  });
  await assert.rejects(p, /boom/);
  assert.equal(bag.size, 0);
});
