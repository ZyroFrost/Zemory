// FLAG MỘT-LẦN PHẢI CHỊU ĐƯỢC MỘT LẦN THỬ LẠI — nhưng chỉ cho ĐÚNG việc đã xin.
//
// Lỗ đo được 2026-08-20 ngay lúc push 2.0.0: hook PreToolUse chỉ nói CHO QUA, nó không biết lệnh
// có thực sự chạy hay không. Guard cho qua (ăn mất flag) rồi một tầng khác của host chặn lệnh lại
// ⇒ lệnh KHÔNG chạy mà flag ĐÃ MẤT, phải đi xin user lần nữa cho cùng một việc họ vừa đồng ý.
// Hướng sai ở đây là "phải xin lại", không phải "lọt qua" — an toàn, nhưng bắt user trả lời hai
// lần cho một câu là đúng thứ `02_RULES §Hành xử` gọi là LỖI, không phải cẩn thận.
//
// Chỗ tinh tế: nới lỏng kiểu này rất dễ biến thành "mở cửa 90 giây cho mọi thứ". Nên flag đóng
// dấu VÂN TAY CỦA VIỆC: cùng lệnh + trong cửa sổ ⇒ cho qua; khác lệnh ⇒ thu hồi ngay lập tức.
//
// Toàn bộ file chạy trên REPO TẠM, không đụng `docs/hooks/` của repo đang làm việc: bản đầu dùng
// flag thật và làm ĐỎ một file test khác chạy song song (`node --test` chạy các file cùng lúc,
// hai bên giành chung một tài nguyên thật). Test không được để lại dấu vết ngoài thư mục của nó.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { generateGuards } from "../../dist/docs/guard-gen.js";
import { tempDir } from "./helpers.mjs";

// Ghép từ mảnh: chuỗi nguyên vẹn trong file sẽ bị chính guard chặn khi agent đọc/ghi file này.
const PUSH = "git " + "push origin main";
const OTHER = "git " + "push origin release";

function repo(t) {
  const root = tempDir(t, "zemory-flag-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(
    join(root, "docs", ".harness.json"),
    JSON.stringify({ layout: "app", docs: "docs/agent", protected: ["data"] }),
  );
  return generateGuards(root);
}
// `cwd` PHẢI là gốc repo tạm, không phải cwd của lượt test. Guard đổi đường trong câu lệnh sang
// đường tương đối bằng `path.relative(ROOT, tok)`, mà `tok` tương đối thì Node giải theo `cwd` —
// chạy với cwd ở repo zemory (ổ D:) trong khi ROOT là repo tạm (ổ C:) thì `path.relative` qua hai
// ổ trả về đường TUYỆT ĐỐI, không khớp đường protected nào ⇒ mọi ca đường-dẫn lọt sạch, và ca test
// trông như "guard không chặn" trong khi thực tế cwd luôn là gốc repo. (Ca `git push` không dính vì
// nó không đụng đường dẫn — đó là lý do lỗ này ở đây lâu mà không ai thấy.)
const blocked = (r, command) =>
  spawnSync(process.execPath, [join(r.hooksDir, "guard.cjs")], {
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
    encoding: "utf8",
    cwd: join(r.hooksDir, "..", ".."),
  }).status === 2;
const giveFlag = (r) => writeFileSync(join(r.hooksDir, ".allow-push"), "user dong y (test)\n");
const flagExists = (r) => existsSync(join(r.hooksDir, ".allow-push"));

test("flag chịu được MỘT LẦN THỬ LẠI cho cùng một việc (hook không biết lệnh có chạy hay không)", (t) => {
  const r = repo(t);
  assert.ok(blocked(r, PUSH), "không flag ⇒ phải chặn");
  giveFlag(r);
  assert.ok(!blocked(r, PUSH), "có flag ⇒ lần đầu cho qua");
  assert.ok(!blocked(r, PUSH), "THỬ LẠI cùng lệnh ⇒ vẫn cho qua (đây chính là lỗ đã vá)");
});

