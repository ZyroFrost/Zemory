// Ô "Last Sync" NÓI DỐI: báo "chưa sync" ngay sau một lượt sync thành công.
//
// Báo bởi người dùng 2026-08-13, đo lại thấy mâu thuẫn NGAY TRONG CÙNG một payload:
//   lastSync         : null                      ← UI đọc cái này ⇒ "never synced"
//   drive.lastPushAt : 2026-08-13T06:59:26.646Z  ← vừa đẩy một phút trước
//   drive.syncPercent: 100 · 241.011/241.011 · pending 0
//
// Nguyên nhân: `sync_state.updated_at` là **TEXT chứa chuỗi ISO**, còn code đọc nó như **số
// epoch**: `new Date(Number("2026-08-13T06:59:26.646Z"))` ⇒ `Number(...)` = NaN ⇒
// `.toISOString()` NÉM RangeError ⇒ `catch` nuốt ⇒ `null`.
//
// Hai thứ khiến nó sống lâu, và cả hai đáng nhớ hơn bản thân lỗi:
//  · lệch kiểu chỉ lộ ra khi mở schema ra xem — đọc code không thấy gì sai;
//  · `catch` vốn dựng cho ca "bảng chưa tồn tại" đã **âm thầm nuốt luôn một lỗi kiểu**. Một
//    catch không phân biệt được "không có gì để báo" với "tôi vừa vỡ" thì biến bug thành LỜI NÓI
//    DỐI — người dùng thấy một con số sai chứ không thấy lỗi.
//
// Cổng soi HÀNH VI của hàm phân giải, không soi chữ trong mã.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { parseSyncTimestamp } from "../../dist/ui.js";

test("Last Sync phải lấy từ lượt ĐỒNG BỘ THẬT, không phải hàng bất kỳ trong sync_state", () => {
  // User chốt 2026-08-13: *"sync phải luôn lấy từ thời gian tự động sync thực tế"*.
  //
  // `sync_state` chứa MỌI thứ từng ghi watermark, không riêng đồng bộ Drive. Đo cùng ngày: 11
  // hàng thì 6 hàng là `.tmp` do phép thử để lại (`timed.tmp` · `probe5.tmp` · `probe4.tmp` …)
  // cộng `keytest.enc` · `test.zemory.enc` · `cli-lean.enc`. Bản cũ lấy `MAX(updated_at)` trên
  // TOÀN bảng ⇒ chỉ cần một phép thử chạy sau lượt sync là ô này hiện giờ của MỘT LƯỢT TEST.
  // Hôm phát hiện, hàng `drive:` tình cờ mới nhất nên con số nhìn vẫn "đúng" — đúng kiểu bug
  // ngồi im chờ ngày thứ tự đảo lại.
  //
  // Bất biến: `lastSync` dùng CHUNG nguồn với panel Drive (`drive:<host>`), không đẻ truy vấn
  // thứ hai. Hai truy vấn trả lời hai câu khác nhau rồi cùng đổ vào một ô — đó là cách ô "đã
  // đủ" từng nói dối trước đây.
  // Bỏ chú thích TRƯỚC khi soi: chính chú thích giải thích bug lại chứa `MAX(updated_at)`, nên
  // soi thẳng cả file thì cổng đỏ vì đọc được lời kể về bug chứ không phải bản thân bug.
  const src = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.match(
    src,
    /lastSync: parseSyncTimestamp\(drive\.lastPushAt\)/u,
    "lastSync phải lấy từ drive.lastPushAt (lượt sync thật của máy này)",
  );
  assert.ok(
    !/MAX\(updated_at\)/u.test(src),
    "không được quay lại MAX(updated_at) trên toàn bảng sync_state — nó nhặt cả hàng .tmp của phép thử",
  );
});

test("chuỗi ISO trong cột TEXT phải đọc được — đây là dạng schema THẬT đang dùng", () => {
  assert.equal(parseSyncTimestamp("2026-08-13T06:59:26.646Z"), "2026-08-13T06:59:26.646Z");
  // Chính giá trị này từng làm cả ô hiển thị sập về "chưa sync".
  assert.notEqual(parseSyncTimestamp("2026-08-13T06:59:26.646Z"), null);
});

test("số epoch vẫn đọc được — kho do bản cũ ghi không được vỡ", () => {
  const ms = Date.UTC(2026, 7, 13, 6, 59, 26);
  assert.equal(parseSyncTimestamp(ms), new Date(ms).toISOString());
  assert.equal(parseSyncTimestamp(String(ms)), new Date(ms).toISOString());
});

test('"chưa có gì" thì trả null — và KHÔNG được ném', () => {
  for (const empty of [null, undefined, ""]) {
    assert.equal(parseSyncTimestamp(empty), null, `phải là null: ${JSON.stringify(empty)}`);
  }
});

test("giá trị RÁC trả null chứ không ném — fail-open, không kéo sập cả dashboard", () => {
  // `/memory-status` gói chung mọi số của trang chủ: một ô hỏng mà ném thì mất TOÀN BỘ payload.
  for (const junk of ["khong-phai-ngay", "----", "2026-13-45T99:99:99Z"]) {
    assert.equal(parseSyncTimestamp(junk), null, `phải là null: ${junk}`);
  }
});
