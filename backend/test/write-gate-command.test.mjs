// WRITE-GATE ở TẦNG LỆNH — chỗ `cli-write-lock.test.mjs` không phủ.
//
// Bộ test cũ chỉ kiểm tầng HÀM: `acquireCliWriteLock` có trả `ok:false` khi tiến trình khác
// giữ không. Nó trả đúng — nhưng NGƯỜI GỌI lại bỏ qua lời từ chối đó, nên khoá đúng mà cửa
// vẫn mở. Bắt được ĐANG XẢY RA 2026-08-08: hai `memory embed --all` cùng ghi một kho (một do
// chạy tay, một do daemon sinh khi user bật app) — đúng tổ hợp đã hỏng kho 2026-08-03.
//
// Hai đường vào phải cùng được chặn, vì mỗi đường thủng một kiểu:
//   ① CLI thường  — trước đây chờ 2 phút rồi CHẠY LUÔN; với job dài hàng giờ thì nhánh
//                   "chạy luôn" là nhánh LUÔN LUÔN được chọn.
//   ② con của daemon (`ZEMORY_DAEMON_CHILD=1`) — trước đây bỏ qua SẠCH write-gate, kể cả
//                   khoá của CLI ngoài. Đây mới là nguyên nhân gốc của ca trên.
//
// Chạy lệnh THẬT qua `dist/cli.js` trong tiến trình con: test này phải soi hành vi của lệnh
// người dùng gõ, không phải một hàm được gọi lại trong test.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { tempDir } from "./helpers.mjs";

const CLI = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");

/** Kho tạm + một khoá ghi do tiến trình KHÁC (còn sống) đang giữ. */
function lockedStore(t) {
  const dir = tempDir(t, "zemory-gate-cmd-");
  mkdirSync(dir, { recursive: true });
  // pid của CHÍNH tiến trình test: chắc chắn còn sống ⇒ khoá là TƯƠI, không phải mồ côi.
  writeFileSync(join(dir, "cli-write.lock"), JSON.stringify({ pid: process.pid, label: "embed", at: Date.now() }));
  return dir;
}

const runCli = (dir, args, env = {}) =>
  spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, GLOBAL_MEMORY_DB: join(dir, "m.db"), ...env },
    timeout: 120_000,
  });

test("CLI thường: khoá TƯƠI của tiến trình khác ⇒ DỪNG, không ghi đè", (t) => {
  const dir = lockedStore(t);
  const r = runCli(dir, ["memory", "digest"]);
  const out = `${r.stdout}${r.stderr}`;

  assert.match(out, /DỪNG|tiến trình khác đang ghi/i, `phải từ chối rõ ràng, nhận:\n${out.slice(0, 400)}`);
  assert.equal(r.status, 1, "phải thoát mã 1 để người gọi/script biết là KHÔNG chạy");
  assert.doesNotMatch(out, /chạy tiếp|chạy luôn/i, "không được tự cho phép chạy đè khi khoá còn tươi");
});

test("CLI thường + --force: người dùng ép thì được chạy (đường vượt CÓ Ý THỨC)", (t) => {
  const dir = lockedStore(t);
  const r = runCli(dir, ["memory", "digest", "--force"]);
  const out = `${r.stdout}${r.stderr}`;
  assert.doesNotMatch(out, /DỪNG/i, `--force phải đi qua được, nhận:\n${out.slice(0, 300)}`);
});

test("con của DAEMON: cũng phải nhường CLI ngoài (đây là lỗ gốc)", (t) => {
  const dir = lockedStore(t);
  // Giả lập đúng cách scheduler sinh con, với pid daemon KHÁC pid đang giữ khoá.
  const r = runCli(dir, ["memory", "digest"], { ZEMORY_DAEMON_CHILD: "1", ZEMORY_DAEMON_PID: "999999" });
  const out = `${r.stdout}${r.stderr}`;
  assert.match(out, /BỎ QUA|CLI khác đang ghi/i, `job nền phải nhường, nhận:\n${out.slice(0, 400)}`);
});

test("con của daemon KHÔNG tự chặn mình: khoá do CHÍNH daemon giữ thì vẫn chạy", (t) => {
  const dir = tempDir(t, "zemory-gate-own-");
  mkdirSync(dir, { recursive: true });
  // Khoá mang pid của "daemon" — con phải nhận ra đó là khoá của mình mà đi tiếp.
  // (Trước đây gating ở đây làm con chờ CHÍNH NÓ, nên vá này không được tái lập lỗi đó.)
  writeFileSync(join(dir, "cli-write.lock"), JSON.stringify({ pid: process.pid, label: "embed", at: Date.now() }));
  const r = runCli(dir, ["memory", "digest"], { ZEMORY_DAEMON_CHILD: "1", ZEMORY_DAEMON_PID: String(process.pid) });
  const out = `${r.stdout}${r.stderr}`;
  assert.doesNotMatch(out, /BỎ QUA/i, `khoá của chính daemon không được chặn con của nó, nhận:\n${out.slice(0, 300)}`);
});
