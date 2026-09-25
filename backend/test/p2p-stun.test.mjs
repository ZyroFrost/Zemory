// ĐO KIỂU NAT (plan/24 §7 ⑩) — cổng cho lớp STUN.
//
// Vì sao cổng này soi phần THUẦN chứ không gọi mạng thật: phép đo cần server công khai,
// mà một cổng phụ thuộc mạng là cổng đỏ-giả mỗi lần mất mạng (`02_RULES §BA LUẬT ĐO`).
// Thứ phải ghim là LUẬT: khuôn gói · phép bóc địa chỉ · và trên hết là **khi nào ĐƯỢC
// PHÉP kết luận** — điều 13 cấm lẫn kết luận với không-kết-luận, và đó đúng là chỗ dễ
// lỡ tay phán "cone" từ một câu trả lời duy nhất.
//
// Ca ÂM bắt buộc (`plan/18 §3`): mã giao dịch lệch · một server · rác · gói cụt đều
// phải trả `null`/`unknown`, KHÔNG được trả một phán quyết nghe hợp lý.
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBindingRequest,
  parseMappedAddress,
  classifyMapping,
  holePunchViable,
  resolveStunServers,
  resolveStunServersDetailed,
  measureNat,
  PUBLIC_STUN_SERVERS,
} from "../../dist/memory/channel/stun.js";

const MAGIC = 0x2112a442;

/** Dựng một câu trả lời Binding Success mang XOR-MAPPED-ADDRESS. */
function successXor(txid, ip, port) {
  const value = Buffer.alloc(8);
  value.writeUInt8(0, 0);
  value.writeUInt8(0x01, 1); // họ IPv4
  value.writeUInt16BE(port ^ (MAGIC >>> 16), 2);
  const octets = ip.split(".").map(Number);
  const cookie = Buffer.alloc(4);
  cookie.writeUInt32BE(MAGIC, 0);
  for (let i = 0; i < 4; i++) value.writeUInt8(octets[i] ^ cookie[i], 4 + i);
  return frame(0x0101, txid, 0x0020, value);
}

/** Cùng một địa chỉ nhưng khai bằng MAPPED-ADDRESS đời cũ (không xor). */
function successPlain(txid, ip, port) {
  const value = Buffer.alloc(8);
  value.writeUInt8(0, 0);
  value.writeUInt8(0x01, 1);
  value.writeUInt16BE(port, 2);
  ip.split(".").map(Number).forEach((o, i) => value.writeUInt8(o, 4 + i));
  return frame(0x0101, txid, 0x0001, value);
}

function frame(msgType, txid, attrType, value) {
  const attr = Buffer.alloc(4 + value.length);
  attr.writeUInt16BE(attrType, 0);
  attr.writeUInt16BE(value.length, 2);
  value.copy(attr, 4);
  const head = Buffer.alloc(20);
  head.writeUInt16BE(msgType, 0);
  head.writeUInt16BE(attr.length, 2);
  head.writeUInt32BE(MAGIC, 4);
  txid.copy(head, 8);
  return Buffer.concat([head, attr]);
}

test("stun: yêu cầu Binding đúng khuôn RFC 5389 và mã giao dịch tươi mỗi lượt", () => {
  const a = buildBindingRequest();
  const b = buildBindingRequest();
  assert.equal(a.request.length, 20, "gói Binding Request phải đúng 20 byte");
  assert.equal(a.request.readUInt16BE(0), 0x0001, "kiểu tin phải là Binding Request");
  assert.equal(a.request.readUInt16BE(2), 0, "không thuộc tính nào ⇒ độ dài 0");
  assert.equal(a.request.readUInt32BE(4), MAGIC, "thiếu magic cookie thì server đời mới bỏ qua");
  assert.equal(a.txid.length, 12);
  assert.notEqual(a.txid.toString("hex"), b.txid.toString("hex"), "mã giao dịch trùng nhau là mở cửa nhận câu trả lời của lượt khác");
});

test("stun: bóc được XOR-MAPPED-ADDRESS, và bóc được cả bản MAPPED-ADDRESS đời cũ", () => {
  const { txid } = buildBindingRequest();
  // Địa chỉ tài liệu (RFC 5737) — không phải địa chỉ của ai.
  assert.deepEqual(parseMappedAddress(successXor(txid, "203.0.113.7", 21038), txid), { ip: "203.0.113.7", port: 21038 });
  // stun.ekiga.net đo được là chỉ trả bản KHÔNG xor ⇒ đường lùi này là ca THẬT, không phải giả định.
  assert.deepEqual(parseMappedAddress(successPlain(txid, "203.0.113.7", 21038), txid), { ip: "203.0.113.7", port: 21038 });
});

