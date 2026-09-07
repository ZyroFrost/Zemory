// dist/zemory.exe — the branded runtime that makes Task Manager show "Zemory" (name, icon, ONE
// group) instead of "Node.js JavaScript Runtime (6)". Pure parts only: the copy+rcedit step
// needs Windows and ~80 MB, so it is verified live after a build, not here.
import test from "node:test";
import assert from "node:assert/strict";
import { exeMetadata, stampFor } from "../scripts/make-exe.mjs";
import { launcherExe, launcherStale } from "../../dist/platform/autostart.js";

test("a launcher on disk that still names node.exe is stale once zemory.exe exists — and the on/off reconcile alone cannot see that", () => {
  const exe = "D:\\repo\\dist\\zemory.exe";
  const old = 'sh.Run """C:\\Program Files\\nodejs\\node.exe"" ""D:\\repo\\dist\\cli.js"" ui", 0, False';
  const fresh = 'sh.Run """D:\\repo\\dist\\zemory.exe"" ""D:\\repo\\dist\\cli.js"" ui", 0, False';
  assert.equal(launcherStale(old, exe), true, "measured 2026-09-07: Startup vbs kept node.exe across a restart");
  assert.equal(launcherStale(fresh, exe), false);
  assert.equal(launcherStale(null, exe), false, "no file ⇒ nothing to refresh; enabling is the on/off path's job");
});

test("version resource says Zemory everywhere Task Manager and Explorer look", () => {
  const m = exeMetadata({ version: "2.14.0" });
  const vs = m["version-string"];
  // FileDescription is the string Task Manager's Processes tab shows; ProductName is what
  // Explorer's Details tab and the taskbar group tooltip show. Both must be the brand.
  assert.equal(vs.FileDescription, "Zemory");
  assert.equal(vs.ProductName, "Zemory");
  assert.equal(vs.OriginalFilename, "zemory.exe");
  assert.doesNotMatch(JSON.stringify(vs), /Node\.js JavaScript Runtime/, "the runtime's own description must not leak through");
  assert.equal(m["file-version"], "2.14.0.0", "Windows wants four numeric parts");
  assert.equal(m["product-version"], "2.14.0");
});

test("a pre-release or odd version still yields a valid four-part file version", () => {
  assert.equal(exeMetadata({ version: "3.0.0-beta.1" })["file-version"], "3.0.0.0");
  assert.equal(exeMetadata({}) ["file-version"], "0.0.0.0");
});

test("stamp changes when Node or the app version changes — that is what triggers a rebuild", () => {
  const a = stampFor({ version: "2.14.0" });
  const b = stampFor({ version: "2.14.1" });
  assert.equal(a.node, process.version);
  assert.notEqual(JSON.stringify(a), JSON.stringify(b));
});

test("launchers prefer the branded exe on Windows and fall back to node when it is missing", () => {
  const node = "C:\\Program Files\\nodejs\\node.exe";
  const exe = "D:\\repo\\dist\\zemory.exe";
  assert.equal(launcherExe({ platform: "win32", brandedExe: exe, exists: () => true, fallback: node }), exe);
  assert.equal(launcherExe({ platform: "win32", brandedExe: exe, exists: () => false, fallback: node }), node, "missing exe must never block startup");
  assert.equal(launcherExe({ platform: "linux", brandedExe: exe, exists: () => true, fallback: "/usr/bin/node" }), "/usr/bin/node", "a PE resource patch means nothing off Windows");
});
