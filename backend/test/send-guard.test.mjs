// CHỐT NHẮN TIN GIỮA CÁC SESSION (user chốt 2026-10-07): cấm chủ động nhắn session mang tên mặc định
// `<thư mục>-<2 hex>`; trả lời qua địa chỉ `from` (`uds:…`) luôn qua. Ba tầng: hàm phán · lệnh CLI thật
// (exit 2 + stderr — đúng giao thức PreToolUse) · bộ cài cắm đúng matcher ở settings của user.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { judgeSendTarget } from "../../dist/memory/send-guard.js";
import { installHooks, uninstallHooks } from "../../dist/memory/capture-hook.js";
import { tempDir } from "./helpers.mjs";

test("auto-named sessions are blocked — with and without the [ref] tail", () => {
  const leaked = ["dept-fa-09", "db-datawarehouse-5e", "zemory-5f", "dept-fa-6f [b9f38d]", "sasinflow-58"].filter(
    (to) => judgeSendTarget(to) === null,
  );
  assert.deepEqual(leaked, [], "lọt: " + leaked.join(", "));
});

test("NEGATIVE: a from-address reply, main, an agent id and user-chosen names pass", () => {
  const wrong = [
    "uds:\\\\.\\pipe\\LOCAL\\cc-msg-8ea59120ea38f23ec87c66ac2f2e0d05",
    "main",
    "a68a00cdae74fb9cb",
    "kho-dw",
    "researcher",
    "dept-ops-main",
    "",
  ].filter((to) => judgeSendTarget(to) !== null);
  assert.deepEqual(wrong, [], "chặn nhầm: " + wrong.join(" | "));
});

test("CLI: `zemory hook send-guard` exits 2 with the reason for an auto name, 0 for a reply", () => {
  const cli = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");
  const run = (to) =>
    spawnSync(process.execPath, [cli, "hook", "send-guard"], {
      input: JSON.stringify({ tool_name: "SendMessage", tool_input: { to, message: "x" } }),
      encoding: "utf8",
      timeout: 60_000,
    });
  const bad = run("dept-fa-09");
  assert.equal(bad.status, 2, "tên mặc định ⇒ exit 2 (PreToolUse chặn)");
  assert.match(bad.stderr, /AUTO-NAMED/, "lý do phải ra stderr cho agent đọc");
  assert.equal(run("uds:\\\\.\\pipe\\LOCAL\\cc-msg-x").status, 0, "trả lời qua from ⇒ qua");
});

test("installer wires PreToolUse/SendMessage once, and uninstall removes it", (t) => {
  const dir = tempDir(t, "zemory-sendguard-");
  const p = join(dir, "settings.json");
  writeFileSync(p, JSON.stringify({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node x.cjs" }] }] } }));
  installHooks(p);
  installHooks(p); // lần hai không được nhân đôi
  const pre = JSON.parse(readFileSync(p, "utf8")).hooks.PreToolUse;
  const ours = pre.filter((g) => g.hooks.some((h) => h.command === "zemory hook send-guard"));
  assert.equal(ours.length, 1, "đúng MỘT móc send-guard");
  assert.equal(ours[0].matcher, "SendMessage", "matcher phải là SendMessage — thiếu matcher là móc vào MỌI công cụ");
  assert.ok(pre.some((g) => g.matcher === "Bash"), "móc sẵn có của user phải còn nguyên");
  uninstallHooks(p);
  const after = JSON.parse(readFileSync(p, "utf8")).hooks.PreToolUse;
  assert.ok(!after.some((g) => g.hooks.some((h) => h.command === "zemory hook send-guard")), "gỡ ⇒ hết móc");
  assert.ok(after.some((g) => g.matcher === "Bash"), "gỡ không được đụng móc của user");
});
