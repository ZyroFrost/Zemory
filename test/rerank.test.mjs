import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openBrain } from "../dist/brain/db.js";
import { rerank, rerankConfig, resetRerank } from "../dist/brain/rerank.js";
import { rerankEnabled, searchHybrid } from "../dist/brain/search.js";

test("rerankConfig defaults to a cross-encoder · q8 · ~/.zemory/models", () => {
  const c = rerankConfig();
  assert.match(c.model, /rerank/i);
  assert.equal(c.dtype, "q8");
  assert.match(c.cacheDir, /[\\/]\.zemory[\\/]models/);
});

test("rerankEnabled: force arg wins; ZEMORY_RERANK env overrides; default off via env", () => {
  delete process.env.ZEMORY_RERANK;
  assert.equal(rerankEnabled(true), true, "force true");
  assert.equal(rerankEnabled(false), false, "force false");
  for (const on of ["1", "true", "on"]) {
    process.env.ZEMORY_RERANK = on;
    assert.equal(rerankEnabled(), true, `${on} enables`);
  }
  for (const off of ["0", "false", "off"]) {
    process.env.ZEMORY_RERANK = off;
    assert.equal(rerankEnabled(), false, `${off} disables`);
  }
  delete process.env.ZEMORY_RERANK;
});

test("rerank fails open to null on a bad model id (never throws)", async () => {
  process.env.ZEMORY_RERANK_MODEL = "zzz/not-a-real-reranker-xyz";
  resetRerank();
  try {
    assert.equal(await rerank("q", ["a", "b"]), null);
  } finally {
    delete process.env.ZEMORY_RERANK_MODEL;
    resetRerank();
  }
});

test("rerank returns finite scores aligned to docs when model available, else null", async () => {
  const docs = [
    "to reset your database password run the migration and update the connection string",
    "preheat the oven and bake the chocolate cake for forty minutes",
  ];
  const scores = await rerank("rotate the postgres login secret", docs);
  if (scores === null) {
    console.log("  rerank: model unavailable — fail-open path (ok)");
    return;
  }
  assert.equal(scores.length, docs.length, "one score per doc");
  assert.ok(scores.every((s) => Number.isFinite(s)), "all scores finite");
  // The db-password doc must outrank the cake doc for a credentials query.
  assert.ok(scores[0] > scores[1], `db doc (${scores[0]}) should beat cake doc (${scores[1]})`);
});

function seedDb() {
  const dbPath = join(mkdtempSync(join(tmpdir(), "zemory-rerank-")), "test.db");
  const db = openBrain(dbPath);
  db.prepare("INSERT INTO sessions(id, source, project_root, message_count) VALUES (?,?,?,?)").run(
    "s1", "claude-code", "C:\\demo", 3,
  );
  const ins = db.prepare("INSERT INTO messages(session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  ins.run("s1", "u1", "user", "how do I reset my database password and run the migration", "2026-06-26T00:00:00Z");
  ins.run("s1", "u2", "assistant", "to bake a chocolate cake preheat the oven to 180 degrees", "2026-06-26T00:01:00Z");
  ins.run("s1", "u3", "user", "the cat sat on the warm windowsill enjoying the afternoon sun", "2026-06-26T00:02:00Z");
  db.close();
  return dbPath;
}

test("searchHybrid with rerank is non-destructive: same candidate set, never empties results", async () => {
  const dbPath = seedDb();
  const q = "reset database password migration"; // keyword overlap → FTS finds msg #1
  const base = await searchHybrid(q, { dbPath, all: true, rerank: false });
  const reranked = await searchHybrid(q, { dbPath, all: true, rerank: true });
  assert.ok(base.length >= 1, "hybrid baseline returns a hit");
  assert.equal(reranked.length, base.length, "rerank keeps the same number of hits on this corpus");
  const baseIds = new Set(base.map((h) => h.id));
  for (const h of reranked) {
    assert.ok(baseIds.has(h.id), `rerank id #${h.id} comes from the baseline candidate set`);
  }
  assert.ok(reranked.some((h) => h.id === 1), "the db-password message is still recalled");
});
