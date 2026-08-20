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
const blocked = (r, command) =>
  spawnSync(process.execPath, [join(r.hooksDir, "guard.cjs")], {
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
    encoding: "utf8",
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
