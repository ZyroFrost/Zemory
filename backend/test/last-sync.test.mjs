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

import { parseSyncTimestamp } from "../../dist/ui.js";

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
