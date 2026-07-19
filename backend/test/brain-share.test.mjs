import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { openBrain } from "../../dist/brain/db.js";
import {
  exportBrainBundle,
  importBrainBundle,
  mergeBrainBundle,
  readExportWatermark,
  writeBrainShareKey,
  writeExportWatermark,
} from "../../dist/brain/share.js";
import { tempDir } from "./helpers.mjs";

// Seed a brain with sessions/messages; each session carries an explicit host.
function seedBrain(dbPath, sessions) {
  const db = openBrain(dbPath);
  try {
    const insS = db.prepare(
      `INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?, ?, ?, ?, ?, 0)`,
    );
    const insM = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?, ?, ?, ?, ?)");
    for (const s of sessions) {
      insS.run(s.id, s.source ?? "claude-code", s.origin ?? "local", s.project ?? "C:\\p", s.host);
      for (const m of s.messages) insM.run(s.id, m.uuid ?? null, m.role ?? "user", m.content, m.ts ?? "2026-01-01T00:00:00Z");
    }
  } finally {
    db.close();
  }
}

test("encrypted brain bundles round-trip without plaintext leakage", async (t) => {
  const root = tempDir(t, "zemory-brain-share-");
  const dbPath = join(root, "brain.db");
  const keyPath = join(root, "share.key");
  const bundlePath = join(root, "brain.zemory.enc");
  const restoredPath = join(root, "restored.db");
  const secretText = "secret brass compass memory";

  const db = openBrain(dbPath);
  db.prepare(
    `INSERT INTO sessions (id, source, project_root, cwd, title, started_at, ended_at, message_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run("s1", "codex", root, root, "share test", "2026-01-01T00:00:00Z", "2026-01-01T00:01:00Z", 1);
  db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?, ?, ?, ?, ?)").run(
    "s1",
    "m1",
    "user",
    secretText,
    "2026-01-01T00:00:30Z",
  );
  db.close();

  writeBrainShareKey(keyPath);
  const exported = await exportBrainBundle({ dbPath, outPath: bundlePath, keyFile: keyPath });
  assert.ok(exported.bundleBytes > exported.sourceBytes);
  assert.equal(readFileSync(bundlePath).includes(Buffer.from(secretText)), false);

  const imported = await importBrainBundle({ bundlePath, dbPath: restoredPath, keyFile: keyPath });
  assert.equal(imported.backupPath, null);
  assert.equal(existsSync(restoredPath), true);

  const restored = openBrain(restoredPath);
  try {
    const row = restored.prepare("SELECT content FROM messages WHERE uuid='m1'").get();
    assert.deepEqual(row, { content: secretText });
  } finally {
    restored.close();
  }
});

test("encrypted brain import refuses overwrite without --force", async (t) => {
  const root = tempDir(t, "zemory-brain-share-force-");
  const dbPath = join(root, "brain.db");
  const keyPath = join(root, "share.key");
  const bundlePath = join(root, "brain.zemory.enc");
  const targetPath = join(root, "target.db");

  openBrain(dbPath).close();
  openBrain(targetPath).close();
  writeBrainShareKey(keyPath);
  await exportBrainBundle({ dbPath, outPath: bundlePath, keyFile: keyPath });

  await assert.rejects(
    () => importBrainBundle({ bundlePath, dbPath: targetPath, keyFile: keyPath }),
    /Refusing to overwrite/,
  );
});

test("merge import is additive: keeps local data, adds new sessions/messages, preserves host", async (t) => {
  const root = tempDir(t, "zemory-brain-merge-");
  const dbA = join(root, "a.db"); // this machine
  const dbB = join(root, "b.db"); // other machine
  const keyPath = join(root, "share.key");
  const bundle = join(root, "b.zemory.enc");

  // A: shared session (one uuid'd + one NULL-uuid msg) + one only-on-A session.
  seedBrain(dbA, [
    { id: "shared", host: "PC-A", messages: [{ uuid: "uA1", content: "alpha original" }, { uuid: null, content: "tool log X" }] },
    { id: "onlyA", host: "PC-A", messages: [{ uuid: "ua", content: "only on A" }] },
  ]);
  // B: same shared session continued (dup uA1, new uB2, dup NULL "tool log X",
  // new NULL "tool log Y") + one only-on-B session.
  seedBrain(dbB, [
    {
      id: "shared",
      host: "PC-B",
      messages: [
        { uuid: "uA1", content: "alpha original" },
        { uuid: "uB2", content: "beta from B" },
        { uuid: null, content: "tool log X" },
        { uuid: null, content: "tool log Y" },
      ],
    },
    { id: "onlyB", host: "PC-B", origin: "web", source: "chatgpt-web", messages: [{ uuid: "ub", content: "only on B" }] },
  ]);

  writeBrainShareKey(keyPath);
  await exportBrainBundle({ dbPath: dbB, outPath: bundle, keyFile: keyPath });

  const r = await mergeBrainBundle({ bundlePath: bundle, dbPath: dbA, keyFile: keyPath });
  assert.equal(r.sessionsAdded, 1, "only onlyB is new");
  // New = uB2 (uuid) + "tool log Y" (null) + ub (onlyB). uA1 + "tool log X" deduped.
  assert.equal(r.messagesAdded, 3, "uB2 + tool-log-Y + ub are new; uA1 and tool-log-X deduped");

  const db = openBrain(dbA);
  try {
    const sessions = Object.fromEntries(
      db.prepare("SELECT id, host, origin, message_count FROM sessions").all().map((s) => [s.id, s]),
    );
    assert.ok(sessions.onlyA, "onlyA preserved (nothing lost)");
    assert.equal(sessions.onlyA.host, "PC-A");
    assert.equal(sessions.onlyA.origin, "local", "local-origin session stays local");
    assert.ok(sessions.onlyB, "onlyB merged in");
    assert.equal(sessions.onlyB.host, "PC-B", "onlyB keeps producing-machine host");
    assert.equal(sessions.onlyB.origin, "web", "web-origin session keeps its 'web' lane across the merge");
    assert.equal(sessions.shared.host, "PC-A", "shared host stays local (INSERT OR IGNORE)");
    assert.equal(sessions.shared.message_count, 4, "shared = uA1 + uB2 + tool-log-X + tool-log-Y");
    // No duplicate of the uuid'd or the NULL-uuid shared message.
    assert.equal(db.prepare("SELECT COUNT(*) c FROM messages WHERE session_id='shared' AND uuid='uA1'").get().c, 1);
    assert.equal(db.prepare("SELECT COUNT(*) c FROM messages WHERE content='tool log X'").get().c, 1, "NULL-uuid msg not duplicated");
    const hit = db.prepare("SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'beta'").all();
    assert.equal(hit.length, 1, "merged message is searchable via FTS");
  } finally {
    db.close();
  }

  // Idempotent: merging the SAME bundle again adds nothing (incl. NULL-uuid rows).
  const again = await mergeBrainBundle({ bundlePath: bundle, dbPath: dbA, keyFile: keyPath });
  assert.equal(again.sessionsAdded, 0, "re-merge adds no sessions");
  assert.equal(again.messagesAdded, 0, "re-merge adds no messages (NULL-uuid dedup holds)");
});

test("merge into a fresh machine (no local DB yet) imports everything", async (t) => {
  const root = tempDir(t, "zemory-brain-merge-fresh-");
  const dbB = join(root, "b.db");
  const dbNew = join(root, "new.db");
  const keyPath = join(root, "share.key");
  const bundle = join(root, "b.zemory.enc");

  seedBrain(dbB, [{ id: "s1", host: "PC-B", messages: [{ uuid: "m1", content: "hello" }] }]);
  writeBrainShareKey(keyPath);
  await exportBrainBundle({ dbPath: dbB, outPath: bundle, keyFile: keyPath });

  const r = await mergeBrainBundle({ bundlePath: bundle, dbPath: dbNew, keyFile: keyPath });
  assert.equal(r.sessionsAdded, 1);
  assert.equal(r.messagesAdded, 1);
});

test("default bundle is LEAN (rows only) and is far smaller than a full snapshot", async (t) => {
  const root = tempDir(t, "zemory-brain-lean-");
  const dbPath = join(root, "brain.db");
  const keyPath = join(root, "share.key");
  // Enough rows that the derived layers (FTS + indexes) dominate the file.
  const messages = Array.from({ length: 400 }, (_, i) => ({ uuid: `m${i}`, content: `lean payload sample ${i} ` .repeat(20) }));
  seedBrain(dbPath, [{ id: "s1", host: "PC-A", messages }]);
  writeBrainShareKey(keyPath);

  const lean = await exportBrainBundle({ dbPath, outPath: join(root, "lean.enc"), keyFile: keyPath });
  const full = await exportBrainBundle({ dbPath, outPath: join(root, "full.enc"), keyFile: keyPath, payload: "full" });

  assert.equal(lean.payload, "rows", "rows is the default payload");
  assert.equal(full.payload, "full");
  assert.equal(lean.rows.messages, 400);
  assert.equal(lean.rows.sessions, 1);
  assert.ok(lean.bundleBytes < full.bundleBytes, "lean bundle is smaller than the full snapshot");
});

test("delta carries only messages past the watermark, and merges onto the baseline", async (t) => {
  const root = tempDir(t, "zemory-brain-delta-");
  const dbA = join(root, "a.db");
  const dbB = join(root, "b.db");
  const keyPath = join(root, "share.key");
  writeBrainShareKey(keyPath);

  seedBrain(dbA, [{ id: "s1", host: "PC-A", messages: [{ uuid: "m1", content: "first" }, { uuid: "m2", content: "second" }] }]);
  const base = await exportBrainBundle({ dbPath: dbA, outPath: join(root, "base.enc"), keyFile: keyPath });
  assert.equal(base.rows.messages, 2);

  // B starts from the baseline.
  await mergeBrainBundle({ bundlePath: join(root, "base.enc"), dbPath: dbB, keyFile: keyPath });

  // A grows; the delta must carry ONLY the new row.
  seedBrain(dbA, [{ id: "s2", host: "PC-A", messages: [{ uuid: "m3", content: "third" }] }]);
  const delta = await exportBrainBundle({
    dbPath: dbA,
    outPath: join(root, "delta.enc"),
    keyFile: keyPath,
    sinceMessageId: base.rows.maxMessageId,
  });
  assert.equal(delta.rows.messages, 1, "delta holds only the new message");
  assert.equal(delta.rows.sessions, 1, "and only the session that message belongs to");
  // NOTE: no byte-size assertion here — at this scale SQLite's 4K page floor
  // makes a 1-row and a 2-row file the same size. The size win is a property of
  // row COUNT (asserted above); it shows up at real scale, not in a fixture.

  const merged = await mergeBrainBundle({ bundlePath: join(root, "delta.enc"), dbPath: dbB, keyFile: keyPath });
  assert.equal(merged.messagesAdded, 1, "delta grafts onto the baseline");
  const db = openBrain(dbB);
  try {
    assert.equal(db.prepare("SELECT COUNT(*) c FROM messages").get().c, 3, "B now holds every message");
  } finally {
    db.close();
  }
});

test("export watermark persists per bundle name and never travels in a bundle", async (t) => {
  const root = tempDir(t, "zemory-brain-watermark-");
  const dbPath = join(root, "brain.db");
  const dbOther = join(root, "other.db");
  const keyPath = join(root, "share.key");
  writeBrainShareKey(keyPath);
  seedBrain(dbPath, [{ id: "s1", host: "PC-A", messages: [{ uuid: "m1", content: "hi" }] }]);

  assert.equal(readExportWatermark("nope.enc", dbPath), 0, "unknown bundle starts at 0");
  writeExportWatermark("mine.enc", 42, dbPath);
  assert.equal(readExportWatermark("mine.enc", dbPath), 42);
  writeExportWatermark("mine.enc", 99, dbPath);
  assert.equal(readExportWatermark("mine.enc", dbPath), 99, "watermark advances in place");

  // sync_state is machine-local: it must not ride along to another brain.
  await exportBrainBundle({ dbPath, outPath: join(root, "b.enc"), keyFile: keyPath });
  await mergeBrainBundle({ bundlePath: join(root, "b.enc"), dbPath: dbOther, keyFile: keyPath });
  assert.equal(readExportWatermark("mine.enc", dbOther), 0, "receiver keeps its own watermark");
});

test("importing a rows bundle yields a complete, searchable brain", async (t) => {
  const root = tempDir(t, "zemory-brain-rows-import-");
  const dbPath = join(root, "brain.db");
  const restored = join(root, "restored.db");
  const keyPath = join(root, "share.key");
  writeBrainShareKey(keyPath);
  seedBrain(dbPath, [{ id: "s1", host: "PC-A", messages: [{ uuid: "m1", content: "zsentinelrestore token" }] }]);

  await exportBrainBundle({ dbPath, outPath: join(root, "r.enc"), keyFile: keyPath });
  await importBrainBundle({ bundlePath: join(root, "r.enc"), dbPath: restored, keyFile: keyPath, force: true });

  const db = openBrain(restored);
  try {
    assert.equal(db.prepare("SELECT COUNT(*) c FROM messages").get().c, 1);
    // FTS is a DERIVED layer that never ships — it must have been rebuilt on insert.
    const hits = db.prepare("SELECT COUNT(*) c FROM messages_fts WHERE messages_fts MATCH 'zsentinelrestore'").get().c;
    assert.equal(hits, 1, "FTS index was rebuilt locally from the shipped rows");
  } finally {
    db.close();
  }
});
