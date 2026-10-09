// `zemory <command> --help` prints help and RUNS NOTHING (reported from Dept_IC 2026-10-09: `zemory init --help` ran a real
// init — no command read the flag, unknown flags are ignored). Decided once in cli.ts, so every writing command is tried here
// in an EMPTY folder: afterwards the folder must still be empty.
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { tempDir } from "./helpers.mjs";

const CLI = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const run = (cwd, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8", timeout: 60_000 });

test("--help and -h print the command's usage and write nothing — for every writing command", (t) => {
  for (const args of [["init", "--help"], ["init", "-h"], ["init", "--non-app", "--help"], ["sync", "--help"], ["archive", "--help"], ["reindex", "--help"],
    ["hook", "guard", "--help"], ["setup", "--help"], ["project", "move", "a", "b", "--apply", "--help"]]) {
    const cwd = tempDir(t, "zemory-help-");
    const r = run(cwd, ...args);
    assert.equal(r.status, 0, args.join(" ") + " — " + r.stderr);
    assert.match(r.stdout, new RegExp("zemory " + args[0] + " — nothing was run"), args.join(" "));
    assert.deepEqual(readdirSync(cwd), [], args.join(" ") + " created files");
  }
});

test("NEGATIVE: without the flag the command still runs (init scaffolds)", (t) => {
  const cwd = tempDir(t, "zemory-help-");
  const r = run(cwd, "init");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(readdirSync(cwd).length > 0, "init must still scaffold when no help flag is given");
});
