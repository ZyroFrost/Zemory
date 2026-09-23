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
// 🔴 Soi CẢ module kênh, không chỉ ui.ts. Bản đầu của cổng này chỉ soi `daemonLog(` trong ui.ts —
// trong khi dòng `giữ lỗ mở ở cổng …` đến từ `log(...)` trong channel/index.ts, và nó LỌT lên thẻ
// Nhật ký kênh ngay sau khi cổng xanh. Bắt được bằng mắt trên app thật, 22/09. Một cổng soi thiếu
// một nguồn là một cổng xanh giả cho đúng nguồn đó.
const CHANNEL_SRC = ["index.ts", "punch.ts", "peer.ts", "discovery.ts", "globaldisco.ts", "presence.ts"]
  .map((f) => readFileSync(new URL(`../src/memory/channel/${f}`, import.meta.url), "utf8"))
  .join("\n");

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

  // ── tiếng Anh chen vào câu tiếng Việt (rà toàn bộ 209 chuỗi thông báo, 23/09) ──────
  // Mỗi mục dưới đây là một câu ĐÃ lên màn hình, không phải phỏng đoán.
  ["sync xong", "dùng 'đã đồng bộ xong'"],
  ["embed đủ", "dùng 'nhúng đủ'"],
  ["chờ embed", "dùng 'chờ nhúng'"],
  ["chưa từng sync", "dùng 'chưa từng đồng bộ'"],
  ["chưa link", "dùng 'chưa nối'"],
  ["đã link", "dùng 'đã nối'"],
  ["lane semantic", "dùng 'lớp ngữ nghĩa'"],
  [/\bmessage lân cận\b/, "dùng 'tin lân cận'"],

  // ── cách viết kiểu nói ────────────────────────────────────────────────────────────
  ["sửa tay", "dùng 'sửa thủ công'"],
  ["chép tay", "dùng 'sao chép thủ công'"],
  ["chép thẳng", "dùng 'sao chép trực tiếp'"],
  ["rót ra", "ẩn dụ — viết thẳng 'tạo ra'"],
  ["chở sẵn", "dùng 'mang sẵn'"],
  ["chở kèm", "dùng 'mang theo'"],
  ["không ai import", "dùng 'không tệp nào import'"],
  ["không xong", "dùng 'không hoàn tất'"],
  ["không thành —", "dùng 'không thành công'"],
  ["hộp này", "dùng 'hộp thoại này'"],
  ["lịch này ràng", "dùng 'chịu ràng buộc của lịch này'"],
  ["Bỏ tick", "dùng 'Bỏ chọn'"],
  ["treo?)", "câu hỏi tu từ trong ngoặc — viết thành câu"],
  ["finishing up", "EN: dùng 'finalising'"],
  [/pulling fine/, "EN: dùng 'pulling normally'"],
  [/linked and fine/, "EN: dùng 'linked and healthy'"],
];

/**
 * Cấm RIÊNG trong nhật ký — nhật ký chỉ có bản tiếng Việt.
 *
 * Tách khỏi `BANNED` có chủ đích: `merge` là tiếng Anh hợp lệ trong bản EN của từ điển chữ, nên
 * cho vào danh sách chung là cổng kêu oan trên một câu tiếng Anh đúng.
 */
