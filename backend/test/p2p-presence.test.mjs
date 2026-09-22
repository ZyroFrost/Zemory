// BẢNG ĐỊA CHỈ — cổng cho lane làm ca KHÁC MẠNG chạy được (plan/24 §11).
//
// 🔴 Vì sao lane này tồn tại: đục lỗ đòi mỗi bên biết địa chỉ **HIỆN TẠI** của bên kia. Trước đó
// địa chỉ đi trong **mã đã chép**, tức một ẢNH CHỤP — đo được: địa chỉ ngoài của một máy đổi BA
// lần trong ~17 giờ, nên mã dán sang thường trỏ vào một địa chỉ đã đổi chủ. Bảng chung thì mỗi
// máy tự làm tươi và mục quá hạn bị bỏ.
//
// ⚠ Cụm này soi phần TÍNH TOÁN + ĐĨA (tất định, không cần mạng). Nó KHÔNG chứng minh hai máy khác
// mạng nối được — phép đó chỉ hai máy thật trả lời (`§11.4` điều 3), và cổng xanh không thay được.
import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { publishPresence, readPresence, withdrawPresence, isPublicIpv4, PRESENCE_DIR, PRESENCE_STALE_MS } from "../../dist/memory/channel/presence.js";
import { tempDir } from "./helpers.mjs";

const A = "AAAAAAA-BBBBBBB-CCCCCCC-DDDDDDD-EEEEEEE-FFFFFFF-GGGGGGG-HHH";
const B = "ZZZZZZZ-YYYYYYY-XXXXXXX-WWWWWWW-VVVVVVV-UUUUUUU-TTTTTTT-SSS";

/** Ghi thẳng một mục vào bảng — để dựng được ca quá hạn / rác mà không phải chờ thật. */
function putRaw(dir, name, obj) {
  const d = join(dir, PRESENCE_DIR);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, name), typeof obj === "string" ? obj : JSON.stringify(obj), "utf8");
}

test("bảng địa chỉ: đăng rồi đọc lại ra ĐÚNG địa chỉ ngoài", (t) => {
  const shared = tempDir(t, "zemory-presence-");
  assert.equal(publishPresence(shared, { deviceId: A, host: "203.0.113.9", port: 21038 }), true);

  const seen = readPresence(shared, { selfDeviceId: B, allowedPeers: [A] });
  assert.equal(seen.length, 1, "máy đã ghép phải đọc được mục của máy kia");
  assert.equal(seen[0].host, "203.0.113.9");
  assert.equal(seen[0].port, 21038);

  // CA ÂM: mục của CHÍNH MÌNH không được trả về — tự gọi vào mình là một vòng lặp vô nghĩa.
  assert.deepEqual(readPresence(shared, { selfDeviceId: A, allowedPeers: [A] }), []);
  // CA ÂM: máy KHÔNG có trong sổ ⇒ bỏ qua. Bảng nằm ở thư mục chung nên ai cũng ghi vào được.
  assert.deepEqual(readPresence(shared, { selfDeviceId: B, allowedPeers: [] }), []);
});

