// Periodic repo sweep (plan/28 §0q): conform · validate · todo verify per registered repo, kept in one state file that the
// gates chip reads. Report only. Runs on a repo made by the real CLI (`init --kit 04`) in a temp folder.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadRepoSweep, sweepLines, sweepRepo } from "../../dist/docs/repo-sweep.js";
import { tempDir } from "./helpers.mjs";

const cli = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");

function freshRepo(t) {
  const dir = tempDir(t, "zemory-sweep-");
  const root = join(dir, "SweepApp");
  mkdirSync(root, { recursive: true });
  spawnSync("git", ["init", "-q"], { cwd: root });
  // Own memory store: init registers the project, and that must never reach the real registry.
  const env = { ...process.env, GLOBAL_MEMORY_DB: join(dir, "store", "gm.db") };
  delete env.CLAUDE_PROJECT_DIR;
  const r = spawnSync(process.execPath, [cli, "init", "--kit", "04"], { cwd: root, env, encoding: "utf8", timeout: 120_000 });
  assert.equal(r.status, 0, r.stderr);
  return root;
}

test("a fresh kit repo: the sweep reports the unwritten constitution frames, and nothing it did not find", (t) => {
  const row = sweepRepo(freshRepo(t), "SweepApp");
  assert.ok(row, "a repo with a marker is swept");
  assert.ok(row.conform && row.conform.count >= 1, "conform blocking findings counted");
  assert.match(row.conform.first, /cons-unwritten/, "the first one names its check");
  assert.equal(row.todo?.count, 0, "a fresh ledger has nothing for todo verify");
  assert.equal(row.failed, undefined, "every check ran");
  const lines = sweepLines(row);
  assert.ok(lines.some((l) => /^conform blocking: \d+ .*`zemory conform`/.test(l)), lines.join("\n"));
});

test("NEGATIVE: a folder that is not a zemory repo is not swept; a clean row adds no line", (t) => {
  assert.equal(sweepRepo(tempDir(t, "zemory-sweep-plain-"), "plain"), null);
  assert.deepEqual(sweepLines({ root: "x", name: "x", conform: { count: 0 }, validate: { count: 0 }, todo: { count: 0 } }), []);
});

test("a check that threw is reported as not run, never read as clean", () => {
  const lines = sweepLines({ root: "x", name: "x", failed: ["validate: boom"] });
  assert.equal(lines.length, 1);
  assert.match(lines[0], /did not run — validate: boom/);
});

test("the state file reads back; a missing or foreign file reads as no sweep yet", (t) => {
  const dir = tempDir(t, "zemory-sweep-state-");
  assert.equal(loadRepoSweep(join(dir, "none.json")), null);
  writeFileSync(join(dir, "foreign.json"), JSON.stringify({ version: 2, rows: [] }));
  assert.equal(loadRepoSweep(join(dir, "foreign.json")), null);
  const state = { version: 1, at: "2026-10-17T00:00:00.000Z", rows: [{ root: "r", name: "n", todo: { count: 2, first: "a — b" } }] };
  writeFileSync(join(dir, "ok.json"), JSON.stringify(state));
  assert.deepEqual(loadRepoSweep(join(dir, "ok.json")), state);
});
