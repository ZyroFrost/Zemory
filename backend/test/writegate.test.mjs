// Write gate (plan 14 §C) — the daemon-side advisory hold that makes the idle
// scheduler yield while a CLI writes the memory, so they don't collide on SQLite.

import assert from "node:assert/strict";
import test from "node:test";
import { acquireCliWrite, cliHoldsWrite, releaseCliWrite } from "../../dist/jobs/writegate.js";

test("acquire holds the gate; release frees it", () => {
  releaseCliWrite();
  assert.equal(cliHoldsWrite(), false, "starts free");
  acquireCliWrite();
  assert.equal(cliHoldsWrite(), true, "held after acquire");
  releaseCliWrite();
  assert.equal(cliHoldsWrite(), false, "free after release");
});

test("a hold is idempotent (re-acquire just extends it)", () => {
  acquireCliWrite();
  acquireCliWrite();
  assert.equal(cliHoldsWrite(), true);
  releaseCliWrite();
});
