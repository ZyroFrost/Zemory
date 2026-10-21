// One conform pass reads each text file once (case-checks.ts withTextCache, measured 2026-10-21: the repo's text was
// scanned by several checks, each reading every file again). Inside the pass a file keeps the text read first, whichever
// separator reached it; outside the pass every read is fresh.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { readText, withTextCache } from "../../dist/docs/case-checks.js";
import { tempDir } from "./helpers.mjs";

test("inside one pass a file is read once, by either separator; after the pass it is read fresh", (t) => {
  const root = tempDir(t, "zemory-text-cache-");
  const f = join(root, "a.md");
  writeFileSync(f, "one");
  withTextCache(() => {
    assert.equal(readText(f), "one");
    writeFileSync(f, "two");
    assert.equal(readText(f), "one");
    assert.equal(readText(f.replace(/\\/g, "/")), "one");
  });
  assert.equal(readText(f), "two");
});

test("a missing file is remembered as missing for the pass, and reads null", (t) => {
  const root = tempDir(t, "zemory-text-cache-");
  const f = join(root, "gone.md");
  withTextCache(() => {
    assert.equal(readText(f), null);
    writeFileSync(f, "now here");
    assert.equal(readText(f), null);
  });
  assert.equal(readText(f), "now here");
});