test("stun: CA ÂM — câu trả lời không thuộc lượt hỏi này phải bị từ chối", () => {
  const mine = buildBindingRequest();
  const other = buildBindingRequest();
  const reply = successXor(other.txid, "203.0.113.9", 40000);
  assert.equal(parseMappedAddress(reply, mine.txid), null, "mã giao dịch lệch mà vẫn nhận = đọc sai cổng ngoài của chính mình");

  const bad = successXor(mine.txid, "203.0.113.9", 40000);
  bad.writeUInt32BE(0xdeadbeef, 4);
  assert.equal(parseMappedAddress(bad, mine.txid), null, "sai magic cookie ⇒ không phải STUN RFC 5389");

  const notSuccess = successXor(mine.txid, "203.0.113.9", 40000);
  notSuccess.writeUInt16BE(0x0111, 0); // Binding Error Response
  assert.equal(parseMappedAddress(notSuccess, mine.txid), null, "câu trả lời LỖI không phải một địa chỉ");

  assert.equal(parseMappedAddress(Buffer.alloc(8), mine.txid), null, "gói cụt");
  assert.equal(parseMappedAddress(Buffer.from("khong phai stun"), mine.txid), null, "rác");
  const truncated = successXor(mine.txid, "203.0.113.9", 40000).subarray(0, 22);
  assert.equal(parseMappedAddress(truncated, mine.txid), null, "thuộc tính bị cắt giữa ⇒ không đoán nốt phần thiếu");
});

test("stun: phán kiểu ánh xạ — CHỈ khi ≥ 2 server KHÁC NHAU trả lời (điều 13)", () => {
  assert.equal(classifyMapping([21038, 21038], 2), "endpoint-independent", "cùng cổng ngoài tới hai đích ⇒ cone");
  assert.equal(classifyMapping([21038, 55491], 2), "address-dependent", "cổng đổi theo đích ⇒ NAT đối xứng");

  // 🔴 Đây là ca giữ cho cả lớp này khỏi nói dối: một server trả lời thì KHÔNG phân biệt
  // được cone với đối xứng. Phán "cone" ở đây là đoán theo hướng dễ chịu (điều 12 cấm).
  assert.equal(classifyMapping([21038], 1), "unknown", "một server duy nhất ⇒ chưa kết luận được");
  assert.equal(classifyMapping([21038, 21038], 1), "unknown", "hai câu trả lời từ CÙNG một server cũng không phân loại được");
  assert.equal(classifyMapping([], 0), "unknown", "không ai trả lời ⇒ chưa đo được, không phải 'không có NAT'");
});

test("stun: phán đục lỗ có cửa — và CA ÂM 'chưa đủ dữ kiện' không được thành 'không được'", () => {
  const side = (mapping) => ({ asked: 3, answered: 2, distinctServers: 2, mapping, portPreserved: true, externalPorts: [21038, 21038] });
  const none = { asked: 3, answered: 0, distinctServers: 0, mapping: "unknown", portPreserved: null, externalPorts: [] };

  assert.equal(holePunchViable({ udp: side("endpoint-independent"), tcp: none, stable: true }), true, "một nửa cone là đã có cửa");
  assert.equal(holePunchViable({ udp: none, tcp: side("endpoint-independent"), stable: null }), true, "cone ở nửa TCP đủ để dùng lại TLS sẵn có");
  assert.equal(holePunchViable({ udp: side("address-dependent"), tcp: side("address-dependent"), stable: true }), false, "hai nửa đối xứng ⇒ không mã nào cứu");

  // Không đo được thì phải nói KHÔNG BIẾT. Trả `false` ở đây là khai một sự thật chưa ai đo.
  assert.equal(holePunchViable({ udp: none, tcp: none, stable: null }), null, "không server nào trả lời ⇒ chưa đủ dữ kiện");
  assert.equal(holePunchViable({ udp: side("address-dependent"), tcp: none, stable: null }), null, "một nửa đối xứng, nửa kia chưa đo ⇒ chưa kết luận");
});

test("stun: danh sách server công khai gồm nhiều NHÀ, và khử trùng theo IP", async () => {
  const hosts = PUBLIC_STUN_SERVERS.map((s) => s.split(":")[0]);
  assert.ok(hosts.length >= 4, "phân loại NAT đòi nhiều đích khác nhau, một nhà là không đủ");
  const domains = new Set(hosts.map((h) => h.split(".").slice(-2).join(".")));
  assert.ok(domains.size >= 3, `cần ít nhất ba nhà khác nhau, đang có ${domains.size}`);

  // Khử trùng THEO IP là thứ chặn đúng bẫy đã trả giá 2026-09-21: `stun.l` và `stun1.l`
  // của Google giải ra CÙNG một địa chỉ, nện nó hai lượt là bị giới hạn nhịp rồi hết giờ
  // sạch — và lượt đo đầu đã đọc nhầm điều đó thành "mạng chặn".
  const twoNamesOneHost = ["stun.l.google.com:19302", "stun1.l.google.com:19302"];
  const resolved = await resolveStunServers(twoNamesOneHost);
  const ips = new Set(resolved.map((s) => s.ip));
  assert.equal(resolved.length, ips.size, "hai tên trỏ cùng một IP phải chỉ còn MỘT mục");

  // Tên không giải được ⇒ bỏ qua, không ném (fail-open, điều 9).
  const bogus = await resolveStunServers(["khong-ton-tai.zemory-test.invalid:3478"]);
  assert.deepEqual(bogus, [], "DNS trượt là bỏ mục đó, không phải làm chết phép đo");
});

