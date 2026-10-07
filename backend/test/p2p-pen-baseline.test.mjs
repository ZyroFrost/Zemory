// An EMPTY PEN is not an EMPTY CHANNEL — and confusing the two exported the whole store twice.
//
// Incident (measured 2026-10-05): since 2026-09-21 the p2p write target is this machine's pen
// `channel/<device-id>/`. The first write into the new, empty pen read as "empty channel" ⇒ since = 0
// ⇒ a 2.6 GB BASELINE, although the channel root already carried the same store since 2026-09-17 and
// the `p2p:<host>` watermark was valid. `global-memory/channel/` reached 6.7 GB = one store twice.
//
//
// 2026-10-07 (plan/24 §4): the write target is the channel ROOT again (one container + write queue).
// The mirror-image trap: a machine whose root is empty but whose legacy pen holds the store must NOT
// export a baseline into the root — that is the same 2.6 GB a third time.
// `channelEmptyForBaseline` is the one decision; each case below is a way it can go wrong.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { channelEmptyForBaseline } from "../../dist/memory/share.js";

function channelTree(t) {
  const base = mkdtempSync(join(tmpdir(), "zemory-pen-"));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, "channel");
  const pen = join(root, "HMVEQRS7IJADAN5J");
  mkdirSync(pen, { recursive: true });
  return { base, root, pen };
}

test("empty root + a legacy pen holding segments ⇒ NOT empty (no baseline on top of the same store)", (t) => {
  const { root, pen } = channelTree(t);
  writeFileSync(join(pen, "global_memory.enc"), "x");
  assert.equal(channelEmptyForBaseline(root, 0, "p2p"), false);
});

test("empty root + segments in ANOTHER machine's legacy pen ⇒ NOT empty", (t) => {
  const { root } = channelTree(t);
  mkdirSync(join(root, "SGEKJ2R3A6KS0000"));
  writeFileSync(join(root, "SGEKJ2R3A6KS0000", "global_memory.002.enc"), "x");
  assert.equal(channelEmptyForBaseline(root, 0, "p2p"), false);
});

test("whole channel truly empty ⇒ empty (first use: a baseline is RIGHT here)", (t) => {
  const { root } = channelTree(t);
  mkdirSync(join(root, "SGEKJ2R3A6KS0000")); // pens exist but hold nothing
  assert.equal(channelEmptyForBaseline(root, 0, "p2p"), true);
});

test("root already has segments ⇒ NOT empty", (t) => {
  const { root } = channelTree(t);
  assert.equal(channelEmptyForBaseline(root, 3, "p2p"), false);
});

test("Drive keeps its old meaning: nothing in THIS dir ⇒ empty, sub-folders are not pens there", (t) => {
  const { base } = channelTree(t);
  const drive = join(base, "drive");
  mkdirSync(join(drive, "other"), { recursive: true });
  writeFileSync(join(drive, "other", "global_memory.enc"), "x");
  assert.equal(channelEmptyForBaseline(drive, 0, "drive"), true);
  assert.equal(channelEmptyForBaseline(drive, 0, undefined), true);
});

test("the push path decides `since` through this function, not through the pen alone", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/memory/share.ts", import.meta.url), "utf8");
  const at = src.indexOf("const since = compacting");
  assert.ok(at > 0, "anchor: the `since` decision in pushAppend");
  const line = src.slice(at, src.indexOf("\n", at));
  assert.match(line, /channelEmptyForBaseline\(dir, segs\.length, o\.channel\)/);
  assert.doesNotMatch(line, /segs\.length === 0/, "back to `segs.length === 0` = the 6.7 GB bug");
});
