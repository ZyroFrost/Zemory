// A doc row whose .md is gone must not survive a reindex.
//
// The index is DERIVED (điều 3 — FILE WINS), so a row with no file behind it is not
// history, it is a WRONG ANSWER: search prints the old path and the reader opens nothing.
// Measured 2026-07-29: three dead plans were moved to `attic/dead-plans/`, and
// `plan search "quota-safe"` kept answering `docs\plan\03_….md` — a path that no longer
// existed. `reindex` only ever imported the files it found; nothing pruned.
//
// The dangerous failure mode of a pruner is the opposite one — wiping an index it should
// have left alone — so the guards get their own tests: an absent project root prunes
// nothing, and other projects' rows are never touched.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importDoc, pruneMissingDocs, searchSections } from "../../dist/docs/plan.js";
import { normalizeRoot } from "../../dist/core/config.js";
import { openMemory } from "../../dist/memory/db.js";

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "zemory-prune-"));
  mkdirSync(join(dir, "docs", "plan"), { recursive: true });
  const dbPath = join(dir, "t.db");
  const write = (name, body) => {
    const abs = join(dir, "docs", "plan", name);
    writeFileSync(abs, body);
    importDoc(abs, join("docs", "plan", name), dir, "plan", dbPath);
    return abs;
  };
  const docs = () => {
    const db = openMemory(dbPath);
    try {
      return db.prepare("SELECT path FROM doc ORDER BY path").all().map((r) => r.path);
    } finally {
      db.close();
    }
  };
  const sections = () => {
    const db = openMemory(dbPath);
    try {
      return db.prepare("SELECT COUNT(*) n FROM section").get().n;
    } finally {
      db.close();
    }
  };
  return { dir, dbPath, write, docs, sections, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const BODY = (t) => `# ${t}\n\n## Mục\nNội dung ${t}.\n`;

test("row của file đã xoá bị dọn, row của file còn lại thì KHÔNG", (t) => {
  const s = scratch();
  t.after(s.cleanup);
  const a = s.write("00_a.md", BODY("A"));
  s.write("01_b.md", BODY("B"));
  assert.equal(s.docs().length, 2);

  unlinkSync(a);
  const n = pruneMissingDocs(s.dir, s.dbPath);
  assert.equal(n, 1, "đúng 1 row bị dọn");
  assert.deepEqual(s.docs(), [join("docs", "plan", "01_b.md")], "chỉ file còn tồn tại được giữ");
});

test("section của row bị dọn cũng đi theo (không để mồ côi)", (t) => {
  const s = scratch();
  t.after(s.cleanup);
  const a = s.write("00_a.md", BODY("A"));
  const before = s.sections();
  assert.ok(before >= 2, "fixture phải có section");
  unlinkSync(a);
  pruneMissingDocs(s.dir, s.dbPath);
  assert.equal(s.sections(), 0, "xoá doc phải xoá luôn section của nó");
});

test("dọn xong thì search KHÔNG còn trả đường dẫn chết", (t) => {
  const s = scratch();
  t.after(s.cleanup);
  const a = s.write("00_a.md", "# A\n\n## Riêng\nchuỗi-độc-nhất-xyzzy ở đây.\n");
  const root = normalizeRoot(s.dir);
  assert.ok(
    searchSections("xyzzy", { project: root, dbPath: s.dbPath }).length > 0,
    "fixture: trước khi xoá phải tìm được",
  );
  unlinkSync(a);
  pruneMissingDocs(s.dir, s.dbPath);
  assert.equal(searchSections("xyzzy", { project: root, dbPath: s.dbPath }).length, 0, "sau khi dọn phải hết hit");
});

test("không có gì để dọn thì trả 0 và không đụng gì", (t) => {
  const s = scratch();
  t.after(s.cleanup);
  s.write("00_a.md", BODY("A"));
  assert.equal(pruneMissingDocs(s.dir, s.dbPath), 0);
  assert.equal(s.docs().length, 1);
});

test("GUARD: project root không tồn tại thì KHÔNG dọn gì", () => {
  // Ổ cắm rời / share chưa mount: cả cây file "mất" cùng lúc. Dọn ở đây là xoá sạch
  // index của một project vẫn còn sống — hỏng nặng hơn nhiều so với một row cũ.
  const s = scratch();
  const dbPath = s.dbPath;
  const missingRoot = join(s.dir, "khong-ton-tai");
  const abs = join(s.dir, "docs", "plan", "00_a.md");
  writeFileSync(abs, BODY("A"));
  importDoc(abs, join("docs", "plan", "00_a.md"), missingRoot, "plan", dbPath);
  const n = pruneMissingDocs(missingRoot, dbPath);
  assert.equal(n, 0, "root mất thì phải bỏ qua, không dọn");
  const db = openMemory(dbPath);
  const left = db.prepare("SELECT COUNT(*) n FROM doc WHERE project_root=?").get(normalizeRoot(missingRoot)).n;
  db.close();
  assert.equal(left, 1, "row vẫn còn nguyên");
  s.cleanup();
});

test("GUARD: chỉ dọn project ĐƯỢC CHỈ ĐỊNH, không đụng project khác", (t) => {
  const s = scratch();
  t.after(s.cleanup);
  const other = mkdtempSync(join(tmpdir(), "zemory-prune-other-"));
  try {
    mkdirSync(join(other, "docs", "plan"), { recursive: true });
    const oAbs = join(other, "docs", "plan", "00_o.md");
    writeFileSync(oAbs, BODY("O"));
    importDoc(oAbs, join("docs", "plan", "00_o.md"), other, "plan", s.dbPath);
    unlinkSync(oAbs); // project khác cũng có row mồ côi

    const a = s.write("00_a.md", BODY("A"));
    unlinkSync(a);
    const n = pruneMissingDocs(s.dir, s.dbPath);
    assert.equal(n, 1, "chỉ dọn 1 row của project được chỉ định");

    const db = openMemory(s.dbPath);
    const otherLeft = db.prepare("SELECT COUNT(*) n FROM doc WHERE project_root=?").get(normalizeRoot(other)).n;
    db.close();
    assert.equal(otherLeft, 1, "row mồ côi của project khác KHÔNG được đụng tới");
  } finally {
    rmSync(other, { recursive: true, force: true });
  }
});

test("khoá chuẩn hoá: root viết hoa/thường khác nhau vẫn dọn đúng row", (t) => {
  if (process.platform !== "win32") return;
  const s = scratch();
  t.after(s.cleanup);
  const a = s.write("00_a.md", BODY("A"));
  unlinkSync(a);
  const lower = s.dir.replace(/^([A-Z]):/, (_m, d) => `${d.toLowerCase()}:`);
  assert.equal(pruneMissingDocs(lower, s.dbPath), 1, "root chữ thường phải khớp cùng một khoá");
});
