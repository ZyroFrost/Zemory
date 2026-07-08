import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import * as sqliteVec from "sqlite-vec";
import { openBrain } from "../../dist/brain/db.js";
import { embed } from "../../dist/brain/embed.js";
import { embedPending, vectorCount, vectorRanks, vectorRemaining } from "../../dist/brain/vectors.js";
import { hybridEnabled, search, searchHybrid } from "../../dist/brain/search.js";
import { runRagBench } from "../../dist/brain/ragbench.js";

test("hybrid setting: default ON; ZEMORY_HYBRID=0 disables", () => {
  delete process.env.ZEMORY_HYBRID;
  assert.equal(hybridEnabled(), true, "default on (benchmark gate passed)");
  for (const off of ["0", "false", "off"]) {
    process.env.ZEMORY_HYBRID = off;
    assert.equal(hybridEnabled(), false, `${off} disables`);
  }
  delete process.env.ZEMORY_HYBRID;
});

function seedDb() {
  const dbPath = join(mkdtempSync(join(tmpdir(), "zemory-vec-")), "test.db");
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

function insertVectorRow(dbPath, rowid, vec) {
  const db = new Database(dbPath);
  sqliteVec.load(db);
  try {
    db.prepare("INSERT INTO vec_chunks(rowid, embedding) VALUES (?, ?)").run(
      BigInt(rowid),
      Buffer.from(new Float32Array(vec).buffer),
    );
  } finally {
    db.close();
  }
}

test("embedPending builds vectors; vectorRanks finds the semantically closest message", async () => {
  const dbPath = seedDb();
  const progress = [];
  const r = await embedPending({ dbPath, onProgress: (p) => progress.push(p) });
  if (r.embedded === 0) {
    console.log("  embed model unavailable — skipped (fail-open)");
    return;
  }
  assert.equal(progress.length, 3, "progress callback fires for each scanned message");
  assert.deepEqual(progress.map((p) => p.done), [1, 2, 3]);
  assert.deepEqual(
    progress.map((p) => p.currentId).slice().sort((a, b) => a - b),
    [1, 2, 3],
  );
  assert.equal(r.embedded, 3, "all 3 messages embedded");
  assert.equal(vectorCount(dbPath), 3);
  assert.equal(vectorRemaining(dbPath), 0);
  assert.equal(r.remaining, 0);
  // semantic query (different words) closest to message #1 (db / password / credentials)
  const ranks = await vectorRanks("change the credentials for the postgres server", { dbPath });
  assert.ok(ranks.length >= 1, "got vector hits");
  assert.equal(ranks[0].rowid, 1, `top hit should be the db-password message, got #${ranks[0].rowid}`);
});

test("searchHybrid finds a semantic match that FTS-only misses (Giai đoạn C)", async () => {
  const dbPath = seedDb();
  const r = await embedPending({ dbPath });
  if (r.embedded === 0) {
    console.log("  skipped (model unavailable)");
    return;
  }
  // Query with ZERO word overlap with msg #1 ("...database password...migration").
  const q = "rotate the postgres login secret token";
  const fts = search(q, { dbPath, all: true });
  const hyb = await searchHybrid(q, { dbPath, all: true });
  assert.ok(hyb.length >= 1, "hybrid returns a hit");
  assert.equal(hyb[0].id, 1, `hybrid top hit = db-password message, got #${hyb[0]?.id}`);
  console.log(`  FTS hits=${fts.length} · hybrid hits=${hyb.length} · hybrid top=#${hyb[0].id}`);
});

test("embedPending is incremental (second pass embeds nothing new)", async () => {
  const dbPath = seedDb();
  const a = await embedPending({ dbPath });
  if (a.embedded === 0) {
    console.log("  skipped (model unavailable)");
    return;
  }
  const b = await embedPending({ dbPath });
  assert.equal(b.embedded, 0, "nothing new on second pass");
  assert.equal(b.remaining, 0);
  assert.equal(vectorRemaining(dbPath), 0);
});

test("RAG gate: hybrid recall@3 >= FTS recall@3 on the paraphrase corpus (Giai đoạn D)", async () => {
  const dbPath = join(mkdtempSync(join(tmpdir(), "zemory-bench-")), "b.db");
  const r = await runRagBench({ dbPath });
  if (r.embedded === 0) {
    console.log("  skipped (model unavailable)");
    return;
  }
  console.log(
    `  FTS recall@3=${(r.ftsRecall * 100).toFixed(0)}% · hybrid recall@3=${(r.hybridRecall * 100).toFixed(0)}% · hybrid ${r.hybridMsAvg.toFixed(0)}ms/q`,
  );
  assert.ok(r.hybridRecall >= r.ftsRecall, `hybrid (${r.hybridRecall}) must be >= FTS (${r.ftsRecall})`);
});
test("embedPending survives a preexisting vec_chunks row during backfill", async () => {
  const dbPath = seedDb();
  const seedVector = await embed("seed vector probe");
  if (!seedVector) {
    console.log("  skipped (model unavailable)");
    return;
  }

  let injected = false;
  const r = await embedPending({
    dbPath,
    onProgress: (p) => {
      if (injected || p.done !== 1) return;
      injected = true;
      // Simulate a concurrent writer filling the next row while this batch is
      // still in flight. The backfill path must update instead of crashing.
      insertVectorRow(dbPath, 3, seedVector);
    },
  });

  assert.equal(injected, true, "regression setup injected a preexisting row");
  assert.equal(r.embedded, 3, "backfill still completes the batch");
  assert.equal(vectorCount(dbPath), 3);
  assert.equal(vectorRemaining(dbPath), 0);
});
