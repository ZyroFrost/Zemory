// `changes_lines` only says "the FILE is long — archive it". It says nothing about a
// single bloated entry, and those are what make archiving pointless: at keep≈180 lines,
// four 50-line entries fill the whole active window, so trimming buys almost nothing.
//
// Measured over 76 real entries (2026-07-29): p50 19 · p75 28 · p90 40 · max 53. The
// median is already fine; the tail is the problem. Hence a 30-line advisory — between
// p75 and p90, so a normal entry never trips it.

import assert from "node:assert/strict";
import test from "node:test";
import { longEntries, closedItems } from "../../dist/docs/validate.js";

const body = (n) => Array.from({ length: n }, (_, i) => `dòng ${i}`).join("\n");

test("flags only entries over the cap, longest first", () => {
  const md = `# Change Log\n\n## [2026-07-02] — dài\n${body(40)}\n\n## [2026-07-01] — ngắn\n${body(5)}\n\n## [2026-06-30] — dài vừa\n${body(34)}\n`;
  const long = longEntries(md, 30);
  assert.deepEqual(long.map((e) => e.tag), ["2026-07-02", "2026-06-30"], "sorted longest first, short one absent");
  assert.ok(long[0].lines > long[1].lines);
});

test("an entry exactly at the cap is fine — the rule is 'over', not 'at'", () => {
  // heading + 28 body lines + the empty element a trailing "\n" leaves behind = 30.
  // (First draft used 29 and failed at 31 — the trailing newline is easy to forget.)
  const md = `# Change Log\n\n## [2026-07-01] — vừa đúng trần\n${body(28)}\n`;
  assert.deepEqual(longEntries(md, 30), [], "an entry sitting exactly on the cap must not be flagged");
});

test("the LAST entry is measured too (it has no following heading to bound it)", () => {
  const md = `# Change Log\n\n## [2026-07-01] — entry cuối rất dài\n${body(50)}\n`;
  assert.equal(longEntries(md, 30).length, 1, "an unbounded final entry must still be counted");
});

test("a heading inside a fenced block is text, not an entry", () => {
  const md = `# Change Log\n\n## [2026-07-01] — thật\n${body(3)}\n\n\`\`\`\n## [2026-01-01] — ví dụ trong khối code\n${body(50)}\n\`\`\`\n`;
  const long = longEntries(md, 10);
  assert.deepEqual(long.map((e) => e.tag), ["2026-07-01"], "the fenced heading must not become its own entry");
});

test("CRLF files measure the same as LF (Windows-written changelogs)", () => {
  const md = `# Change Log\r\n\r\n## [2026-07-01] — dài\r\n${body(40).replace(/\n/g, "\r\n")}\r\n`;
  assert.equal(longEntries(md, 30).length, 1, "CRLF must not hide a long entry");
});

test("no dated entries at all → nothing to report", () => {
  assert.deepEqual(longEntries("# Change Log\n\n_(chưa có entry)_\n", 30), []);
});

// --- closedItems: the backlog's own header says done items must not stay here ---
// Unchecked for months, they reached 107 = 46% of 05_TODO, read every session.

test("counts closed backlog items, ignoring open and in-progress ones", () => {
  const md = "# TODO\n\n- [x] xong\n- [ ] chưa\n- [~] đang\n  - [x] xong lồng\n";
  assert.equal(closedItems(md), 2, "both closed items counted, at any indent");
});

test("a checked box inside a fence is an example, not an item", () => {
  const md = "# TODO\n\n```\n- [x] ví dụ trong khối code\n```\n\n- [x] mục thật\n";
  assert.equal(closedItems(md), 1);
});

test("a clean backlog reports zero — that is the standard's expected state", () => {
  assert.equal(closedItems("# TODO\n\n- [ ] còn làm\n- [~] đang làm\n"), 0);
});
