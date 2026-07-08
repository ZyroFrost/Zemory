import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { openBrain } from "../../dist/brain/db.js";
import { backupBrain, forgetBrain, reRedactBrain, restoreBrainBackup } from "../../dist/brain/privacy.js";
import { search } from "../../dist/brain/search.js";
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
