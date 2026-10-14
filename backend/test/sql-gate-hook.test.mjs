// Hook 02-25 (plan/27 §2g): NEW inline SQL is blocked at write time; a query that already has a name is pointed to; the
// block message carries the rule text. Negative cases matter as much as positive ones (a hook that blocks wrongly is a hook
// that gets bypassed): moving existing SQL, test files, the store file itself, a repo without a store — all pass.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

import { SQL_GATE_SOURCE, SQL_GATE_FILE } from "../../dist/docs/sql-gate-src.js";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "zm-sqlgate-"));
  mkdirSync(join(root, "backend/src/memory/store"), { recursive: true });
  mkdirSync(join(root, "backend/test"), { recursive: true });
  mkdirSync(join(root, "docs/agent"), { recursive: true });
  mkdirSync(join(root, "docs/hooks"), { recursive: true });
  writeFileSync(join(root, "backend/src/memory/store/queries.ts"),
    'export const Q = {\n  countMessages: "SELECT COUNT(*) c FROM messages",\n  vecDims: "SELECT dims FROM vec_config LIMIT 1",\n} as const;\n');
  writeFileSync(join(root, "docs/agent/02_RULES.md"),
    "## Luật khi VIẾT\n```\n02-25 SQL — 1 CÁCH         gom store/queries.* · gọi theo tên\n02-21 Secret               trỏ TÊN env\n```\n");
  writeFileSync(join(root, "docs/hooks", SQL_GATE_FILE), SQL_GATE_SOURCE);
  writeFileSync(join(root, "backend/src/a.ts"), 'const n = db.prepare("SELECT dims FROM vec_config LIMIT 1").get();\n');
  return root;
}
const POLICY = {
  sql: { rule: "02-25", rules_file: "docs/agent/02_RULES.md", stores: ["backend/src/memory/store/queries.ts"],
    code_ext: [".ts", ".js"], exclude: ["backend/test/"] },
};
const requireNode = createRequire(import.meta.url);
// Run the generated CommonJS source as-is (the same text `zemory hook guard` writes into <hooks>/).
const load = () => {
  const mod = { exports: {} };
  new Function("module", "exports", "require", SQL_GATE_SOURCE)(mod, mod.exports, requireNode);
  return mod.exports;
};
const edit = (root, rel, oldS, newS) => ({ tool_name: "Edit", tool_input: { file_path: join(root, rel), old_string: oldS, new_string: newS } });

test("a query that already has a name is pointed to by name, and the rule text rides along", () => {
  const root = fixture();
  try {
    const { check } = load(root);
    const msg = check(edit(root, "backend/src/a.ts", "x", 'db.prepare("select count(*)  C from messages").get()'), root, POLICY);
    assert.match(msg, /BLOCKED/);
    assert.match(msg, /ALREADY NAMED: use Q\.countMessages/);
    assert.match(msg, /02-25 SQL — 1 CÁCH/, "the block message must carry the rule itself");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a brand-new query is blocked with the way through: add one named entry", () => {
  const root = fixture();
  try {
    const { check } = load(root);
    const msg = check(edit(root, "backend/src/a.ts", "x", 'db.prepare("SELECT id FROM sessions WHERE host = ?").all(h)'), root, POLICY);
    assert.match(msg, /not named yet: add ONE named entry to backend\/src\/memory\/store\/queries\.ts/);
    const dyn = check(edit(root, "backend/src/a.ts", "x", "db.prepare(`SELECT * FROM ${t}`).all()"), root, POLICY);
    assert.match(dyn, /built at run time/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("NEGATIVE: moving SQL that is already there, test files, the store file, a repo without a store — all pass", () => {
  const root = fixture();
  try {
    const { check } = load(root);
    const sql = 'db.prepare("SELECT dims FROM vec_config LIMIT 1").get()';
    assert.equal(check(edit(root, "backend/src/a.ts", `const n = ${sql};`, `  const n = ${sql};`), root, POLICY), null, "re-indenting is not a new query");
    assert.equal(check(edit(root, "backend/test/x.test.ts", "x", 'db.prepare("SELECT 1").get()'), root, POLICY), null, "test files are excluded");
    assert.equal(check(edit(root, "backend/src/memory/store/queries.ts", "x", '  q: "SELECT 1",'), root, POLICY), null, "the store itself is where SQL goes");
    assert.equal(check(edit(root, "backend/src/a.ts", "x", 'db.prepare("SELECT 1").get()'), root, {}), null, "no policy.sql ⇒ the hook is silent");
    assert.equal(check(edit(root, "backend/src/a.ts", "x", "const y = 2;"), root, POLICY), null, "no SQL ⇒ nothing to judge");
    const write = { tool_name: "Write", tool_input: { file_path: join(root, "backend/src/a.ts"), content: readFileSync(join(root, "backend/src/a.ts"), "utf8") + "// more\n" } };
    assert.equal(check(write, root, POLICY), null, "a Write that keeps the existing SQL adds no query");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("end to end: the repo's own guard.cjs blocks a new inline copy of a named query (exit 2, names Q.countMessages)", () => {
  const payload = { tool_name: "Edit", tool_input: { file_path: join(ROOT, "backend/src/checks.ts"), old_string: "zz", new_string: 'db.prepare("SELECT count(*) c FROM messages").get()' } };
  const r = spawnSync(process.execPath, [join(ROOT, "docs/hooks/guard.cjs")], { input: JSON.stringify(payload), encoding: "utf8", cwd: ROOT });
  assert.equal(r.status, 2, `guard must block (stderr: ${r.stderr.slice(0, 300)})`);
  assert.match(r.stderr, /Q\.countMessages/);
});
