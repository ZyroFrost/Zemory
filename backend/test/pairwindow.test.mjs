// CỬA SỔ GHÉP — mã một lần, có hạn, đổi được (plan/24 §5).
//
// Đây là thứ DUY NHẤT cho một máy LẠ đi qua cửa "chưa ghép đôi", nên mọi ràng buộc của nó đều là
// ràng buộc an ninh chứ không phải tiện dụng: dùng xong là chết, hết hạn là chết, mở lại là đổi mã.
import test from "node:test";
import assert from "node:assert/strict";
import { armPairing, consumePairCode, disarmPairing, pairingWindow } from "../../dist/memory/channel/index.js";

test("mở cửa sổ ⇒ có mã 6 chữ số và có hạn", () => {
  disarmPairing();
  const now = 1_000_000;
  const w = armPairing(60_000, now);
  assert.match(w.code, /^[0-9]{6}$/);
  assert.equal(w.expiresAt, now + 60_000);
  assert.equal(pairingWindow(now).code, w.code);
});

test("DÙNG MỘT LẦN: mã đúng đi qua đúng một lượt, lượt hai là hết", () => {
  disarmPairing();
  const w = armPairing(60_000);
  assert.equal(consumePairCode(w.code), true);
  assert.equal(consumePairCode(w.code), false, "mã đã dùng không được nhận lại");
  assert.equal(pairingWindow(), null, "dùng xong thì cửa đóng");
});

test("CÓ HẠN: quá hạn là hỏng, kể cả mã đúng", () => {
  disarmPairing();
  const now = 5_000_000;
  const w = armPairing(60_000, now);
  assert.equal(consumePairCode(w.code, now + 59_999), true, "còn hạn thì qua");
  const w2 = armPairing(60_000, now);
  assert.equal(consumePairCode(w2.code, now + 60_001), false, "hết hạn thì thôi");
  assert.equal(pairingWindow(now + 60_001), null);
});

test("ĐỔI ĐƯỢC: mở lại là mã mới, mã cũ chết ngay", () => {
  disarmPairing();
  const a = armPairing(60_000);
  const b = armPairing(60_000);
  assert.notEqual(a.code, b.code, "hai lượt mở phải ra hai mã khác nhau");
  assert.equal(consumePairCode(a.code), false, "mã cũ không còn giá trị");
  assert.equal(consumePairCode(b.code), true);
});

test("CA ÂM: chưa mở cửa thì KHÔNG mã nào đi qua", () => {
  disarmPairing();
  assert.equal(pairingWindow(), null);
  for (const bad of ["000000", "123456", "", "abcdef"]) assert.equal(consumePairCode(bad), false);
});

test("CA ÂM: mã sai / sai độ dài / không phải chuỗi ⇒ từ chối, và cửa VẪN MỞ cho người gõ lại", () => {
  disarmPairing();
  const w = armPairing(60_000);
  const wrong = w.code === "000000" ? "111111" : "000000";
  assert.equal(consumePairCode(wrong), false);
  assert.equal(consumePairCode(w.code.slice(0, 5)), false, "thiếu một ký tự");
  assert.equal(consumePairCode(w.code + "0"), false, "thừa một ký tự");
  assert.equal(consumePairCode(undefined), false);
  assert.equal(consumePairCode(null), false);
  assert.ok(pairingWindow(), "gõ sai KHÔNG được làm mất cửa sổ — người ta còn gõ lại");
  assert.equal(consumePairCode(w.code), true);
});

test("huỷ tay ⇒ đóng ngay", () => {
  armPairing(60_000);
  disarmPairing();
  assert.equal(pairingWindow(), null);
});
