// plan/26 bước ③ — hợp nhất ba bên. Đây là đoạn mã DUY NHẤT trong plan được phép ghi vào file của
// repo khác, nên nó phải chứng minh hai điều ngược nhau: trộn ĐÚNG khi an toàn, và TỪ CHỐI khi không.
//
// Số làm nền: 4 repo đang mang phần tự viết, một repo +160 dòng (plan/26 §0). Một lần trộn sai ở đó
// là mất công người khác, im lặng — nên mọi ca nghi ngờ phải rơi về phía TỪ CHỐI.
import test from "node:test";
import assert from "node:assert/strict";
import { hunks, merge3 } from "../../dist/docs/standard.js";

const L = (s) => s.trim().split("\n");

test("không bên nào đổi ⇒ trả lại đúng base", () => {
  const b = L(`a\nb\nc`);
  const r = merge3(b, [...b], [...b]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.lines, b);
});

test("chỉ MÌNH đổi ⇒ giữ bản của mình", () => {
  const b = L(`a\nb\nc`);
  const mine = L(`a\nb-sua\nc`);
  const r = merge3(b, mine, [...b]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.lines, mine);
});

test("chỉ CHUẨN đổi ⇒ nhận bản chuẩn", () => {
  const b = L(`a\nb\nc`);
  const theirs = L(`a\nb\nc\nd-moi`);
  const r = merge3(b, [...b], theirs);
  assert.equal(r.ok, true);
  assert.deepEqual(r.lines, theirs);
});

test("hai bên sửa hai vùng XA nhau ⇒ giữ ĐỦ CẢ HAI", () => {
  const b = L(`dau\n1\n2\n3\n4\n5\n6\n7\n8\ncuoi`);
  const mine = L(`dau-CUA-TOI\n1\n2\n3\n4\n5\n6\n7\n8\ncuoi`);
  const theirs = L(`dau\n1\n2\n3\n4\n5\n6\n7\n8\ncuoi-CUA-CHUAN`);
  const r = merge3(b, mine, theirs);
  assert.equal(r.ok, true, r.ok ? "" : r.reason);
  assert.ok(r.lines.includes("dau-CUA-TOI"), "phần repo tự viết phải còn");
  assert.ok(r.lines.includes("cuoi-CUA-CHUAN"), "phần chuẩn mới phải vào");
});

test("CA ÂM: hai bên sửa CÙNG một dòng ⇒ TỪ CHỐI, không tự chọn bên nào", () => {
  const b = L(`a\nb\nc`);
  const r = merge3(b, L(`a\nb-cua-toi\nc`), L(`a\nb-cua-chuan\nc`));
  assert.equal(r.ok, false);
  assert.match(r.reason, /CHỒNG/);
});

test("CA ÂM: hai vùng sửa KỀ SÁT nhau vẫn TỪ CHỐI (nghiêng về phía an toàn)", () => {
  const b = L(`a\nb\nc\nd`);
  const r = merge3(b, L(`a\nb-toi\nc\nd`), L(`a\nb\nc-chuan\nd`));
  assert.equal(r.ok, false, "kề sát phải bị coi là chồng — trộn bừa ở đây là đoán");
});

test("repo thêm CẢ MỘT KHỐI ở đầu, chuẩn thêm ở cuối ⇒ còn đủ cả hai", () => {
  const b = L(`x1\nx2\nx3\nx4\nx5\nx6`);
  const mine = L(`MUC-RIENG-1\nMUC-RIENG-2\n\nx1\nx2\nx3\nx4\nx5\nx6`);
  const theirs = L(`x1\nx2\nx3\nx4\nx5\nx6\nDONG-CHUAN-MOI`);
  const r = merge3(b, mine, theirs);
  assert.equal(r.ok, true, r.ok ? "" : r.reason);
  assert.ok(r.lines.includes("MUC-RIENG-1"));
  assert.ok(r.lines.includes("DONG-CHUAN-MOI"));
  // và KHÔNG được mất dòng gốc nào
  for (const l of b) assert.ok(r.lines.includes(l), `mất dòng gốc: ${l}`);
});

test("hunks: không đổi gì ⇒ 0 đoạn", () => {
  assert.equal(hunks(L(`a\nb`), L(`a\nb`)).length, 0);
});
