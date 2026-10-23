// Store verification: in a CHILD, on a cadence — not `PRAGMA quick_check` inline in the daemon
// every 30 minutes. Measured 2026-09-07: that walked the 2.86 GB file ~48×/day (~137 GB) and froze
// the daemon 59–301 s after every start. Mutations guarded: (1) putting verifyMemory back in
// scheduler.ts; (2) verifying every chain again.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyDue } from "../../dist/jobs/scheduler.js";
import { openMemory } from "../../dist/memory/db.js";

const SCHED = readFileSync(new URL("../src/jobs/scheduler.ts", import.meta.url), "utf8");
const CLI = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

test("due at start-up (never verified), then once per period — not every chain", () => {
  const DAY = 24 * 60 * 60_000;
  assert.equal(verifyDue(0, 1_000), true, "a fresh daemon has never checked its store");
  assert.equal(verifyDue(1_000, 1_000 + 30 * 60_000), false, "30 minutes later is NOT due — that was the 137 GB/day cadence");
  assert.equal(verifyDue(1_000, 1_000 + DAY), true);
  assert.equal(verifyDue(1_000, 1_000 + 2 * 60_000, 60_000), true, "period is a parameter");
});

test("scheduler never runs quick_check in-process: no verifyMemory import, verify goes through runStep", () => {
  assert.doesNotMatch(SCHED, /verifyMemory\(/, "quick_check on a multi-GB store inline = daemon frozen for minutes");
  assert.doesNotMatch(SCHED, /from "\.\.\/memory\/salvage\.js"/, "salvage.js must not be imported by the scheduler at all");
  assert.match(SCHED, /runStep\("verify",\s*\["memory",\s*"verify",\s*"--json"\]\)/, "the check is a child process, machine-readable");
});

test("maintain chain verifies only when due", () => {
  const from = SCHED.indexOf("async function maintainTick");
  const chain = SCHED.slice(from, from + 10 + SCHED.slice(from + 10).search(/^(?:async )?function \w+\(/m));
  assert.match(chain, /if \(verifyDue\(lastVerifyAt, Date\.now\(\)\)\)\s*\{\s*const v = await verifyStore\(\)/s);
});

test("`memory verify` CLI: healthy store ⇒ exit 0 + ok:true; not-a-database ⇒ exit 2 + ok:false", () => {
  const dir = mkdtempSync(join(tmpdir(), "zemory-verify-cli-"));
  try {
    const good = join(dir, "good.db");
    openMemory(good).close();
    const ok = spawnSync(process.execPath, [CLI, "memory", "verify", "--json", "--db", good], { encoding: "utf8", env: { ...process.env, ZEMORY_DAEMON_CHILD: "1" } });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout.trim().split(/\r?\n/).pop()).ok, true);

    const bad = join(dir, "bad.db");
    writeFileSync(bad, "this is not a sqlite file, not even close ".repeat(200));
    const ko = spawnSync(process.execPath, [CLI, "memory", "verify", "--json", "--db", bad], { encoding: "utf8", env: { ...process.env, ZEMORY_DAEMON_CHILD: "1" } });
    assert.equal(ko.status, 2, "exit 2 is the contract the scheduler reads as CORRUPT (not any non-zero)");
    assert.equal(JSON.parse(ko.stdout.trim().split(/\r?\n/).pop()).ok, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
