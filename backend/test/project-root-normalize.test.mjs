// One folder must produce ONE index key.
//
// Measured on the live database (2026-07-29): this repo's own docs were split across
// two project_root values — 24 rows under "D:\Zyro\Tool\Zemory" and 15 stale
// duplicates under "d:\Zyro\Tool\Zemory". On Windows the case of the drive letter
// comes from how the shell entered the directory (`cd d:\x` vs `cd D:\x`), so
// process.cwd() hands back two spellings of the same folder and a project-scoped
// search saw only whichever half matched the casing of the moment.
//
// The write path is the important one to gate: importDoc/importChangelog must
// canonicalise, so no caller — CLI, UI picker, MCP arg — can poison the index again.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeRoot, findProjectRoot } from "../../dist/core/config.js";
import { importDoc } from "../../dist/docs/plan.js";
import { importChangelog } from "../../dist/docs/changelog.js";
import { openMemory } from "../../dist/memory/db.js";

const win = process.platform === "win32";

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "zemory-rootcase-"));
  mkdirSync(join(dir, "docs", "agent"), { recursive: true });
  return { dir, dbPath: join(dir, "test.db") };
}

test("normalizeRoot upper-cases the drive letter (win32)", () => {
  if (!win) return;
  assert.equal(normalizeRoot("d:\\Zyro\\Tool\\Zemory"), "D:\\Zyro\\Tool\\Zemory");
  assert.equal(normalizeRoot("D:\\Zyro\\Tool\\Zemory"), "D:\\Zyro\\Tool\\Zemory");
});

test("normalizeRoot is idempotent and case-stable for the same folder", () => {
  if (!win) return;
  const a = normalizeRoot("c:\\Users\\x\\proj");
  assert.equal(normalizeRoot(a), a, "applying twice must not change the result");
  assert.equal(normalizeRoot("C:\\Users\\x\\proj"), a, "both spellings collapse to one key");
});

test("normalizeRoot leaves the rest of the path alone", () => {
  // Folder names are meaningful and other platforms are case-sensitive: only the
  // drive letter may be rewritten.
  const p = win ? "d:\\Zyro\\Tool\\ZeMoRy\\Sub_Dir" : "/home/x/ZeMoRy/Sub_Dir";
  assert.ok(normalizeRoot(p).endsWith(win ? "\\Zyro\\Tool\\ZeMoRy\\Sub_Dir" : "/ZeMoRy/Sub_Dir"));
});

test("normalizeRoot returns an absolute path", () => {
  const r = normalizeRoot(".");
  assert.ok(r.length > 1 && r !== ".", "relative input must resolve to absolute");
});

test("findProjectRoot returns a canonical root", () => {
  if (!win) return;
  const { dir } = scratch();
  try {
    writeFileSync(join(dir, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent" }));
    const lower = dir.replace(/^([A-Z]):/, (_m, d) => `${d.toLowerCase()}:`);
    const found = findProjectRoot(lower);
    assert.equal(found, normalizeRoot(dir), "a lower-cased start must still yield the canonical root");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("importDoc writes ONE project_root for two spellings of the same folder", () => {
  if (!win) return;
  const { dir, dbPath } = scratch();
  try {
    const md = join(dir, "docs", "agent", "05_TODO.md");
    writeFileSync(md, "# TODO\n\n## Mục\n- [ ] việc\n");
    const lower = dir.replace(/^([A-Z]):/, (_m, d) => `${d.toLowerCase()}:`);
    assert.notEqual(lower, dir, "test needs two distinct spellings to be meaningful");

    importDoc(md, join("docs", "agent", "05_TODO.md"), dir, "agent", dbPath);
    importDoc(md, join("docs", "agent", "05_TODO.md"), lower, "agent", dbPath);

    const db = openMemory(dbPath);
    const roots = db.prepare("SELECT DISTINCT project_root FROM doc").all().map((r) => r.project_root);
    const docs = db.prepare("SELECT COUNT(*) n FROM doc").get().n;
    db.close();
    assert.deepEqual(roots, [normalizeRoot(dir)], "both spellings must collapse to the canonical key");
    assert.equal(docs, 1, "the second import must UPDATE the same row, not add a duplicate");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("importChangelog writes ONE project_root for two spellings of the same folder", () => {
  if (!win) return;
  const { dir, dbPath } = scratch();
  try {
    const md = join(dir, "docs", "agent", "06_CHANGES.md");
    writeFileSync(md, "# Change Log\n\n## [2026-07-29] — việc\nChi tiết.\n");
    const lower = dir.replace(/^([A-Z]):/, (_m, d) => `${d.toLowerCase()}:`);

    importChangelog(md, dir, dbPath, { replace: true });
    importChangelog(md, lower, dbPath, { replace: true });

    const db = openMemory(dbPath);
    const roots = db.prepare("SELECT DISTINCT project_root FROM changelog").all().map((r) => r.project_root);
    const rows = db.prepare("SELECT COUNT(*) n FROM changelog").get().n;
    db.close();
    assert.deepEqual(roots, [normalizeRoot(dir)], "both spellings must collapse to the canonical key");
    assert.equal(rows, 1, "replace on the canonical key must not leave a second tier of rows");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
