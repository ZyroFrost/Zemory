// Native and Docker are backups of each other and never run at the same time (plan/30 §0, user 2026-10-22: the trial
// ran the machine out of RAM). /ping says the runtime; the other install's daemon on the port is refused, never joined.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { foreignRuntime, otherRuntimeMessage, RUNTIME, runtimeOf } from "../../dist/util/runtime.js";

test("this test process is the native runtime (no ZEMORY_RUNTIME)", () => {
  assert.equal(RUNTIME, "native");
});

test("a ping from the Docker install is foreign; one from this install, or with no runtime field, is not", () => {
  assert.equal(foreignRuntime({ app: "zemory", runtime: "docker" }), "docker");
  assert.equal(foreignRuntime({ app: "zemory", runtime: "native" }), null);
  assert.equal(foreignRuntime({ app: "zemory" }), null, "a daemon from before the field is native");
  assert.equal(foreignRuntime({ app: "other", runtime: "docker" }), null, "NEGATIVE: not a zemory daemon");
  assert.equal(foreignRuntime(null), null);
  assert.equal(runtimeOf({ runtime: "weird" }), "native");
});

test("the refusal names the other install and how to stop it", () => {
  assert.match(otherRuntimeMessage("docker", 4444), /zemory \(docker\) is already running on port 4444.*docker compose stop/s);
  assert.match(otherRuntimeMessage("native", 4444), /tray icon/);
});

test("the daemon refuses the other install instead of joining it; heavy CLI writes refuse too (source anchors)", () => {
  const ui = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  assert.match(ui, /runtime: RUNTIME, \.\.\.liveFlags\(\)/, "/ping says the runtime");
  assert.match(ui, /if \(running\.runtime !== RUNTIME\) \{\s*console\.log\(`zemory ui — \$\{otherRuntimeMessage/);
  const mem = readFileSync(new URL("../src/commands/memory.ts", import.meta.url), "utf8");
  assert.match(mem, /if \(HEAVY_WRITES\.has\(sub\)\) \{\s*const other = await otherInstall\(\);/);
  assert.match(readFileSync(new URL("../../Dockerfile", import.meta.url), "utf8"), /ZEMORY_RUNTIME=docker/);
});
