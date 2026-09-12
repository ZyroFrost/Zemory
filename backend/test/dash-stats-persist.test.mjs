// BẢNG SỐ PHẢI SỐNG QUA LẦN KHỞI ĐỘNG LẠI.
//
// `heavyCache` chỉ nằm trong RAM daemon, nên restart là mất sạch và lượt `/memory-status` ĐẦU
// TIÊN trả nguyên hoá đơn quét toàn bảng — đo 2026-09-10: **66,8 s** ngay cả sau khi đã gộp
// một-lượt-quét (lượt thứ hai chỉ 203 ms). Cái giá đó rơi trọn vào lúc người dùng vừa mở app.
// Nay nó được ướp ra `dash-stats.json` cạnh kho.
//
// Cổng này soi ba vế mà một lớp cache bền dễ làm sai:
//  ① nạp lại được, và mang theo ĐÚNG mốc đo (trưng số cũ mà giấu tuổi = điều 12 cấm);
//  ② đĩa chỉ đọc MỘT LẦN mỗi tiến trình — sau lượt đầu thì RAM là sự thật, nên `?fresh=1` và
//    `invalidateDashboard()` giữ nguyên nghĩa cũ;
//  ③ `invalidateDashboard()` KHÔNG được xoá bản ướp (nó chạy sau mỗi scan/sync — xoá là tự huỷ).
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { readAppJs } from "./helpers.mjs";

const SRC = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
const UI = SRC("backend/src/ui.ts");

test("the pickled copy sits NEXT TO THE STORE as a derived layer - not a config file, not a source", () => {
  assert.match(UI, /function heavyCacheFile\(\): string \{\s*\n\s*return join\(currentMemoryDir\(\), "dash-stats\.json"\);/,
    "phải đi theo kho (relocate là nó theo), không nằm ở ổ hệ thống — HP điều 14");
});

test("EVERY heavyCache write pickles, and BOTH read doors reload it", () => {
  const writes = [...UI.matchAll(/heavyCache = \{ at: Date\.now\(\)/g)].length;
  const saves = [...UI.matchAll(/saveHeavyCache\(\);/g)].length;
  assert.equal(writes, 3, "ba chỗ đặt heavyCache (đồng bộ · nền · chờ con) — đổi số thì sửa cổng này");
  assert.equal(saves, writes, "ghi mà quên ướp một nhánh = restart mất số một cách ngẫu nhiên, rất khó truy");
  const loads = [...UI.matchAll(/\n {2}loadHeavyCache\(\);/g)].length;
  assert.equal(loads, 2, "hai cửa đọc cache (heavyStatsSync · heavyStatsAsync) đều phải nạp lại từ đĩa");
});

// 🔴 Ca này từng khẳng định ĐIỀU NGƯỢC LẠI ("invalidateDashboard phải `rmSync` bản ướp") và xanh —
// tức nó khoá chặt đúng cái bug: hàm đó chạy sau MỖI lượt scan/sync, nên nó xoá đúng thứ vừa ghi và
// lớp ướp không bao giờ sống tới lần khởi động sau. Chỉ lượt CHẠY THẬT bắt được (vẫn 54,6 s). Bài
// học giữ lại nguyên đây: một cổng xanh chỉ chứng minh code khớp với điều test TIN, không chứng minh
// điều đó đúng.
test("invalidateDashboard() must NOT delete the pickle - it runs after every scan/sync", () => {
  const body = /function invalidateDashboard\(\): void \{([\s\S]*?)\n\}/.exec(UI);
  assert.ok(body, "phải tìm được invalidateDashboard");
  assert.match(body[1], /heavyCache = null;/, "xoá RAM là đủ để lượt sau tính lại");
  assert.doesNotMatch(body[1], /rmSync\(heavyCacheFile/, "xoá file ở đây = tự huỷ lớp ướp mỗi 30 phút");
});

test("disk is read ONCE per process - otherwise expired numbers come back to life in the same session", () => {
  const body = /function loadHeavyCache\(\): void \{([\s\S]*?)\n\}/.exec(UI);
  assert.match(body[1], /if \(heavyCache \|\| heavyDiskLoaded\) return;/, "cửa chặn phải xét CẢ cờ đã-đọc-đĩa");
  assert.match(body[1], /heavyDiskLoaded = true;/, "đặt cờ TRƯỚC khi đọc: file hỏng cũng không được thử lại mỗi lượt");
  // Đây là thứ giữ cho `?fresh=1` và `invalidateDashboard()` nguyên nghĩa: sau lượt đầu, RAM là sự thật.
  assert.match(UI, /let heavyDiskLoaded = false;/);
});

test("loading from disk must FAIL-OPEN and must not trust junk data (constitution 9)", () => {
  const body = /function loadHeavyCache\(\): void \{([\s\S]*?)\n\}/.exec(UI);
  assert.ok(body, "phải tìm được loadHeavyCache");
  assert.match(body[1], /if \(heavyCache \|\| heavyDiskLoaded\) return;/, "đã có số trong RAM, hoặc đã đọc đĩa rồi ⇒ đừng đọc đè lên");
  assert.match(body[1], /typeof raw\.at === "number"/, "thiếu mốc đo ⇒ không dùng: số không có tuổi là số không kiểm được");
  assert.match(body[1], /typeof v\.tokensEst === "number" && typeof v\.count === "number"/, "phải soi hình dạng, file có thể cũ/hỏng");
  assert.match(body[1], /catch \{/, "hỏng ⇒ bỏ qua im lặng, tính lại như trước");
});

test("the payload states the AGE of the heavy block, separate from the bundle mint mark", () => {
  assert.match(UI, /statsAt: heavyCache \? new Date\(heavyCache\.at\)\.toISOString\(\) : null,/,
    "gói đúc bây giờ, nhưng số nặng có thể là bản ướp từ lần chạy trước — hai mốc khác nhau");
  // Không đòi FE phải vẽ nó ngay; đòi là nó có mặt để bề mặt nào cần thì đọc được.
  assert.doesNotMatch(readAppJs(), /statsAt[^A-Za-z]/, "chưa bề mặt nào dùng — thêm thì nhớ cập nhật cổng này");
});
