// A Start Menu / Desktop shortcut that still points at a moved install (autostart.ts shortcutStale, measured 2026-10-21:
// the repo moved, launch.vbs was rewritten, the .lnk kept the old icon path ⇒ a blank white icon in the Start Menu).
// The daemon rewrites such a shortcut on start; the launch gate names it. Source anchor: the daemon start calls it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { shortcutStale } from "../../dist/platform/autostart.js";

const ICON = "D:\\Workspace\\Personal\\Zemory\\backend\\resources\\packaging\\zemory.ico";
const OLD = "D:\\huy.nguyen\\Project\\Personal\\Zemory\\backend\\resources\\packaging\\zemory.ico";
const VBS = "C:\\Users\\u\\AppData\\Roaming\\zemory\\launch.vbs";
test("a shortcut whose icon is another install's path is stale", () => {
  assert.equal(shortcutStale({ path: "x.lnk", icon: OLD, args: `"${VBS}"` }, ICON, VBS), true);
});

test("a shortcut with no icon, or one that does not run this launcher, is stale", () => {
  assert.equal(shortcutStale({ path: "x.lnk", icon: "", args: `"${VBS}"` }, ICON, VBS), true);
  assert.equal(shortcutStale({ path: "x.lnk", icon: ICON, args: '"C:\\old\\launch.vbs"' }, ICON, VBS), true);
});

test("NEGATIVE: this install's icon (any case) and this launcher is current", () => {
  assert.equal(shortcutStale({ path: "x.lnk", icon: ICON.toLowerCase(), args: `"${VBS}"` }, ICON, VBS), false);
});

test("an install without its own icon file judges the launcher only", () => {
  assert.equal(shortcutStale({ path: "x.lnk", icon: OLD, args: `"${VBS}"` }, null, VBS), false);
});

test("the daemon start rewrites stale shortcuts (source anchor)", () => {
  const ui = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  assert.match(ui, /reconcileShortcuts\(\)/);
});
