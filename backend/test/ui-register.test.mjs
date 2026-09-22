// VĂN PHONG BỀ MẶT — app là sản phẩm công khai, nên chữ trên màn hình phải là VĂN KỸ THUẬT.
//
// 🔴 Luật user chốt 2026-07-29: *"trong app không được có văn nói… app public chuẩn thì phải chuẩn
// văn kỹ thuật của app"*. Chốt ở một repo khác nhưng là luật chung cho mọi app của họ — và vì nó
// chưa từng có cổng nào canh, nó tái phạm: 22/09 user bắt được `Chỗ chờ đục lỗ` ngay trên màn
// Đồng bộ (*"đừng có dùng từ đục lỗ trong app, tôi đã nói không dùng văn nói rồi"*).
//
// Vì sao cổng này soi CHỮ CẤM chứ không chấm "văn phong": chấm văn phong là việc không tất định,
// và một cổng nói mơ hồ thì không ai sửa theo được. Danh sách dưới đây là những chuỗi CỤ THỂ đã
// từng lọt ra màn hình thật, mỗi mục kèm thứ phải dùng thay — nên khi nó đỏ, người đọc biết ngay
// phải viết gì. Thêm mục mới mỗi lần bắt được một ca thật, đừng đoán trước.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const CHROME = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
const UI_TS = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");

/**
 * Chuỗi CẤM trên bề mặt, kèm thứ dùng thay.
 *
 * Hai họ:
 * · **thuật ngữ thô** — tên kỹ thuật dịch sát nghĩa đen, đọc ra thô và không nói cho người dùng
 *   biết điều gì (`đục lỗ` ← *hole punching*). Người dùng không cần biết cơ chế xuyên NAT tên gì.
 * · **văn nói** — cách diễn đạt của lời nói miệng, đúng nghĩa nhưng sai đăng ký cho một sản phẩm.
 */
const BANNED = [
  // ── thuật ngữ thô ──────────────────────────────────────────────────────────────
  ["đục lỗ", "dùng 'phiên chờ kết nối' — người dùng không cần biết cơ chế xuyên NAT tên là gì"],
  ["giữ lỗ", "dùng 'đang mở'"],
  ["lỗ mở", "dùng 'đang mở'"],
  ["lỗ vừa đục", "dùng 'phiên chờ'"],
  ["Hole-punch", "dùng 'Pending connection'"],
  ["hole open", "dùng 'open — waiting…'"],
  ["chìa share", "dùng 'khoá chia sẻ'"],
  ["két bí mật", "dùng 'kho bí mật'"],

  // ── văn nói ────────────────────────────────────────────────────────────────────
  ["đụng nhau", "dùng 'trùng nhau'"],
  ["chở đi", "dùng 'đã gửi'"],
  ["nhận về", "dùng 'đã nhận'"],
  ["đồ cũ đã cất", "dùng 'tài liệu đã lưu trữ'"],
  ["lúc nào cũng gặp", "viết thành câu: 'có thể kết nối bất kỳ lúc nào'"],
  // Dùng BIỂU THỨC chứ không so chuỗi thô: `mở màn hình` chứa đúng `ở màn ` nên bản đầu của
  // chính cổng này báo nhầm một câu đã đúng. Một cổng kêu oan là một cổng sắp bị tắt.
  [/ở màn (?!hình)/, "'màn' là dạng nói của 'màn hình' — viết đủ 'màn hình'"],
  ["chép, mã bây giờ", "tách thành câu hoàn chỉnh"],
  ["press Connect over there whenever", "viết thành câu đầy đủ"],
];

test("bề mặt: không còn chuỗi CẤM nào trong từ điển chữ của app", () => {
  const hits = [];
  for (const [bad, fix] of BANNED) {
    const found = typeof bad === "string" ? CHROME.includes(bad) : bad.test(CHROME);
    if (found) hits.push(`frontend/scripts/chrome.js: "${bad}" ⇒ ${fix}`);
  }
  assert.deepEqual(hits, [], `Chuỗi cấm còn trên bề mặt:\n  ${hits.join("\n  ")}`);
});

test("nhật ký kênh CŨNG là bề mặt — nó hiện trong thẻ 'Nhật ký kênh'", () => {
  // 🔴 Chỗ này đúng là chỗ đã lọt: dòng `daemonLog` trông như log kỹ thuật nội bộ, nhưng UI có một
  // thẻ in thẳng chúng ra cho người dùng đọc. Viết log kiểu ghi chú riêng là đưa ghi chú riêng lên
  // sản phẩm — cùng họ với luật "không để ghi chú dev trong UI".
  const lines = UI_TS.match(/daemonLog\(`\[channel\][^`]*`/g) ?? [];
  assert.ok(lines.length > 0, "phải có dòng nhật ký kênh để soi — nếu 0, neo test đã chết");
  const hits = [];
  for (const line of lines) {
    for (const [bad, fix] of BANNED) {
      const found = typeof bad === "string" ? line.includes(bad) : bad.test(line);
      if (found) hits.push(`${line.slice(0, 70)}… : "${bad}" ⇒ ${fix}`);
    }
  }
  assert.deepEqual(hits, [], `Nhật ký kênh còn chuỗi cấm:\n  ${hits.join("\n  ")}`);
});

test("hai bản ngôn ngữ nói CÙNG một thứ — khoá phiên chờ phải có ở cả hai", () => {
  // Sửa văn phong mà chỉ sửa một bản là để hai ngôn ngữ mô tả hai sản phẩm khác nhau.
  for (const k of ["p2p.waitH", "p2p.waitHold"]) {
    const n = (CHROME.match(new RegExp(`'${k.replace(".", "\\.")}':`, "g")) ?? []).length;
    assert.equal(n, 2, `'${k}' phải có đúng 2 bản (VI + EN), đang có ${n}`);
  }
  assert.ok(CHROME.includes("'p2p.waitH':'Phiên chờ kết nối'"), "bản VI");
  assert.ok(CHROME.includes("'p2p.waitH':'Pending connection'"), "bản EN");
});
