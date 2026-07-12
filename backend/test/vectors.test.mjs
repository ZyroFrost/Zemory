import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import * as sqliteVec from "sqlite-vec";
import { openBrain } from "../../dist/brain/db.js";
import { embed } from "../../dist/brain/embed.js";
import {
  dropVectorIndex,
  embedPending,
  forgetVectors,
  pruneOrphanVectors,
  vectorCount,
  vectorIndexProfile,
  vectorRanks,
  vectorRemaining,
} from "../../dist/brain/vectors.js";
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

test("embedPending dedups exact-duplicate content: vector COPIED bit-for-bit, no extra model call", async () => {
  const dbPath = join(mkdtempSync(join(tmpdir(), "zemory-dedup-")), "d.db");
  const db = openBrain(dbPath);
  db.prepare("INSERT INTO sessions(id, source, project_root, message_count) VALUES (?,?,?,?)").run("s1", "codex", "C:\\demo", 3);
  const ins = db.prepare("INSERT INTO messages(session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  const REPEATED = "the quarterly report must be filed before the deadline on friday";
  ins.run("s1", "u1", "user", REPEATED, "2026-07-01T00:00:00Z");
  ins.run("s1", "u2", "assistant", "unrelated answer about database indexes and vacuum", "2026-07-01T00:01:00Z");
  ins.run("s1", "u3", "user", REPEATED, "2026-07-01T00:02:00Z"); // exact repeat (e.g. re-injected rules card)
  db.close();

  const r = await embedPending({ dbPath });
  if (r.embedded === 0) {
    console.log("  skipped (model unavailable)");
    return;
  }
  assert.equal(r.embedded, 3, "all three rows got vectors");
  assert.equal(r.deduped, 1, "the repeat was copied, not re-embedded");
  assert.equal(vectorRemaining(dbPath), 0);

  const check = new Database(dbPath);
  sqliteVec.load(check);
  try {
    // Identical content ⇒ identical vector (bit-for-bit) — proof of zero quality change.
    const ids = check.prepare("SELECT id FROM messages WHERE content = ? ORDER BY id").all(REPEATED).map((x) => x.id);
    const v1 = check.prepare("SELECT embedding FROM vec_chunks WHERE rowid = ?").get(BigInt(ids[0])).embedding;
    const v2 = check.prepare("SELECT embedding FROM vec_chunks WHERE rowid = ?").get(BigInt(ids[1])).embedding;
    assert.ok(Buffer.compare(v1, v2) === 0, "duplicate rows share the identical vector");
    // vec_hash holds one entry per UNIQUE content.
    assert.equal(check.prepare("SELECT COUNT(*) c FROM vec_hash").get().c, 2);
  } finally {
    check.close();
  }

  // A LATER pass re-seeing the same content (new message) copies without the model.
  const db2 = openBrain(dbPath);
  db2.prepare("INSERT INTO messages(session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)")
    .run("s1", "u4", "user", REPEATED, "2026-07-02T00:00:00Z");
  db2.close();
  const r2 = await embedPending({ dbPath });
  assert.equal(r2.embedded, 1);
  assert.equal(r2.deduped, 1, "cross-run duplicate copied via vec_hash");
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
const SYNTH_BASE = 2 ** 40; // chunk rowids for long messages live above this

test("long messages are chunked: the tail (beyond 6000 chars) is visible to semantic search", async () => {
  const dbPath = join(mkdtempSync(join(tmpdir(), "zemory-chunk-")), "c.db");
  const db = openBrain(dbPath);
  db.prepare("INSERT INTO sessions(id, source, project_root, message_count) VALUES (?,?,?,?)").run("s1", "claude-code", "C:\\demo", 2);
  const ins = db.prepare("INSERT INTO messages(session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  // ~13k chars of cooking filler, then a distinctive fact ONLY in the tail —
  // under the old hard cap this fact was invisible to the vector lane.
  const filler = "we simmered the tomato broth and folded the pasta dough gently before baking the bread loaves in the stone oven. ".repeat(103);
  const longMsg = filler + " the vault passphrase is kept inside the blue notebook in the server room drawer";
  assert.ok(longMsg.length > 11000 && longMsg.length < 12000, "setup: message must span exactly 3 chunks with a fact-heavy tail chunk");
  ins.run("s1", "u1", "assistant", longMsg, "2026-07-01T00:00:00Z");
  ins.run("s1", "u2", "user", "the garden tomatoes are ripening nicely this summer season", "2026-07-01T00:01:00Z");
  db.close();

  const r = await embedPending({ dbPath });
  if (r.embedded === 0) {
    console.log("  skipped (model unavailable)");
    return;
  }
  assert.equal(r.remaining, 0);
  assert.ok(vectorCount(dbPath) > 2, `chunks add extra vectors (got ${vectorCount(dbPath)})`);
  const check = new Database(dbPath);
  try {
    const map = check.prepare("SELECT rowid, message_id, seq FROM vec_map ORDER BY seq").all();
    assert.ok(map.length >= 2, "chunks 1+ recorded in vec_map");
    assert.ok(map.every((m) => m.message_id === 1 && m.rowid >= SYNTH_BASE));
  } finally {
    check.close();
  }
  // second pass is still incremental — chunk-0 presence marks the message done
  const r2 = await embedPending({ dbPath });
  assert.equal(r2.embedded, 0, "nothing new on second pass");
  // a query about the TAIL fact must resolve to message #1, with no duplicate ids
  const ranks = await vectorRanks("where is the vault passphrase stored", { dbPath });
  assert.ok(ranks.length >= 1);
  assert.equal(ranks[0].rowid, 1, `tail content should win, got #${ranks[0].rowid}`);
  assert.equal(new Set(ranks.map((x) => x.rowid)).size, ranks.length, "chunk hits collapse to unique messages");
});

test("vec_config records the embed profile; a raw-built index stays raw for later queries", async () => {
  process.env.ZEMORY_EMBED_PROMPTS = "0";
  let dbPath;
  try {
    dbPath = seedDb();
    const r = await embedPending({ dbPath });
    if (r.embedded === 0) {
      console.log("  skipped (model unavailable)");
      return;
    }
    assert.equal(vectorIndexProfile(dbPath), "raw", "index built with prompts disabled records raw");
  } finally {
    delete process.env.ZEMORY_EMBED_PROMPTS;
  }
  // prompts are back on, but the STORED profile is authoritative for this index
  assert.equal(vectorIndexProfile(dbPath), "raw");

  // a fresh index under the default Gemma model records the prompt profile
  const dbPath2 = seedDb();
  const r2 = await embedPending({ dbPath: dbPath2 });
  if (r2.embedded > 0) assert.equal(vectorIndexProfile(dbPath2), "gemma-prompt-v1");
});

test("dropVectorIndex clears the derived index so --rebuild can re-embed under a new profile", async () => {
  const dbPath = seedDb();
  const r = await embedPending({ dbPath });
  if (r.embedded === 0) {
    console.log("  skipped (model unavailable)");
    return;
  }
  assert.equal(vectorCount(dbPath), 3);
  dropVectorIndex(dbPath);
  assert.equal(vectorCount(dbPath), 0);
  assert.equal(vectorRemaining(dbPath), 3, "all messages pending again");
  const r2 = await embedPending({ dbPath });
  assert.equal(r2.embedded, 3, "rebuild fills the index back up");
});

function createBareVecIndex(dbPath, dims = 4) {
  const db = new Database(dbPath);
  sqliteVec.load(db);
  try {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[${dims}])`);
    db.exec("CREATE TABLE IF NOT EXISTS vec_map (rowid INTEGER PRIMARY KEY, message_id INTEGER NOT NULL, seq INTEGER NOT NULL)");
    db.exec("CREATE TABLE IF NOT EXISTS vec_hash (hash TEXT PRIMARY KEY, rowid INTEGER NOT NULL)");
  } finally {
    db.close();
  }
}

test("forgetVectors removes a message's vector, its chunk rows, and dedup-hash entries (no model needed)", () => {
  const dbPath = seedDb();
  createBareVecIndex(dbPath);
  insertVectorRow(dbPath, 1, [1, 0, 0, 0]);
  insertVectorRow(dbPath, 2, [0, 1, 0, 0]);
  insertVectorRow(dbPath, SYNTH_BASE, [0, 0, 1, 0]); // chunk 1 of message 1
  const db = new Database(dbPath);
  try {
    db.prepare("INSERT INTO vec_map(rowid, message_id, seq) VALUES (?,?,?)").run(SYNTH_BASE, 1, 1);
    db.prepare("INSERT INTO vec_hash(hash, rowid) VALUES (?,?)").run("h-msg1", 1);
    db.prepare("INSERT INTO vec_hash(hash, rowid) VALUES (?,?)").run("h-chunk1", SYNTH_BASE);
    db.prepare("INSERT INTO vec_hash(hash, rowid) VALUES (?,?)").run("h-msg2", 2);
  } finally {
    db.close();
  }

  const removed = forgetVectors(dbPath, [1]);
  assert.equal(removed, 2, "message vector + its chunk vector removed");
  assert.equal(vectorCount(dbPath), 1, "message 2's vector survives");
  const check = new Database(dbPath);
  try {
    assert.equal(check.prepare("SELECT count(*) c FROM vec_map").get().c, 0);
    assert.deepEqual(
      check.prepare("SELECT hash FROM vec_hash ORDER BY hash").all().map((x) => x.hash),
      ["h-msg2"],
    );
  } finally {
    check.close();
  }
});

test("pruneOrphanVectors drops vectors whose message is gone (snapshot filtering)", () => {
  const dbPath = seedDb();
  createBareVecIndex(dbPath);
  insertVectorRow(dbPath, 1, [1, 0, 0, 0]);
  insertVectorRow(dbPath, 999, [0, 1, 0, 0]); // no such message
  insertVectorRow(dbPath, SYNTH_BASE, [0, 0, 1, 0]); // chunk of a DELETED message
  const db = new Database(dbPath);
  try {
    db.prepare("INSERT INTO vec_map(rowid, message_id, seq) VALUES (?,?,?)").run(SYNTH_BASE, 999, 1);
    db.prepare("INSERT INTO vec_hash(hash, rowid) VALUES (?,?)").run("h-live", 1);
    db.prepare("INSERT INTO vec_hash(hash, rowid) VALUES (?,?)").run("h-orphan", 999);
  } finally {
    db.close();
  }

  pruneOrphanVectors(dbPath);
  assert.equal(vectorCount(dbPath), 1, "only the live message's vector survives");
  const check = new Database(dbPath);
  try {
    assert.equal(check.prepare("SELECT count(*) c FROM vec_map").get().c, 0);
    assert.deepEqual(
      check.prepare("SELECT hash FROM vec_hash").all().map((x) => x.hash),
      ["h-live"],
    );
  } finally {
    check.close();
  }
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
