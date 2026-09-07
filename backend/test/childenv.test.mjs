// Thread cap for background ONNX children — and the boundary that keeps it OFF user-started jobs.
//
// Measured 2026-09-07 (see childenv.ts): 4 threads = half the CPU-seconds, same or faster wall
// time, bit-identical vectors. The two mutations this guards: (1) dropping the cap (children go
// back to 12 threads, ~2x the CPU for the same vectors); (2) applying it unconditionally, so the
// user's own "Sync now" gets throttled while they sit waiting — the plan/14 §3 boundary.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BACKGROUND_ONNX_THREADS, backgroundChildEnv } from "../../dist/jobs/childenv.js";

test("machine-started child gets the background thread cap", () => {
  const env = backgroundChildEnv({ PATH: "x" }, true);
  assert.equal(env.ZEMORY_ONNX_THREADS, BACKGROUND_ONNX_THREADS);
  assert.equal(env.PATH, "x", "the rest of the environment passes through");
  assert.equal(BACKGROUND_ONNX_THREADS, "4", "4 is the measured value — changing it means re-measuring, not editing");
});

test("an explicit ZEMORY_ONNX_THREADS in the daemon's environment wins over the default", () => {
  assert.equal(backgroundChildEnv({ ZEMORY_ONNX_THREADS: "6" }, true).ZEMORY_ONNX_THREADS, "6");
});

test("user-started job (not lowPriority) is NOT throttled — same boundary as the priority drop", () => {
  const env = backgroundChildEnv({ PATH: "x" }, false);
  assert.equal(env.ZEMORY_ONNX_THREADS, undefined, "user is waiting on this one; it keeps the runtime default");
});

test("both spawn sites route through the helper (a raw `env: { ...process.env` would bypass the cap)", () => {
  const sched = readFileSync(new URL("../src/jobs/scheduler.ts", import.meta.url), "utf8");
  const sync = readFileSync(new URL("../src/jobs/syncjob.ts", import.meta.url), "utf8");
  assert.match(sched, /backgroundChildEnv\(process\.env,\s*true\)/, "scheduler steps are always machine-started");
  assert.match(sync, /backgroundChildEnv\(process\.env,\s*!!opts\.lowPriority\)/, "sync child follows the lowPriority flag");
});
