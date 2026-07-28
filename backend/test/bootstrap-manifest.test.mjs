// The Cowork BOOTSTRAP carries a COPY of facts that live in docs_template/nonapp/:
// which files make up the standard, and how many lines each one has. A copy that
// nobody checks goes stale silently — and the failure is nasty, because the stale
// number lands in BOOTSTRAP's own self-check step and makes every machine report a
// false ✗ on a file that is actually fine (same family as the F1 bug: the standard
// hand-copied into a second place, then drifting).
//
// So this gate ties the copy back to the source:
//   - every .md in docs_template/nonapp/ must appear in the manifest (no silent gap)
//   - every declared line count must equal the real file's line count
//   - the target path must mirror the source path
// Break any of those and the gate goes red instead of the user's session.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE = fileURLToPath(new URL("../../docs_template/nonapp/", import.meta.url));
const BOOTSTRAP = fileURLToPath(new URL("../../docs_template/cowork/BOOTSTRAP.md", import.meta.url));
const md = readFileSync(BOOTSTRAP, "utf8");

/** Line count the way `wc -l` counts it: number of newline-terminated lines. */
function lineCount(text) {
  const parts = text.split("\n");
  return text.endsWith("\n") ? parts.length - 1 : parts.length;
}

/** Every .md shipped as part of the non-app standard, relative to the template root. */
function templateFiles(dir = TEMPLATE, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...templateFiles(join(dir, entry.name), rel));
    else if (entry.name.endsWith(".md")) out.push(rel);
  }
  return out.sort();
}

// | 1 | `AGENTS.md` | `<RAW>/AGENTS.md` | 20 |
const ROW = /^\|\s*\d+\s*\|\s*`([^`]+)`\s*\|\s*`<RAW>\/([^`]+)`\s*\|\s*(\d+)\s*\|\s*$/gm;

function manifest() {
  const rows = [];
  for (const m of md.matchAll(ROW)) rows.push({ target: m[1], source: m[2], lines: Number(m[3]) });
  return rows;
}

test("BOOTSTRAP manifest covers every file of the non-app standard (nothing ships half a harness)", () => {
  const declared = manifest().map((r) => r.source).sort();
  assert.deepEqual(
    declared,
    templateFiles(),
    "docs_template/cowork/BOOTSTRAP.md manifest and docs_template/nonapp/ disagree — " +
      "a file was added or removed from the standard without updating the manifest, so Cowork would " +
      "scaffold an incomplete harness",
  );
});

test("every line count in the BOOTSTRAP manifest matches the real file", () => {
  const wrong = [];
  for (const row of manifest()) {
    const real = lineCount(readFileSync(join(TEMPLATE, row.source), "utf8"));
    if (real !== row.lines) wrong.push(`${row.source}: manifest says ${row.lines}, file has ${real}`);
  }
  assert.deepEqual(
    wrong,
    [],
    "BOOTSTRAP's self-check step compares against these numbers — a stale number makes every " +
      "Cowork run report a false ✗ on a correct file",
  );
});

test("manifest target paths mirror the source paths (harness lands where the standard says)", () => {
  const rows = manifest();
  assert.ok(rows.length > 0, "manifest parsed as empty — the table format changed and this gate went blind");
  for (const row of rows) {
    const expected = row.source === "AGENTS.md" ? "AGENTS.md" : `docs/${row.source}`;
    assert.equal(row.target, expected, `manifest row for ${row.source} writes to the wrong path`);
  }
});

test("BOOTSTRAP points at the non-app template and keeps the verbatim-copy rule", () => {
  assert.match(
    md,
    /raw\.githubusercontent\.com\/[^\s`]+\/docs_template\/nonapp/,
    "the <RAW> base must resolve to docs_template/nonapp — a wrong base scaffolds the wrong standard",
  );
  assert.match(
    md,
    /NGUYÊN VĂN/,
    "the copy-verbatim rule is what stops the agent from 'improving' the standard while transcribing it",
  );
});

test("BOOTSTRAP never tells the agent to run host commands (Cowork's shell can't reach the host)", () => {
  const offenders = [];
  if (/zemory\s+(init|sync|doctor|reindex|conform)/.test(md)) offenders.push("a zemory CLI command");
  if (/npm\s+(i|install)\b/.test(md)) offenders.push("an npm install");
  assert.deepEqual(
    offenders,
    [],
    "Cowork runs bash in its own sandbox, so a host command here fails on the user's machine with no way to recover",
  );
});
