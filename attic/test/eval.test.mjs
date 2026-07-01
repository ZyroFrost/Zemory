import assert from "node:assert/strict";
import test from "node:test";
import { compress } from "../dist/compress/compress.js";
import { compressMode } from "../dist/compress/policy.js";
import { FIXTURES } from "../dist/eval/fixtures.js";
import { replayAll } from "../dist/eval/replay.js";

test("kill switch ZEMORY_COMPRESS=off returns every fixture byte-verbatim", () => {
  process.env.ZEMORY_COMPRESS = "off";
  try {
    assert.equal(compressMode(), "off");
    for (const f of FIXTURES) {
      const r = compress(f.raw, { cmd: f.cmd });
      assert.equal(r.text, f.raw, `${f.name}: verbatim when off`);
      assert.equal(r.savedPct, 0, `${f.name}: no claimed savings when off`);
    }
  } finally {
    delete process.env.ZEMORY_COMPRESS;
  }
});

test("default mode is balanced (no env set)", () => {
  delete process.env.ZEMORY_COMPRESS;
  assert.equal(compressMode(), "balanced");
});

test("baseline replay keeps required signals on every fixture", () => {
  delete process.env.ZEMORY_COMPRESS;
  const reports = replayAll();
  for (const r of reports) {
    assert.ok(r.signalsKept, `${r.name}: lost signals → ${r.missingSignals.join(", ")}`);
  }
});

test("dense/short output is not over-compressed (near-verbatim)", () => {
  delete process.env.ZEMORY_COMPRESS;
  const reports = replayAll();
  const dense = reports.find((r) => r.kind === "dense");
  assert.ok(dense, "dense fixture present");
  assert.ok(dense.savedCharsPct <= 10, `dense saved ${dense.savedCharsPct}% — should be minimal`);
});

test("huge repetitive output compresses hard while keeping the error + summary", () => {
  delete process.env.ZEMORY_COMPRESS;
  const reports = replayAll();
  const huge = reports.find((r) => r.kind === "huge");
  assert.ok(huge, "huge fixture present");
  assert.ok(huge.savedLinesPct >= 90, `huge saved only ${huge.savedLinesPct}% of lines`);
  assert.ok(huge.signalsKept, `huge lost signals → ${huge.missingSignals.join(", ")}`);
});
