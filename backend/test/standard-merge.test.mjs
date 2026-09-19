// plan/26 bước ③ — hợp nhất ba bên. Đây là đoạn mã DUY NHẤT trong plan được phép ghi vào file của
// repo khác, nên nó phải chứng minh hai điều ngược nhau: trộn ĐÚNG khi an toàn, và TỪ CHỐI khi không.
//
// Số làm nền: 4 repo đang mang phần tự viết, một repo +160 dòng (plan/26 §0). Một lần trộn sai ở đó
// là mất công người khác, im lặng — nên mọi ca nghi ngờ phải rơi về phía TỪ CHỐI.
import test from "node:test";
import assert from "node:assert/strict";
import { hunks, lostLines, merge3 } from "../../dist/docs/standard.js";

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

test("hai bên sửa Y HỆT nhau (cùng chỗ, cùng chữ) ⇒ nhận MỘT lần, không từ chối, không nhân đôi", () => {
  // Ca thật 2026-09-18: repo đã tự chép dòng `config` mà chuẩn thêm sau đó, cùng một chỗ. Git không
  // coi đó là xung đột; bản đầu của merge3 thì có, và 28 file bị đẩy sang "sửa tay" vì thế.
  const base = L("a\nb\nc");
  const mine = L("a\nb\nDÒNG CHUNG\nc\ncủa repo");
  const theirs = L("a\nb\nDÒNG CHUNG\nc");
  const r = merge3(base, mine, theirs);
  assert.ok(r.ok, "trùng khít không phải xung đột");
  assert.deepEqual(r.lines, L("a\nb\nDÒNG CHUNG\nc\ncủa repo"));
  assert.equal(r.lines.filter((l) => l === "DÒNG CHUNG").length, 1, "không được nhân đôi dòng chung");
});

test("CA ÂM: cùng chỗ mà chữ lệch MỘT ký tự ⇒ vẫn TỪ CHỐI", () => {
  const base = L("a\nb\nc");
  const r = merge3(base, L("a\nb\nDÒNG CHUNG\nc"), L("a\nb\nDÒNG CHUNG.\nc"));
  assert.equal(r.ok, false, "hai lời sửa khác nhau dù chỉ một dấu chấm");
});

// ── Repo mang BẢN CŨ của chính chữ chuẩn (cập nhật từng mảnh) ──────────────────────────────────────
const K = (...ls) => new Set(ls);

test("repo mang BẢN CŨ của một luật chuẩn (mọi dòng từng có trong template) ⇒ lấy bản chuẩn MỚI", () => {
  const base = L("a\nb\nc");
  const mine = L("a\nb\nLUẬT bản 1\nc\nriêng repo");
  const theirs = L("a\nb\nLUẬT bản 2\nc");
  const r = merge3(base, mine, theirs, K("a", "b", "c", "LUẬT bản 1", "LUẬT bản 2"));
  assert.ok(r.ok, "bản cũ ↔ bản mới của cùng một luật chuẩn không phải xung đột thật");
  assert.deepEqual(r.lines, L("a\nb\nLUẬT bản 2\nc\nriêng repo"), "lấy bản mới, và phần riêng của repo còn nguyên");
  assert.equal(r.superseded, 1);
});

test("CA ÂM: chỗ chồng có MỘT dòng repo tự viết ⇒ vẫn TỪ CHỐI", () => {
  const base = L("a\nb\nc");
  const mine = L("a\nb\nLUẬT bản 1\nrepo tự viết chen vào\nc");
  const r = merge3(base, mine, L("a\nb\nLUẬT bản 2\nc"), K("a", "b", "c", "LUẬT bản 1", "LUẬT bản 2"));
  assert.equal(r.ok, false, "một dòng tự viết là đủ để máy không được chọn");
});

test("CA ÂM: repo chỉ XOÁ một đoạn chuẩn mà chuẩn cũng sửa đoạn đó ⇒ vẫn TỪ CHỐI (không hồi sinh thứ người ta bỏ)", () => {
  const base = L("a\nLUẬT cũ\nc");
  const r = merge3(base, L("a\nc"), L("a\nLUẬT mới\nc"), K("a", "c", "LUẬT cũ", "LUẬT mới"));
  assert.equal(r.ok, false);
});

test("không truyền `known` ⇒ hành vi cũ nguyên vẹn: chồng là từ chối", () => {
  const r = merge3(L("a\nb\nc"), L("a\nb\nX1\nc"), L("a\nb\nX2\nc"));
  assert.equal(r.ok, false);
});

test("lostLines đếm theo BỘI: hai dòng trùng mà mất một thì báo đúng một", () => {
  assert.deepEqual(lostLines(["x", "x", "y"], ["x", "y"]), ["x"]);
  assert.deepEqual(lostLines(["a", "b"], ["b", "a", "c"]), []);
});