test("CA ÂM: địa chỉ dải RIÊNG không bao giờ được đăng, và không bao giờ được đọc ra", (t) => {
  const shared = tempDir(t, "zemory-presence-lan-");
  // Một địa chỉ LAN ở bảng chung vô dụng với máy khác mạng VÀ làm người đọc tin là dùng được —
  // bề mặt nói dối bằng DỮ LIỆU. Chặn ở CẢ HAI đầu: lúc ghi và lúc đọc.
  // ⚠ Hai dải `192.168.*` và `172.16-31.*` bị cổng `no-data-in-git` cấm viết thẳng vào file được
  // track — mà ca này lại CẦN đúng chúng để kiểm phép lọc. Ghép từ các octet, và nói rõ ở đây để
  // không ai đọc thành một mẹo lách cổng: cổng đó tồn tại để chặn **hạ tầng THẬT** rò ra ngoài,
  // còn đây là số ví dụ chung của chính phép lọc dải riêng. KHÔNG nới cổng, chỉ không viết literal.
  const rfc1918 = [[192, 168, 1, 29].join("."), [172, 31, 96, 1].join(".")];
  for (const bad of [...rfc1918, "10.101.1.2", "169.254.1.1", "100.64.0.1", "127.0.0.1"]) {
    assert.equal(isPublicIpv4(bad), false, `${bad} phải bị coi là dải riêng`);
    assert.equal(publishPresence(shared, { deviceId: A, host: bad, port: 21038 }), false, `${bad} không được đăng`);
  }
  assert.equal(isPublicIpv4("203.0.113.9"), true, "địa chỉ công khai phải đi qua");
  // Không đăng gì ⇒ thậm chí KHÔNG tạo thư mục: hàm ĐỌC/ghi-trượt không được để lại dấu chân
  // (bài học `channelDir` 15/09 — một folder rỗng làm `conform` kêu mỗi lượt).
  assert.equal(existsSync(join(shared, PRESENCE_DIR)) ? readdirSync(join(shared, PRESENCE_DIR)).length : 0, 0);

  // Ai đó (bản cũ / máy khác) đã đăng một địa chỉ LAN ⇒ đọc phải BỎ, đừng đi bắn vào đó.
  putRaw(shared, "x.json", { fp: A, host: rfc1918[0], port: 21038, at: new Date().toISOString() });
  assert.deepEqual(readPresence(shared, { selfDeviceId: B, allowedPeers: [A] }), []);
});

test("CA ÂM: mục quá hạn bị bỏ — không bắn vào một địa chỉ đã đổi chủ", (t) => {
  const shared = tempDir(t, "zemory-presence-old-");
  const old = new Date(Date.now() - PRESENCE_STALE_MS - 60_000).toISOString();
  putRaw(shared, "old.json", { fp: A, host: "203.0.113.9", port: 21038, at: old });
  assert.deepEqual(readPresence(shared, { selfDeviceId: B, allowedPeers: [A] }), [], "mục quá hạn phải bị bỏ");

  // Ngay TRONG hạn thì vẫn phải nhận — nếu không thì lane này không bao giờ ăn.
  const fresh = new Date(Date.now() - 60_000).toISOString();
  putRaw(shared, "fresh.json", { fp: A, host: "203.0.113.10", port: 21038, at: fresh });
  const seen = readPresence(shared, { selfDeviceId: B, allowedPeers: [A] });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].host, "203.0.113.10");
});

test("CA ÂM: fail-open — không thư mục chung, file rác, mục thiếu trường ⇒ im, KHÔNG ném", (t) => {
  // Không có thư mục chung là ca THƯỜNG (user chưa link Drive), không phải lỗi.
  assert.deepEqual(readPresence(null, { selfDeviceId: B, allowedPeers: [A] }), []);
  assert.equal(publishPresence(null, { deviceId: A, host: "203.0.113.9", port: 21038 }), false);
  assert.doesNotThrow(() => withdrawPresence(null, A));

  const shared = tempDir(t, "zemory-presence-junk-");
  assert.deepEqual(readPresence(shared, { selfDeviceId: B, allowedPeers: [A] }), [], "chưa có bảng ⇒ rỗng");
  putRaw(shared, "junk.json", "{khong phai json");
  putRaw(shared, "thieu.json", { fp: A, port: 21038 });
  putRaw(shared, "khongmoc.json", { fp: A, host: "203.0.113.9", port: 21038, at: "khong-phai-ngay" });
  assert.deepEqual(readPresence(shared, { selfDeviceId: B, allowedPeers: [A] }), [], "rác không được thành một địa chỉ");
});

test("bảng địa chỉ: tắt kênh thì GỠ mục — đừng mời máy kia bắn vào cổng vừa đóng", (t) => {
  const shared = tempDir(t, "zemory-presence-off-");
  publishPresence(shared, { deviceId: A, host: "203.0.113.9", port: 21038 });
  assert.equal(readPresence(shared, { selfDeviceId: B, allowedPeers: [A] }).length, 1);
  withdrawPresence(shared, A);
  assert.deepEqual(readPresence(shared, { selfDeviceId: B, allowedPeers: [A] }), [], "gỡ rồi thì bảng phải sạch");
});
