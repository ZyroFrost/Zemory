// DÒ LAN — cổng cho bản vá 2026-09-22 (bắn broadcast ra MỖI card, không phó mặc OS chọn).
//
// 🔴 Bug thật: bản cũ chỉ bắn MỘT gói tới `255.255.255.255`, mà gói đó ra đúng MỘT card do bảng
// định tuyến của OS chọn. Máy có card ảo (WSL/Hyper-V) thì nó thường ra card ảo ⇒ máy cùng LAN
// không bao giờ nhận được beacon, `seen` rỗng dù hai máy chung router.
//
// Cụm này soi phần TÍNH TOÁN (thuần, tất định, không cần mạng). Phần gửi thật thì phải hai máy
// cùng LAN mới đo được — ghi ra để không ai tưởng cổng này chứng minh cả đường đi.
import assert from "node:assert/strict";
import test from "node:test";
import { networkInterfaces } from "node:os";
import { subnetBroadcast, broadcastTargets } from "../../dist/memory/channel/discovery.js";

test("dò LAN: địa chỉ broadcast của subnet tính đúng cho mọi mặt nạ thường gặp", () => {
  assert.equal(subnetBroadcast("203.0.113.29", "255.255.255.0"), "203.0.113.255");
  assert.equal(subnetBroadcast("10.101.1.2", "255.255.255.0"), "10.101.1.255");
  // Mặt nạ KHÔNG phải /24 — đây là chỗ một bản cài ẩu hay gán bừa `.255` vào octet cuối rồi
  // bắn nhầm subnet. Đo trên máy này 22/09: Wi-Fi là /20, broadcast đúng là `10.0.15.255`.
  assert.equal(subnetBroadcast("10.0.2.191", "255.255.240.0"), "10.0.15.255");
    // Dải của card ảo (WSL/Hyper-V) cũng là /20 — dùng số ở dải KHÔNG bị `no-data-in-git` cấm.
  assert.equal(subnetBroadcast("10.31.96.1", "255.255.240.0"), "10.31.111.255");
  assert.equal(subnetBroadcast("10.1.2.3", "255.255.255.252"), "10.1.2.3");
  // CA ÂM: rác vào thì trả `null`, KHÔNG bịa ra một địa chỉ.
  for (const bad of [["", "255.255.255.0"], ["1.2.3", "255.255.255.0"], ["1.2.3.4", "x"], ["a.b.c.d", "255.255.255.0"]]) {
    assert.equal(subnetBroadcast(bad[0], bad[1]), null, `rác '${bad[0]}' / '${bad[1]}' phải trả null`);
  }
});

test("dò LAN: bắn ra MỖI card thật, không chỉ 255.255.255.255", () => {
  const targets = broadcastTargets();
  assert.ok(targets.includes("255.255.255.255"), "phải giữ đường phòng hờ");
  assert.equal(new Set(targets).size, targets.length, "không được gửi trùng một đích");

  // Máy nào có ít nhất một card IPv4 thật thì PHẢI có thêm đích riêng của card đó — nếu chỉ còn
  // mỗi `255.255.255.255` thì bản vá không làm gì cả, và đó đúng là hành vi cũ.
  const cards = Object.values(networkInterfaces())
    .flatMap((l) => l ?? [])
    .filter((ni) => (ni.family === "IPv4" || ni.family === 4) && !ni.internal);
  if (cards.length) {
    assert.ok(targets.length > 1, `có ${cards.length} card IPv4 thật mà chỉ bắn 1 đích — đúng bug cũ`);
    for (const ni of cards) {
      const want = subnetBroadcast(ni.address, ni.netmask);
      if (want) assert.ok(targets.includes(want), `thiếu đích của card ${ni.address} (cần ${want})`);
    }
  }
  // CA ÂM: KHÔNG được bắn tới loopback — gói đó không bao giờ rời máy.
  assert.ok(!targets.includes("127.255.255.255"), "không bắn vào loopback");
});