test("flag KHÔNG thành cửa mở 90 giây: việc KHÁC dùng ké là bị thu hồi ngay", (t) => {
  const r = repo(t);
  giveFlag(r);
  assert.ok(!blocked(r, PUSH), "xin cho việc A");
  assert.ok(blocked(r, OTHER), "việc B mượn flag của A ⇒ phải CHẶN");
  assert.ok(!flagExists(r), "và flag bị thu hồi khỏi đĩa, không để lại cửa hé");
  assert.ok(blocked(r, PUSH), "kể cả việc A cũng phải xin lại sau khi flag bị thu hồi");
});

// ĐỔI TÊN TRONG ĐƯỜNG PROTECTED — user cấp cờ là PHẢI QUA ĐƯỢC.
//
// Báo từ repo `WorkSpace/Dept_OPS` ngày 2026-09-04: không thể `mv`/đổi tên một file trong đường
// `protected_write`, DÙ CẤP CỜ BAO NHIÊU LẦN. Cơ chế: `flagWritePath` đóng vân tay theo TỪNG
// ĐƯỜNG, mà `mv A B` chạm HAI đường ⇒ ① nguồn `A` đóng dấu sha1(A) và cho qua · ② đích `B` thấy
// dấu khác ⇒ XOÁ cờ và chặn. Lượt sau nguồn lại ăn cờ mới trước ⇒ vòng lặp không thoát.
// Cửa sổ 90 giây không cứu được, vì nguồn tiêu thụ một cờ MỚI mỗi lượt.
//
// Đây là BUG chứ không phải chính sách: chính thông báo của guard mời user tạo cờ, tức thiết kế
// CÓ Ý cho user duyệt là qua được. Một cổng hứa mở mà không mở nổi thì đẩy người ta đi gỡ luôn
// đường khỏi `protected` — mất nhiều hơn được ("gate nhiễu ⇒ gate bị bỏ qua").
const MV_IN = "mv " + "data/a.txt data/b.txt"; // hai đầu ĐỀU trong `protected: ["data"]`
const MV_OTHER = "mv " + "data/x.txt data/y.txt";
const giveDocsFlag = (r) => writeFileSync(join(r.hooksDir, ".allow-docs-write"), "user dong y (test)\n");
const docsFlagExists = (r) => existsSync(join(r.hooksDir, ".allow-docs-write"));

test("đổi tên TRONG protected: một cờ phủ CẢ nguồn lẫn đích (trước đây chặn vĩnh viễn)", (t) => {
  const r = repo(t);
  assert.ok(blocked(r, MV_IN), "không cờ ⇒ phải chặn (cả nguồn và đích đều trong protected)");
  giveDocsFlag(r);
  assert.ok(!blocked(r, MV_IN), "có cờ ⇒ PHẢI QUA — đây chính là chỗ trước đây không bao giờ qua được");
  assert.ok(!blocked(r, MV_IN), "thử lại đúng lệnh đó ⇒ vẫn qua (cửa sổ 90s)");
});

test("CA ÂM: cờ cho lệnh đổi tên này KHÔNG được dùng ké cho lệnh đổi tên KHÁC", (t) => {
  const r = repo(t);
  giveDocsFlag(r);
  assert.ok(!blocked(r, MV_IN), "xin cho đúng lệnh A");
  assert.ok(blocked(r, MV_OTHER), "lệnh B mượn cờ của A ⇒ phải CHẶN — vá không được nới thành cửa mở");
  assert.ok(!docsFlagExists(r), "và cờ bị thu hồi khỏi đĩa");
});

test("CA ÂM: vá này KHÔNG mở đường cho ghi vào protected khi chưa có cờ", (t) => {
  const r = repo(t);
  assert.ok(blocked(r, "cp " + "README.md data/keo-vao.txt"), "chép VÀO protected: không cờ ⇒ chặn");
  assert.ok(blocked(r, "mv " + "data/a.txt /tmp/ra-ngoai.txt"), "dời RA KHỎI protected: không cờ ⇒ chặn");
  assert.ok(blocked(r, "echo x > " + "data/ghi-de.txt"), "chuyển hướng vào protected: không cờ ⇒ chặn");
});

