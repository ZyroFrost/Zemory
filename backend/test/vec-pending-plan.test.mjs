// "No vector yet" must be answered by vec0's SHADOW table, never by the virtual table.
//
// Why a test: the virtual-table form is the obvious way to write it, it is semantically correct,
// and nothing red happens — it just reads ~3 MB per message. Measured 2026-09-07 on the live
// store: 456 GB / 346 s for one pending-selection pass (see `noVectorYetSql`). The mutation this
// guards is someone rewriting the filter back to `FROM vec_chunks WHERE rowid = …`.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { noVectorYetSql } from "../../dist/memory/vectors.js";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "zemory-vecplan-"));
  const db = new Database(join(dir, "m.db"));
  sqliteVec.load(db);
  db.exec("CREATE TABLE messages(id INTEGER PRIMARY KEY, content TEXT, tool_name TEXT)");
  const ins = db.prepare("INSERT INTO messages(id, content) VALUES (?, ?)");
  for (let i = 1; i <= 6; i++) ins.run(i, `m${i}`);
  return { dir, db };
}

test("with a vec0 index present, the filter uses the shadow table and the plan is a PK search", () => {
  const { dir, db } = fixture();
  try {
    db.exec("CREATE VIRTUAL TABLE vec_chunks USING vec0(embedding float[4])");
    const put = db.prepare("INSERT INTO vec_chunks(rowid, embedding) VALUES (?, ?)");
    for (const id of [2, 4]) put.run(BigInt(id), Buffer.from(new Float32Array([1, 0, 0, 0]).buffer));

    const frag = noVectorYetSql(db);
    assert.match(frag, /vec_chunks_rowids/, "must go through the shadow table");
    assert.doesNotMatch(frag, /FROM vec_chunks WHERE/, "must not point-query the virtual table");

    const sql = `SELECT id FROM messages WHERE 1=1${frag} ORDER BY id`;
    const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all().map((r) => r.detail).join(" | ");
    assert.match(plan, /INTEGER PRIMARY KEY/, `plan must be an indexed search, got: ${plan}`);
    assert.doesNotMatch(plan, /VIRTUAL TABLE/, `plan must not scan vec0, got: ${plan}`);

    // Same answer as the definition: every message whose id has no vector row.
    assert.deepEqual(db.prepare(sql).all().map((r) => r.id), [1, 3, 5, 6]);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("embedPending's `remaining` count applies the SAME scope filter as its selection (one truth, one number)", () => {
  // Audit 2026-09-07 (duplicate-source pass): the selection and vectorRemaining() applied
  // SCOPE_EXCLUDE_SQL, the remaining count did not — with an excluded lane the CLI would report a
  // backlog its own selection could never drain.
  const src = readFileSync(new URL("../src/memory/vectors.ts", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("export async function embedPending"), src.indexOf("export interface VecRank"));
  const rem = fn.slice(fn.indexOf("let remaining = 0"));
  const counts = rem.match(/SELECT count\(\*\) c FROM messages[^`]*`/g) ?? [];
  assert.ok(counts.length >= 2, `expected both remaining queries, saw ${counts.length}`);
  for (const q of counts) assert.match(q, /\$\{ex\.sql\}/, `remaining query without the scope filter: ${q.slice(0, 80)}…`);
  assert.match(rem, /\.get\(\.\.\.ex\.params\)/, "and it must bind the filter's params");
});

test("shadow table absent (store that never embedded) → falls back to the virtual table, does not throw", () => {
  const { dir, db } = fixture();
  try {
    // No vec0 table at all: callers gate on `has`, but the helper itself must still return a
    // usable fragment naming the virtual table rather than a missing shadow table.
    const frag = noVectorYetSql(db);
    assert.match(frag, /FROM vec_chunks WHERE/);
    assert.doesNotMatch(frag, /vec_chunks_rowids/);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("id expression is injectable so callers with a different alias get the same shape", () => {
  const { dir, db } = fixture();
  try {
    db.exec("CREATE VIRTUAL TABLE vec_chunks USING vec0(embedding float[4])");
    assert.match(noVectorYetSql(db, "m.id"), /r\.rowid = m\.id\)/);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