// ── GIẢI TÊN — cổng cho bản vá 2026-09-22 ─────────────────────────────────────────────
//
// 🔴 Bug thật: `channel probe` trên máy thứ hai in *"không server nào trả lời (0 đã hỏi)"*.
// **0 đã hỏi** — nó chưa gửi một gói nào. Gốc: bản cũ chỉ gọi `dns.resolve4`, mà hàm đó đi thẳng
// tới DNS server bằng c-ares và BỎ QUA bộ giải tên của hệ điều hành (không đọc `hosts`, không
// dùng cache của Windows, hỏi nhầm DNS server khi máy có adapter ảo). Cả 6 tên trượt ⇒ 0 server
// ⇒ không đo được địa chỉ ngoài ⇒ mã máy ra bản TRẦN ⇒ máy kia dán vào nhận *"không thấy máy đó"*.
//
// Cụm này chạy OFFLINE và TẤT ĐỊNH: `localhost` là phép phân biệt hoàn hảo giữa hai đường —
// đo trên máy này: `dns.resolve4("localhost")` ⇒ **ENOTFOUND**, `dns.lookup("localhost")` ⇒
// **127.0.0.1**. Nên một cổng dùng `localhost` chứng minh được ĐÚNG đường nào đang chạy.

// RFC 2606: `.invalid` bảo đảm KHÔNG BAO GIỜ giải được ⇒ ca âm không phụ thuộc mạng.
const NONEXISTENT_STUN = "zemory-khong-co-that-abc123.invalid:3478";

test("stun: giải tên bằng bộ giải của HỆ ĐIỀU HÀNH, không chỉ hỏi DNS thẳng", async () => {
  const r = await resolveStunServersDetailed(["localhost:3478"]);
  // `localhost` chỉ ra được qua `getaddrinfo` (đọc `hosts`). Đường DNS thẳng trả ENOTFOUND.
  // Ca này đỏ ngay khi ai đó bỏ `dns.lookup` — đúng cái bug của máy thứ hai.
  assert.equal(r.servers.length, 1, "phải giải được `localhost` — nếu không thì đang bỏ qua bộ giải của HĐH");
  assert.equal(r.servers[0].ip, "127.0.0.1");
  assert.equal(r.servers[0].port, 3478, "cổng phải giữ nguyên, không bị nuốt");
  assert.deepEqual(r.unresolved, []);
});

test("stun: CA ÂM — tên không tồn tại vào sổ TRƯỢT, không bịa ra một IP", async () => {
  const r = await resolveStunServersDetailed([NONEXISTENT_STUN]);
  assert.equal(r.servers.length, 0, "không giải được thì KHÔNG được đẻ ra server");
  assert.equal(r.unresolved.length, 1, "phải kể tên đã trượt — thiếu nó thì bề mặt không nói được bệnh gì");
});

test("stun: bề mặt phân biệt *CHƯA HỎI AI* với *KHÔNG AI TRẢ LỜI*", async () => {
  // Bất biến của cả bản vá: hai câu đó nghĩa khác hẳn nhau và vá hai kiểu khác nhau — một cái là
  // DNS của máy, một cái là mạng/NAT. Gộp chúng làm người đọc đi soi nhầm đầu, và nó đã đốt một
  // lượt chẩn đoán thật (`02_RULES §Hành xử`: chưa xác minh thì chưa phải sự thật).
  const m = await measureNat({ localPort: 0, servers: [NONEXISTENT_STUN] });
  assert.equal(m.dns.names, 1, "phải nói đã ĐỊNH hỏi mấy tên");
  assert.equal(m.dns.resolved, 0, "và giải được mấy — 0 nghĩa là bệnh DNS, không phải bệnh mạng");
  assert.equal(m.udp.asked, 0, "chưa giải được tên thì KHÔNG hỏi ai — `asked` phải là 0");
  assert.equal(m.tcp.asked, 0);
  assert.equal(m.udp.mapping, "unknown", "không đo được thì nói KHÔNG BIẾT, không phán (điều 12)");
  assert.equal(m.tcp.mapping, "unknown");
});