// XOÁ TRONG PROTECTED: CHẶN RỒI XIN PHÉP LÀ ĐƯỢC (user chốt 2026-09-04).
//
// Trước đây nhánh này `deny()` TUYỆT ĐỐI, không một đường cờ nào — kể cả `.allow-delete`. Hai lẽ
// khiến đó là sai: ① KHÔNG NHẤT QUÁN — `mv <protected>/x /tmp` có hậu quả Y HỆT xoá (chính chú
// thích của nhánh đó viết vậy) mà nó LẠI CÓ đường cờ, nên người ta học cách đi đường `mv`;
// ② trái doctrine `02_RULES §Guardrail` (*chữ là tầng QUYẾT ĐỊNH, máy là tầng ĐỠ HỤT*) — một cổng
// không có đường cho user duyệt là máy đang làm NGƯỜI QUYẾT.
const RM_IN = "rm " + "data/a.txt";
const RM_OTHER = "rm " + "data/b.txt";
const giveDelFlag = (r) => writeFileSync(join(r.hooksDir, ".allow-delete"), "user dong y (test)\n");

test("xoá trong protected: không cờ ⇒ CHẶN · có `.allow-delete` ⇒ QUA", (t) => {
  const r = repo(t);
  assert.ok(blocked(r, RM_IN), "không cờ ⇒ phải chặn");
  giveDelFlag(r);
  assert.ok(!blocked(r, RM_IN), "user đã duyệt ⇒ PHẢI QUA (trước đây không có đường nào)");
});

test("CA ÂM: cờ GHI không được biến thành cờ XOÁ", (t) => {
  const r = repo(t);
  giveDocsFlag(r); // `.allow-docs-write` — duyệt GHI vào protected
  assert.ok(blocked(r, RM_IN), "duyệt ghi KHÔNG phải duyệt xoá ⇒ vẫn chặn");
  assert.ok(docsFlagExists(r), "và không được tiêu thụ oan cờ ghi của người ta");
});

test("CA ÂM: cờ xoá cho lệnh này không dùng ké cho lệnh xoá KHÁC", (t) => {
  const r = repo(t);
  giveDelFlag(r);
  assert.ok(!blocked(r, RM_IN), "xin cho đúng lệnh A");
  assert.ok(blocked(r, RM_OTHER), "lệnh B mượn cờ của A ⇒ phải CHẶN");
});

test("CA ÂM: một cờ xoá KHÔNG mở cửa cho phần còn lại của cùng câu lệnh", (t) => {
  const r = repo(t);
  giveDelFlag(r);
  // Bản nháp đầu của tôi dùng `return` ở nhánh protected ⇒ thoát CẢ hàm guard, bỏ qua luôn phép
  // kiểm secret của token còn lại. Ca này khoá đúng chỗ đó.
  assert.ok(
    blocked(r, "rm " + "data/a.txt .env"),
    "xoá kèm file secret ⇒ phải chặn, cờ xoá không được che token secret",
  );
});

test("hết cửa sổ thì flag chết hẳn — không có chuyện để quên rồi dùng lại sau", async (t) => {
  const r = repo(t);
  giveFlag(r);
  assert.ok(!blocked(r, PUSH));
  // đẩy dấu thời gian lùi quá cửa sổ (90s) — mô phỏng "để đó rồi mai chạy"
  const { readFileSync } = await import("node:fs");
  const f = join(r.hooksDir, ".allow-push");
  writeFileSync(f, readFileSync(f, "utf8").replace(/(\d{10,})/, String(Date.now() - 120_000)));
  assert.ok(blocked(r, PUSH), "quá cửa sổ ⇒ chặn, phải xin lại");
});
