import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { openBrain } from "../../dist/brain/db.js";
import { digestBackfill, searchDigests } from "../../dist/brain/digest.js";
import { backupBrain, forgetBrain, reRedactBrain, restoreBrainBackup, vacuumBrain } from "../../dist/brain/privacy.js";
import { search } from "../../dist/brain/search.js";
import { embedPending, vectorRanks } from "../../dist/brain/vectors.js";
import { tempDir } from "./helpers.mjs";

function seedSession(db, { id, project, source = "codex", messages }) {
  db.prepare(
    `INSERT INTO sessions (id, source, project_root, cwd, title, started_at, ended_at, message_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    source,
    project,
    project,
    id,
    messages[0]?.timestamp ?? null,
    messages.at(-1)?.timestamp ?? null,
    messages.length,
  );
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?, ?, ?, ?, ?)");
  messages.forEach((m, i) => ins.run(id, `${id}-${i}`, m.role ?? "user", m.content, m.timestamp ?? null));
}

test("brain backup and restore round-trip a raw local DB", async (t) => {
  const root = tempDir(t, "zemory-brain-backup-");
  const dbPath = join(root, "brain.db");
  const backupPath = join(root, "backup.db");

  const db = openBrain(dbPath);
  seedSession(db, {
    id: "s1",
    project: root,
    messages: [{ content: "keep this memory", timestamp: "2026-01-01T00:00:00Z" }],
  });
  db.close();

  const backup = await backupBrain({ dbPath, outPath: backupPath });
  assert.equal(backup.outPath, backupPath);
  assert.equal(existsSync(backupPath), true);

  const edited = openBrain(dbPath);
  edited.prepare("DELETE FROM messages").run();
  edited.close();

  const restored = await restoreBrainBackup({ backupPath, dbPath, force: true });
  assert.equal(existsSync(restored.previousBackupPath), true);
  const check = openBrain(dbPath);
  try {
    assert.deepEqual(check.prepare("SELECT content FROM messages").get(), { content: "keep this memory" });
  } finally {
    check.close();
  }
});

test("brain forget previews first, then deletes selected project rows", async (t) => {
  const root = tempDir(t, "zemory-brain-forget-");
  const dbPath = join(root, "brain.db");
  const projectA = join(root, "project-a");
  const projectB = join(root, "project-b");
  const db = openBrain(dbPath);
  seedSession(db, {
    id: "a",
    project: projectA,
    messages: [
      { content: "alpha secret one", timestamp: "2026-01-01T00:00:00Z" },
      { content: "alpha secret two", timestamp: "2026-01-01T00:01:00Z" },
    ],
  });
  seedSession(db, {
    id: "b",
    project: projectB,
    messages: [{ content: "beta stays", timestamp: "2026-01-01T00:02:00Z" }],
  });
  db.close();

  const preview = await forgetBrain({ dbPath, project: projectA });
  assert.equal(preview.dryRun, true);
  assert.equal(preview.messages, 2);
  assert.equal(preview.sessions, 1);
  assert.equal(search("alpha", { dbPath, project: projectA }).length, 2);

  const deleted = await forgetBrain({ dbPath, project: projectA, force: true });
  assert.equal(deleted.dryRun, false);
  assert.equal(deleted.messages, 2);
  assert.equal(deleted.sessions, 1);
  assert.equal(existsSync(deleted.backupPath), true);
  assert.equal(search("alpha", { dbPath, project: projectA }).length, 0);
  assert.equal(search("beta", { dbPath, project: projectB }).length, 1);

  const check = openBrain(dbPath);
  try {
    assert.deepEqual(check.prepare("SELECT id FROM sessions ORDER BY id").all(), [{ id: "b" }]);
  } finally {
    check.close();
  }
});

test("brain redact re-applies secret scrubbing to existing messages and FTS", async (t) => {
  const root = tempDir(t, "zemory-brain-redact-");
  const dbPath = join(root, "brain.db");
  const token = `sk-ant-${"a".repeat(24)}`;
  const db = openBrain(dbPath);
  seedSession(db, {
    id: "s1",
    project: root,
    messages: [{ content: `token leaked ${token}`, timestamp: "2026-01-01T00:00:00Z" }],
  });
  db.close();

  const preview = await reRedactBrain({ dbPath });
  assert.equal(preview.dryRun, true);
  assert.equal(preview.changed.messages, 1);
  assert.equal(search(token, { dbPath, all: true }).length, 1);

  const applied = await reRedactBrain({ dbPath, force: true, skipBackup: true });
  assert.equal(applied.dryRun, false);
  assert.equal(applied.changed.messages, 1);

  const check = openBrain(dbPath);
  try {
    const row = check.prepare("SELECT content FROM messages").get();
    assert.equal(row.content.includes(token), false);
    assert.equal(row.content.includes("[REDACTED]"), true);
  } finally {
    check.close();
  }
  assert.equal(search(token, { dbPath, all: true }).length, 0);
});

test("brain forget also drops the session digest (forgotten text must leave the digest lane)", async (t) => {
  const root = tempDir(t, "zemory-forget-digest-");
  const dbPath = join(root, "brain.db");
  const db = openBrain(dbPath);
  seedSession(db, {
    id: "d1",
    project: root,
    messages: [{ content: "quarklet mission briefing", timestamp: "2026-01-01T00:00:00Z" }],
  });
  db.close();
  digestBackfill(dbPath);
  assert.equal(searchDigests("quarklet", { dbPath }).length, 1);

  const r = await forgetBrain({ dbPath, session: "d1", force: true, skipBackup: true });
  assert.equal(r.digests, 1);
  assert.equal(searchDigests("quarklet", { dbPath }).length, 0);
  const check = openBrain(dbPath);
  try {
    assert.equal(check.prepare("SELECT COUNT(*) c FROM session_digest").get().c, 0);
    assert.equal(check.prepare("SELECT COUNT(*) c FROM session_digest_fts").get().c, 0);
  } finally {
    check.close();
  }
});

test("vacuumBrain shrinks the file after a bulk delete and preserves a vec0 index (plan 12 buoc 5)", async (t) => {
  const root = tempDir(t, "zemory-vacuum-");
  const dbPath = join(root, "brain.db");
  const db = openBrain(dbPath);
  // s0 is the SHORTEST content so embedPending's shortest-first ordering picks
  // it within a tiny limit — that keeps this test from running the real model
  // over hundreds of long messages (each real embed call is seconds; that
  // alone turned an earlier version of this test into a 10-minute outlier).
  // The other 300 rows are bulk filler purely to give VACUUM real freed pages
  // to reclaim (a couple of tiny rows round-trips too fast to measure).
  seedSession(db, { id: "s0", project: root, messages: [{ content: "brown fox", timestamp: "2026-01-01T00:00:00Z" }] });
  const filler = "the quick brown fox jumps over the lazy dog ".repeat(200);
  for (let i = 1; i < 300; i++) {
    seedSession(db, { id: `s${i}`, project: root, messages: [{ content: `${filler} #${i}`, timestamp: "2026-01-01T00:00:00Z" }] });
  }
  db.close();

  const seeded = await embedPending({ dbPath, limit: 1 });
  const modelAvailable = seeded.embedded > 0;
  if (modelAvailable) {
    const ranks = await vectorRanks("brown fox", { dbPath });
    assert.ok(ranks.length > 0, "sanity: vector search works before vacuum");
  }

  // Delete most rows so VACUUM has real freed space to reclaim.
  const wipe = openBrain(dbPath);
  wipe.prepare("DELETE FROM messages WHERE session_id != 's0'").run();
  wipe.prepare("DELETE FROM sessions WHERE id != 's0'").run();
  wipe.close();

  const r = vacuumBrain(dbPath);
  assert.ok(r.bytesBefore > 0);
  assert.ok(r.bytesAfter < r.bytesBefore, `expected shrink, got ${r.bytesBefore} -> ${r.bytesAfter}`);

  // The DB must stay fully functional after VACUUM: FTS, and — if a vec0
  // index existed — semantic search too (proves the module resolved cleanly).
  assert.equal(search("fox", { dbPath, all: true }).length, 1, "surviving row still searchable via FTS");
  if (modelAvailable) {
    const ranks = await vectorRanks("brown fox", { dbPath });
    assert.ok(ranks.length > 0, "vec0 index still queryable after VACUUM");
  } else {
    console.log("  embed model unavailable — vec0-after-VACUUM check skipped");
  }
});

test("brain redact scrubs secrets quoted inside session digests too", async (t) => {
  const root = tempDir(t, "zemory-redact-digest-");
  const dbPath = join(root, "brain.db");
  const token = `ghp_${"b".repeat(24)}`;
  const db = openBrain(dbPath);
  seedSession(db, {
    id: "d1",
    project: root,
    messages: [{ content: `leaked ${token} in chat`, timestamp: "2026-01-01T00:00:00Z" }],
  });
  db.close();
  digestBackfill(dbPath);
  // The digest quotes the message, so the secret is now in the digest lane.
  assert.equal(searchDigests(token, { dbPath }).length, 1);

  const r = await reRedactBrain({ dbPath, force: true, skipBackup: true });
  assert.equal(r.changed.sessionDigests, 1);
  assert.equal(searchDigests(token, { dbPath }).length, 0);
  const check = openBrain(dbPath);
  try {
    const row = check.prepare("SELECT tasks, digest_text FROM session_digest").get();
    assert.equal(row.digest_text.includes(token), false);
    assert.equal(row.digest_text.includes("[REDACTED]"), true);
    // JSON columns must stay valid JSON after in-place redaction.
    assert.doesNotThrow(() => JSON.parse(row.tasks));
  } finally {
    check.close();
  }
});