const LOG_BANNED = [
  ["chỗ chờ", "dùng 'phiên chờ' — cùng từ với bề mặt, theo từ điển tên"],
  [/\bmerge\b/, "dùng 'hợp nhất' — đừng chen tiếng Anh vào câu tiếng Việt"],
  ["gọi vào được", "dùng 'kết nối được'"],
  ["gọi được", "dùng 'kết nối được'"],
  ["cùng chìa", "dùng 'cùng khoá chia sẻ'"],
  [/\bthấy máy\b/, "dùng 'phát hiện máy'"],
  ["BẬT", "không viết hoa để nhấn giọng — viết 'đang bật'"],
  [/\bKHÔNG\b/, "không viết hoa để nhấn giọng"],
  ["tự nối", "dùng 'tự kết nối'"],
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
  // 🔴 Chỗ này đúng là chỗ đã lọt: dòng log trông như ghi chú kỹ thuật nội bộ, nhưng UI có một
  // thẻ in thẳng chúng ra cho người dùng đọc. Viết log kiểu ghi chú riêng là đưa ghi chú riêng lên
  // sản phẩm — cùng họ với luật "không để ghi chú dev trong UI".
  //
  // Soi MỌI chuỗi mở bằng `[channel]`, bất kể hàm gọi là `daemonLog`, `log` hay gì khác: tên hàm
  // không quyết định dòng đó có lên màn hình hay không — tiền tố `[channel]` mới quyết định.
  const SRC = UI_TS + "\n" + CHANNEL_SRC;
  const lines = SRC.match(/`\[channel\][^`]*`/g) ?? [];
  assert.ok(lines.length >= 20, `phải soi được đủ dòng nhật ký kênh — mới thấy ${lines.length}, neo có thể đã chết`);
  // Cả nhánh nối tiếp bằng `+ " · …"` cũng lên màn hình — bắt riêng, vì nó không nằm trong backtick.
  const tails = SRC.match(/\? " · [^"]*"/g) ?? [];
  const hits = [];
  for (const line of [...lines, ...tails]) {
    for (const [bad, fix] of [...BANNED, ...LOG_BANNED]) {
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

test("chữ DỰ PHÒNG trong HTML phải khớp từ điển — hai bản của một câu là hai bản lệch nhau", () => {
  // 🔴 Ca thật, bắt được 23/09: từ điển đã sửa nhưng chữ dự phòng cứng trong `app.html` vẫn hứa
  // *"cần một relay của zemory trên máy có IP công khai"* — một lời hứa đã SAI kể từ khi tầng 4
  // chuyển sang cụm công khai. Người đọc thấy nó trước khi i18n kịp chạy, hoặc khi i18n hỏng.
  const HTML = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");

  // Mọi phần tử có `data-i18n` phải mang chữ dự phòng ĐÚNG BẰNG bản VI trong từ điển.
  const pairs = [...HTML.matchAll(/data-i18n="([a-zA-Z0-9._]+)"[^>]*>([^<]*)</g)];
  assert.ok(pairs.length > 20, `phải soi được nhiều nhãn — mới thấy ${pairs.length}, neo có thể đã chết`);

  // Soi cụm `p2p.*`: đây là bề mặt vừa đổi nhiều nhất, và là chỗ đã lệch thật.
  const drift = [];
  for (const [, keyRaw, fallbackRaw] of pairs) {
    if (!keyRaw.startsWith("p2p.")) continue;
    const fallback = fallbackRaw.trim();
    if (!fallback) continue;
    // Cắt chuỗi thay vì regex: giá trị có thể chứa dấu nháy thoát, và một regex sai ở đây làm cổng
    // NÉM SyntaxError chứ không báo lệch — một cổng hỏng còn tệ hơn một cổng thiếu.
    const at = CHROME.indexOf(`'${keyRaw}':'`);
    if (at < 0) continue; // khoá chỉ có trong HTML — việc của cổng khác
    const from = at + keyRaw.length + 4;
    let end = from;
    while (end < CHROME.length && !(CHROME[end] === "'" && CHROME[end - 1] !== "\\")) end += 1;
    const dict = CHROME.slice(from, end);
    if (dict !== fallback) drift.push(`${keyRaw}\n      HTML: ${fallback}\n      từ điển: ${dict}`);
  }
  assert.deepEqual(drift, [], `Chữ dự phòng lệch từ điển:\n    ${drift.join("\n    ")}`);

  // CA ÂM riêng cho lời hứa đã chết: KHÔNG nơi nào trên bề mặt được nói user phải có máy IP công khai.
  for (const src of [HTML, CHROME]) {
    assert.ok(!/IP công khai/.test(src), "bề mặt còn hứa một relay trên máy có IP công khai — đã sai từ 23/09");
    assert.ok(!/public IP/i.test(src), "bản EN còn hứa một relay trên máy có IP công khai");
  }
});
