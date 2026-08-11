// Start-with-OS integration (plan 14 §B). We can only safely exercise the
// current platform's path; the test points HOME/APPDATA at a temp dir so it never
// touches the real Startup folder / LaunchAgents / autostart.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { platform } from "node:os";
import test from "node:test";
import { tempDir } from "./helpers.mjs";

function sandboxHome(t) {
  const home = tempDir(t, "zemory-autostart-");
  const save = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.APPDATA = home;
  process.env.XDG_CONFIG_HOME = home;
  t.after(() => {
    for (const k of Object.keys(save)) {
      if (save[k] === undefined) delete process.env[k];
      else process.env[k] = save[k];
    }
  });
  return home;
}

test("enable creates an OS autostart entry; disable removes it; status tracks it", async (t) => {
  sandboxHome(t);
  const { autostartStatus, setAutostart } = await import("../../dist/platform/autostart.js");
  const before = autostartStatus();
  if (!before.supported) {
    // Unknown OS — just assert it fails open, don't force a mechanism.
    assert.equal(before.enabled, false);
    return;
  }
  assert.equal(before.enabled, false, "starts disabled");

  const on = setAutostart(true);
  assert.equal(on.enabled, true, "enabled after setAutostart(true)");
  assert.ok(on.path && existsSync(on.path), "the OS entry file exists on disk");

  assert.equal(autostartStatus().enabled, true, "status reflects enabled");

  const off = setAutostart(false);
  assert.equal(off.enabled, false, "disabled after setAutostart(false)");
  assert.ok(!on.path || !existsSync(on.path), "the OS entry file is gone");
});

// Regression 2026-08-05: `desktopDir()` hardcoded <home>\Desktop, but company
// Windows REDIRECTS Desktop into OneDrive and then <home>\Desktop does not exist —
// writing the .lnk threw DirectoryNotFoundException, and because Desktop was written
// FIRST the Start Menu entry was never attempted either. Read-only on purpose: it
// resolves the path, it must not create anything.
test("the Desktop shortcut resolves to a folder that actually EXISTS", async () => {
  if (platform() !== "win32") return;
  const { desktopShortcutStatus } = await import("../../dist/platform/autostart.js");
  const { dirname } = await import("node:path");
  const st = desktopShortcutStatus();
  assert.ok(st.path, "a shortcut path is resolved");
  assert.ok(existsSync(dirname(st.path)), `Desktop folder must exist, got ${dirname(st.path)}`);
});

// Neo vào `.vbs`, KHÔNG phải `.cmd`. Đổi từ 2026-08-10 và là bản vá GỐC của vụ "daemon chết
// không lời trăng trối": `start "" /b` trong .cmd KHÔNG tách tiến trình — daemon chạy trong
// cùng console nên console đóng là bị `TerminateProcess`, không handler nào kịp chạy. Bản .vbs
// dùng `WshShell.Run(cmd, 0, False)` sinh tiến trình MỒ CÔI, sống độc lập.
//
// Test này neo `.cmd` tới tận 11/08 mới lộ, vì gate không chạy được từ ~05/08 (hook bật chặn).
// Bài học: ĐỔI CÁCH LÀM thì phải ĐỔI NEO TEST trong cùng thay đổi — không thì cổng canh một
// bản đã chết, và nó sẽ đỏ oan đúng lúc người ta cần nó nói thật.
test("the Windows entry, when on this OS, is a Startup .vbs that launches `ui` detached", async (t) => {
  if (platform() !== "win32") return;
  sandboxHome(t);
  const { setAutostart } = await import("../../dist/platform/autostart.js");
  const { readFileSync } = await import("node:fs");
  const st = setAutostart(true);
  assert.match(st.path, /Startup[\\/]zemory\.vbs$/, "entry is a Startup .vbs");
  assert.equal(st.method, "startup-vbs", "method phải nói đúng cơ chế đang dùng");
  const body = readFileSync(st.path, "utf8");
  // Nháy ĐÔI-ĐÔI: trong VBS mỗi `"` của lệnh phải viết thành `""`, nên chuỗi thật là
  // `…cli.js"" ui`. Mẫu cũ (`cli\.js" ui`) hợp với .cmd chứ không hợp .vbs.
  assert.match(body, /cli\.js"{1,2} ui/, "the .vbs launches the zemory UI daemon");
  // Neo vào THỨ QUYẾT ĐỊNH, không neo vào tên biến (bản thật đặt là `sh`): phải gọi qua
  // WScript.Shell và tham số cuối phải là `False` — đó chính là chỗ KHÔNG chờ tiến trình con,
  // tức thứ làm daemon sống mồ côi. Đổi `False` thành `True` là quay lại đúng con bug cũ.
  assert.match(body, /WScript\.Shell/i, "phải dùng WScript.Shell");
  assert.match(body, /\.Run\b[^\n]*,\s*0,\s*False/i, "phải Run(..., 0, False) — cửa TÁCH tiến trình");
  setAutostart(false);
});
