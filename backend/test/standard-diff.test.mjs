// plan/26 step ② — the read-only "how far behind is this repo" verdict.
//
// The regression pinned here is the one that made the whole thing useless: stripping the stamp
// swallowed the file's own final newline, so a file byte-identical to its base read as 321 lines
// against 322 and every stamped file came back "the repo edited this". `clean` — the only class
// safe to replace wholesale — could never occur, and the tool would have proposed a merge for
// files that needed none.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contentLines, stampOf, standardDiff } from "../../dist/docs/standard.js";

const STAMP = "<!-- zemory-standard: 2026-09-16 -->";

test("stampOf reads the date, and only from the end of the file", () => {
  assert.equal(stampOf(`body\n\n${STAMP}\n`), "2026-09-16");
  assert.equal(stampOf("body with no stamp\n"), null);
  // A stamp quoted mid-document (a doc ABOUT the marker) must not be mistaken for the file's own.
  assert.equal(stampOf(`${STAMP}\nbody continues after it\n`), null);
});

test("a stamped file and its unstamped base have the SAME content lines (the 321-vs-322 bug)", () => {
  const base = "line one\nline two\n";
  const stamped = `line one\nline two\n\n${STAMP}\n`;
  assert.deepEqual(contentLines(stamped), contentLines(base));
  assert.deepEqual(contentLines(stamped), ["line one", "line two"]);
});

test("CRLF and LF of the same content compare equal", () => {
  assert.deepEqual(contentLines("a\r\nb\r\n"), contentLines("a\nb\n"));
});

test("a repo with no stamp is UNKNOWN — never guessed into a writable class", () => {
  const root = mkdtempSync(join(tmpdir(), "zem-std-"));
  try {
    mkdirSync(join(root, "docs", "agent"), { recursive: true });
    writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", profile: "app" }));
    writeFileSync(join(root, "AGENTS.md"), "# repo\n");
    for (const f of ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md"])
      writeFileSync(join(root, "docs", "agent", f), "no stamp here\n");

    const rep = standardDiff(root);
    assert.equal(rep.files.length, 5);
    for (const f of rep.files) {
      assert.equal(f.verdict, "unknown", `${f.file} must not be classified without a stamp`);
      assert.equal(f.repoStamp, null);
      // A verdict that cannot be acted on must say WHY, or the report is just a shrug.
      assert.ok(f.reason && f.reason.length > 0, `${f.file} must carry a reason`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a missing file is ABSENT, not unknown — that is sync's job, not this one", () => {
  const root = mkdtempSync(join(tmpdir(), "zem-std-"));
  try {
    mkdirSync(join(root, "docs", "agent"), { recursive: true });
    writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", profile: "app" }));
    // AGENTS.md deliberately not written.
    for (const f of ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md"])
      writeFileSync(join(root, "docs", "agent", f), "x\n");

    const agents = standardDiff(root).files.find((f) => f.file === "AGENTS.md");
    assert.equal(agents.verdict, "absent");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
