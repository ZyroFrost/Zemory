// PROFILE THIẾU DẤU KHÔNG ĐƯỢC BỊ ĐOÁN LÀ HÃNG KHÁC RỒI DỜI ĐI — khi khe ĐANG CÓ PHIÊN.
//
// Ca thật, cắn HAI LẦN trong buổi 2026-09-11: khe `m365copilot` rồi khe `gemini`. Cả hai profile do
// Brave dựng nhưng KHÔNG có file dấu `.zemory-browser`; `profileBrowser` gặp thư mục không dấu thì
// suy *"dựng từ trước khi có cơ chế này ⇒ coi như Edge"*, thấy mặc định máy là Brave ⇒ kết luận
// "đổi hãng" ⇒ `renameSync` cả profile sang `…-bak-…` rồi dựng profile trắng. Bề mặt sau đó báo
// *"chưa đăng nhập"* cho một tài khoản vừa đăng nhập xong, và lượt kéo dừng.
//
// Luật user chốt cùng ngày: *"nếu là đăng nhập thì phải để"* — phiên đăng nhập là thứ không được
// vứt vì một suy đoán. Đổi hãng vẫn được phép, nhưng phải có BẰNG CHỨNG (cái dấu do zemory ghi).
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../../backend/src/memory/scanweb.ts", import.meta.url), "utf8");

test("the guess-it-is-Edge branch only runs when the slot has NO session", () => {
  // Neo vào ĐIỀU KIỆN, không vào câu chữ quanh nó (bài học cùng ngày: neo theo cửa sổ N ký tự vỡ
  // ngay khi ai đó viết thêm chú thích).
  // 2026-09-13: `coNoiDung` đổi thành `hasContent` theo luật định danh phải là tiếng Anh ASCII.
  // Neo này bám TÊN BIẾN nên nó đỏ ngay lúc đổi tên — đúng như nó phải thế.
  assert.match(SRC, /hasContent && !keepSession/u, "phải có vế `!keepSession` — thiếu nó là quay lại bug dời phiên đang sống");
  // Ca ÂM: KHÔNG được bỏ hẳn nhánh suy đoán. Profile đời cũ THẬT SỰ do Edge dựng và KHÔNG có phiên
  // thì vẫn phải được nhận là Edge — bỏ luôn là đổi hành vi của một ca khác, không phải sửa bug này.
  assert.match(SRC, /EDGE_PATHS\.find\(\(x\) => existsSync\(x\)\)/u, "vẫn phải giữ đường đoán cho profile đời cũ KHÔNG có phiên");
});

test("on a real VENDOR CHANGE the profile is still moved aside, never deleted", () => {
  // Vế này là luật user chốt 2026-08-28 (máy mặc định THẮNG) — bản vá hôm nay không được đụng tới.
  assert.match(SRC, /renameSync\(profileDir, `\$\{profileDir\}\.\$\{basename\(built\)/u, "đổi hãng ⇒ dời sang bên");
  assert.doesNotMatch(SRC, /rmSync\(profileDir/u, "KHÔNG BAO GIỜ xoá profile cũ — luôn phải lùi lại được");
});

test("when a mark exists the MARK WINS: a marked Edge profile still opens in Edge even if the machine default differs", () => {
  // Đọc `built` từ dấu là đường CHÍNH; nhánh suy đoán chỉ là đường lui khi đọc dấu ném.
  assert.match(SRC, /built = readFileSync\(marker, "utf8"\)\.trim\(\) \|\| null;/u);
});
