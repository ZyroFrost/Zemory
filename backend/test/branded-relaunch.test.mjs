// `zemory ui` CHẠY DƯỚI `node.exe` ⇒ TỰ GIAO CHO `dist/zemory.exe` (2026-10-07).
//
// Sự cố: agent bật lại daemon bằng `zemory ui` (shim npm ⇒ node.exe) — Task Manager hiện "Node.js JavaScript Runtime
// (4)" với logo Node và các con WebView2, thay vì nhóm Zemory. Autostart và selfupdate đã chọn `zemory.exe`; riêng đường
// gõ tay thì không. User: *"sao nó lại hiện sai tên và sai logo… cần thì phải có cổng kiểm cái này"*.
// Ba tầng: hàm phán (thuần) · lệnh CLI thật (đường dry-run không phóng gì) · neo nguồn — `case "ui"` phải gọi nó TRƯỚC startUi.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { judgeLaunch, needsBrandedRelaunch } from "../../dist/platform/autostart.js";

const BRANDED = "D:\\z\\dist\\zemory.exe";
const base = { platform: "win32", execPath: "C:\\Program Files\\nodejs\\node.exe", brandedExe: BRANDED, exists: () => true, env: {} };

test("node.exe on Windows with a branded exe present ⇒ relaunch", () => {
  assert.equal(needsBrandedRelaunch(base), true);
});

test("NEGATIVE: already branded, the relaunched child, no branded exe, or not Windows ⇒ start in place", () => {
  assert.equal(needsBrandedRelaunch({ ...base, execPath: BRANDED }), false, "đã là zemory.exe");
  assert.equal(needsBrandedRelaunch({ ...base, execPath: "d:/z/dist/ZEMORY.EXE" }), false, "khác hoa thường / dấu gạch vẫn là một tệp");
  assert.equal(needsBrandedRelaunch({ ...base, env: { ZEMORY_BRANDED: "1" } }), false, "con đã phóng lại ⇒ không lặp vô hạn");
  assert.equal(needsBrandedRelaunch({ ...base, exists: () => false }), false, "chưa dựng exe ⇒ chạy bằng node, app không được chết vì logo");
  assert.equal(needsBrandedRelaunch({ ...base, platform: "linux" }), false);
});

test("CLI: `zemory ui` under node.exe hands over to dist/zemory.exe (dry run starts nothing)", { skip: process.platform !== "win32" || !existsSync(new URL("../../dist/zemory.exe", import.meta.url)) }, () => {
  const cli = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");
  const r = spawnSync(process.execPath, [cli, "ui", "--no-window"], {
    encoding: "utf8",
    timeout: 60_000,
    env: { ...process.env, ZEMORY_RELAUNCH_DRYRUN: "1", ZEMORY_BRANDED: "" },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /started under .*zemory\.exe .*cli\.js ui --no-window/i, "phải giao cho zemory.exe, giữ nguyên đối số");
});

// CỔNG CÀI ĐẶT (`zemory doctor` › launch): tên + logo đúng ở mọi chỗ, không bộ cài thừa (user 2026-10-07).
const good = {
  brandedExe: BRANDED,
  uiProcesses: [BRANDED],
  startupVbs: `sh.Run """${BRANDED}"" ""D:\\z\\dist\\cli.js"" ui", 0, False`,
  launcherVbs: `sh.Run """${BRANDED}"" ""D:\\z\\dist\\cli.js"" ui", 0, False`,
  iconMissing: false,
  strays: [],
};

test("judgeLaunch: a clean install has no finding", () => {
  assert.deepEqual(judgeLaunch(good), []);
  assert.deepEqual(judgeLaunch({ ...good, startupVbs: null, launcherVbs: null, uiProcesses: [] }), [], "chưa cài / daemon tắt ⇒ không phải lỗi");
});

test("judgeLaunch: each measured breach is reported (node.exe daemon · stale launchers · missing icon · leftover file)", () => {
  const node = "C:\\Program Files\\nodejs\\node.exe";
  const found = judgeLaunch({
    ...good,
    uiProcesses: [BRANDED, node],
    startupVbs: `sh.Run """${node}"" ""x\\cli.js"" ui"`,
    launcherVbs: `sh.Run """${node}"" ""x\\cli.js"" ui"`,
    iconMissing: true,
    strays: ["C:\\a\\zemory\\launch.vbs.bak-move2"],
  });
  assert.equal(found.length, 5, found.join("\n"));
  assert.match(found[0], /daemon runs as .*node\.exe/);
  assert.ok(found.some((f) => /Startup launcher/.test(f)));
  assert.ok(found.some((f) => /Start Menu\/Desktop launcher/.test(f)));
  assert.ok(found.some((f) => /icon/.test(f)));
  assert.ok(found.some((f) => /leftover launcher file .*bak-move2/.test(f)));
});

test("source anchor: the `ui` case calls relaunchBranded BEFORE startUi", () => {
  const src = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
  const ui = src.slice(src.indexOf('case "ui"'));
  const r = ui.indexOf("relaunchBranded(");
  const s = ui.indexOf("startUi(");
  assert.ok(r > 0 && s > 0 && r < s, "`case \"ui\"` phải thử relaunchBranded trước khi tự dựng daemon");
});
