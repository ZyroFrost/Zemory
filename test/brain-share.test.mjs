import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { openBrain } from "../dist/brain/db.js";
import { exportBrainBundle, importBrainBundle, mergeBrainBundle, writeBrainShareKey } from "../dist/brain/share.js";
import { tempDir } from "./helpers.mjs";

// Seed a brain with sessions/messages; each session carries an explicit host.
function seedBrain(dbPath, sessions) {
  const db = openBrain(dbPath);
  try {
    const insS = db.prepare(
      `INSERT INTO sessions (id, source, project_root, host, message_count) VALUES (?, ?, ?, ?, 0)`,
    );
    const insM = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?, ?, ?, ?, ?)");
    for (const s of sessions) {
      insS.run(s.id, s.source ?? "claude-code", s.project ?? "C:\\p", s.host);
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
    { id: "onlyB", host: "PC-B", messages: [{ uuid: "ub", content: "only on B" }] },
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
      db.prepare("SELECT id, host, message_count FROM sessions").all().map((s) => [s.id, s]),
    );
    assert.ok(sessions.onlyA, "onlyA preserved (nothing lost)");
    assert.equal(sessions.onlyA.host, "PC-A");
    assert.ok(sessions.onlyB, "onlyB merged in");
    assert.equal(sessions.onlyB.host, "PC-B", "onlyB keeps producing-machine host");
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
