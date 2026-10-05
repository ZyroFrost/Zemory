// An EMPTY PEN is not an EMPTY CHANNEL — and confusing the two exported the whole store twice.
//
// Incident (measured 2026-10-05): since 2026-09-21 the p2p write target is this machine's pen
// `channel/<device-id>/`. The first write into the new, empty pen read as "empty channel" ⇒ since = 0
// ⇒ a 2.6 GB BASELINE, although the channel root already carried the same store since 2026-09-17 and
// the `p2p:<host>` watermark was valid. `global-memory/channel/` reached 6.7 GB = one store twice.
//
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

test("empty pen + segments at the channel ROOT ⇒ NOT empty (the 2026-09-21 case: delta, not baseline)", (t) => {
  const { root, pen } = channelTree(t);
  writeFileSync(join(root, "global_memory.enc"), "x");
  assert.equal(channelEmptyForBaseline(pen, 0, "p2p"), false);
});

test("empty pen + segments in ANOTHER machine's pen ⇒ NOT empty", (t) => {
  const { root, pen } = channelTree(t);
  mkdirSync(join(root, "SGEKJ2R3A6KS0000"));
  writeFileSync(join(root, "SGEKJ2R3A6KS0000", "global_memory.002.enc"), "x");
  assert.equal(channelEmptyForBaseline(pen, 0, "p2p"), false);
});

test("whole channel truly empty ⇒ empty (first use: a baseline is RIGHT here)", (t) => {
  const { root, pen } = channelTree(t);
  mkdirSync(join(root, "SGEKJ2R3A6KS0000")); // another pen exists but holds nothing
  assert.equal(channelEmptyForBaseline(pen, 0, "p2p"), true);
});

test("own pen already has segments ⇒ NOT empty, whatever the root holds", (t) => {
  const { pen } = channelTree(t);
  assert.equal(channelEmptyForBaseline(pen, 3, "p2p"), false);
});

test("Drive keeps its old meaning: nothing in THIS dir ⇒ empty, even with a sibling folder full", (t) => {
  const { base } = channelTree(t);
  const drive = join(base, "drive");
  mkdirSync(drive);
  mkdirSync(join(base, "other"));
  writeFileSync(join(base, "other", "global_memory.enc"), "x");
  assert.equal(channelEmptyForBaseline(drive, 0, "drive"), true);
  assert.equal(channelEmptyForBaseline(drive, 0, undefined), true);
});

test("a p2p dir that is NOT inside channel/ is treated like any dir (no guessing about parents)", (t) => {
  const { base } = channelTree(t);
  const loose = join(base, "loose");
  mkdirSync(loose);
  writeFileSync(join(base, "global_memory.enc"), "x"); // parent has a segment, but parent is not `channel`
  assert.equal(channelEmptyForBaseline(loose, 0, "p2p"), true);
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
