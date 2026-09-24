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


test("🔴 IPv4 ánh xạ IPv6 — dạng dò LAN thật sự trả về, và là ca luật IPv6 trả lời SAI", () => {
  // ĐO TẠI TRẬN 2026-09-24: hai máy CÙNG Wi-Fi, dò LAN thấy nhau đều đặn 30 giây một lần, mà
  // KHÔNG lần nào gọi thẳng được. `rinfo.address` của socket hai tầng trả `::ffff:192.168.1.29`,
  // nên ứng viên dựng ra là `::ffff:192.168.1.29:21038` — và luật ngay trên (*nhiều dấu `:` không
  // ngoặc ⇒ IPv6 trần, đừng cắt*) trả `null`. Ứng viên LAN bị bỏ qua IM LẶNG, cả cụm rơi xuống
  // địa chỉ cũ rồi relay, thẻ máy hiện "đang nối lại" mãi trong khi hai máy cách nhau một router.
  assert.deepEqual(parsePeerAddress("::ffff:192.168.1.29:21038"), { host: "192.168.1.29", port: 21038 });
  assert.deepEqual(parsePeerAddress("::ffff:10.0.3.26"), { host: "10.0.3.26", port: 21038 }, "không cổng ⇒ rơi về mặc định");
  assert.deepEqual(parsePeerAddress("::FFFF:192.168.1.29:21038"), { host: "192.168.1.29", port: 21038 }, "hoa/thường đều là cùng một dạng");

  // 🔴 CA ÂM — IPv6 THẬT vẫn KHÔNG được cắt khúc cuối làm cổng. Nới sai ở đây là mở lại đúng cái
  // bug mà luật IPv6 trần sinh ra để chặn.
  assert.deepEqual(parsePeerAddress("fe80::1"), { host: "fe80::1", port: 21038 });
  assert.deepEqual(parsePeerAddress("2001:db8::ffff:1:21038"), { host: "2001:db8::ffff:1:21038", port: 21038 },
    "`ffff` nằm GIỮA một IPv6 thật không phải dạng ánh xạ — đừng bắt nhầm");
  // Octet ngoài dải ⇒ KHÔNG phải IPv4 ánh xạ ⇒ tiền tố không bị bóc ⇒ rơi vào luật IPv6 trần và
  // bị TỪ CHỐI. Từ chối là câu trả lời đúng: một địa chỉ hỏng phải ở nguyên dạng hỏng cho nơi gọi
  // loại ra, chứ không được nắn thành `192.168.1.300` — một host trông hợp lệ mà không tồn tại.
  assert.equal(parsePeerAddress("::ffff:192.168.1.300:21038"), null, "octet ngoài dải ⇒ từ chối, đừng đoán");
});

test("🔴 dò LAN nắn địa chỉ NGUỒN ngay tại gốc — nơi duy nhất dạng đó ra đời", async () => {
  const { normalizeSourceHost } = await import("../../dist/memory/channel/discovery.js");
  assert.equal(normalizeSourceHost("::ffff:192.168.1.29"), "192.168.1.29");
  assert.equal(normalizeSourceHost("fe80::1%12"), "fe80::1", "scope chỉ có nghĩa trên máy sinh ra nó");
  assert.equal(normalizeSourceHost("::ffff:10.0.3.26%4"), "10.0.3.26", "cắt scope TRƯỚC rồi mới nhận dạng ánh xạ");
  // CA ÂM: địa chỉ bình thường và IPv6 thật đi qua nguyên vẹn.
  assert.equal(normalizeSourceHost("192.168.1.29"), "192.168.1.29");
  assert.equal(normalizeSourceHost("::1"), "::1");
});
