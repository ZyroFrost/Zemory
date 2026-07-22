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

test("the Windows entry, when on this OS, is a Startup .cmd that launches `ui`", async (t) => {
  if (platform() !== "win32") return;
  sandboxHome(t);
  const { setAutostart } = await import("../../dist/platform/autostart.js");
  const { readFileSync } = await import("node:fs");
  const st = setAutostart(true);
  assert.match(st.path, /Startup[\\/]zemory\.cmd$/, "entry is a Startup .cmd");
  const body = readFileSync(st.path, "utf8");
  assert.match(body, /cli\.js" ui/, "the .cmd launches the zemory UI daemon");
  setAutostart(false);
});
