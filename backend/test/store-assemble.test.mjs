// `zemory store assemble`: the command a repo runs after changing a part on HS, so the sets never fall behind (the gate's
// "every set folder is up to date with the store" went red twice on 2026-10-22, a slot and a skill written by two repos).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));
const run = (...a) => spawnSync(process.execPath, [CLI, ...a], { encoding: "utf8" });

test("a wrong use names the command and fails", () => {
  const r = run("store", "rebuild");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /usage: zemory store assemble/);
});

test("a second pass over sets already built from HS rebuilds nothing", () => {
  run("store", "assemble");
  const r = run("store", "assemble");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /every set already matches HS/);
});
