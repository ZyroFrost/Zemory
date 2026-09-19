// Ô "địa chỉ máy cần nối" nhận ĐÚNG chuỗi mà bề mặt in ra. Bề mặt in `203.0.113.2:21038` thành MỘT dòng,
// nên bắt người dùng cắt đôi rồi gõ hai ô là tự đẻ một bước thừa (user 2026-09-19: "mắc gì bắt người ta
// phải nhập"). Cổng vẫn là của RIÊNG từng máy — nó đi kèm trong chuỗi, vắng thì rơi về mặc định.
import test from "node:test";
import assert from "node:assert/strict";
import { parsePeerAddress } from "../../dist/memory/channel/index.js";

test("dán nguyên dòng bề mặt in ra ⇒ tách đúng host và cổng", () => {
  assert.deepEqual(parsePeerAddress("203.0.113.2:21038"), { host: "203.0.113.2", port: 21038 });
  assert.deepEqual(parsePeerAddress("  203.0.113.90:22000  "), { host: "203.0.113.90", port: 22000 });
  assert.deepEqual(parsePeerAddress("tcp://may-kia.local:21500"), { host: "may-kia.local", port: 21500 });
});

test("thiếu cổng ⇒ mặc định của sản phẩm; cổng RỜI vẫn nhận (đường cũ)", () => {
  assert.deepEqual(parsePeerAddress("203.0.113.2"), { host: "203.0.113.2", port: 21038 });
  assert.deepEqual(parsePeerAddress("203.0.113.2", 22000), { host: "203.0.113.2", port: 22000 });
  // cổng trong CHUỖI thắng cổng rời — người dán biết rõ hơn giá trị còn sót trong ô
  assert.deepEqual(parsePeerAddress("203.0.113.2:21038", 22000), { host: "203.0.113.2", port: 21038 });
});

test("IPv6: trong ngoặc thì tách được, trần thì KHÔNG bị cắt khúc cuối làm cổng", () => {
  assert.deepEqual(parsePeerAddress("[fe80::1]:21038"), { host: "fe80::1", port: 21038 });
  assert.deepEqual(parsePeerAddress("[fe80::1]"), { host: "fe80::1", port: 21038 });
  assert.deepEqual(parsePeerAddress("fe80::1"), { host: "fe80::1", port: 21038 });
});

test("CA ÂM: dán sai thì BÁO, không lặng lẽ nối sang cổng khác", () => {
  assert.equal(parsePeerAddress(""), null);
  assert.equal(parsePeerAddress("   "), null);
  assert.equal(parsePeerAddress("203.0.113.2:cong"), null, "cổng không phải số");
  assert.equal(parsePeerAddress("203.0.113.2:70000"), null, "cổng ngoài 1–65535");
  assert.equal(parsePeerAddress("203.0.113.2:0"), null);
  assert.equal(parsePeerAddress(":21038"), null, "thiếu host");
});

