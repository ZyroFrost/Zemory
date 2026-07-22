import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { openMemory } from "../../dist/memory/db.js";
import {
  exportMemoryBundle,
  importMemoryBundle,
  mergeMemoryBundle,
  readExportWatermark,
  writeMemoryShareKey,
  writeExportWatermark,
} from "../../dist/memory/share.js";
import { tempDir } from "./helpers.mjs";

// Seed a memory with sessions/messages; each session carries an explicit host.
function seedMemory(dbPath, sessions) {
  const db = openMemory(dbPath);
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

test("encrypted memory bundles round-trip without plaintext leakage", async (t) => {
  const root = tempDir(t, "zemory-memory-share-");
  const dbPath = join(root, "memory.db");
  const keyPath = join(root, "share.key");
  const bundlePath = join(root, "memory.zemory.enc");
  const restoredPath = join(root, "restored.db");
  const secretText = "secret brass compass memory";

  const db = openMemory(dbPath);
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

  writeMemoryShareKey(keyPath);
  const exported = await exportMemoryBundle({ dbPath, outPath: bundlePath, keyFile: keyPath });
  assert.ok(exported.bundleBytes > exported.sourceBytes);
  assert.equal(readFileSync(bundlePath).includes(Buffer.from(secretText)), false);

  const imported = await importMemoryBundle({ bundlePath, dbPath: restoredPath, keyFile: keyPath });
  assert.equal(imported.backupPath, null);
  assert.equal(existsSync(restoredPath), true);

  const restored = openMemory(restoredPath);
  try {
    const row = restored.prepare("SELECT content FROM messages WHERE uuid='m1'").get();
    assert.deepEqual(row, { content: secretText });
  } finally {
    restored.close();
  }
});

test("encrypted memory import refuses overwrite without --force", async (t) => {
  const root = tempDir(t, "zemory-memory-share-force-");
  const dbPath = join(root, "memory.db");
  const keyPath = join(root, "share.key");
  const bundlePath = join(root, "memory.zemory.enc");
  const targetPath = join(root, "target.db");

  openMemory(dbPath).close();
  openMemory(targetPath).close();
  writeMemoryShareKey(keyPath);
  await exportMemoryBundle({ dbPath, outPath: bundlePath, keyFile: keyPath });

  await assert.rejects(
    () => importMemoryBundle({ bundlePath, dbPath: targetPath, keyFile: keyPath }),
    /Refusing to overwrite/,
  );
});

test("merge import is additive: keeps local data, adds new sessions/messages, preserves host", async (t) => {
  const root = tempDir(t, "zemory-memory-merge-");
  const dbA = join(root, "a.db"); // this machine
  const dbB = join(root, "b.db"); // other machine
  const keyPath = join(root, "share.key");
  const bundle = join(root, "b.zemory.enc");

  // A: shared session (one uuid'd + one NULL-uuid msg) + one only-on-A session.
  seedMemory(dbA, [
    { id: "shared", host: "PC-A", messages: [{ uuid: "uA1", content: "alpha original" }, { uuid: null, content: "tool log X" }] },
    { id: "onlyA", host: "PC-A", messages: [{ uuid: "ua", content: "only on A" }] },
  ]);
  // B: same shared session continued (dup uA1, new uB2, dup NULL "tool log X",
  // new NULL "tool log Y") + one only-on-B session.
  seedMemory(dbB, [
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

  writeMemoryShareKey(keyPath);
  await exportMemoryBundle({ dbPath: dbB, outPath: bundle, keyFile: keyPath });

  const r = await mergeMemoryBundle({ bundlePath: bundle, dbPath: dbA, keyFile: keyPath });
  assert.equal(r.sessionsAdded, 1, "only onlyB is new");
  // New = uB2 (uuid) + "tool log Y" (null) + ub (onlyB). uA1 + "tool log X" deduped.
  assert.equal(r.messagesAdded, 3, "uB2 + tool-log-Y + ub are new; uA1 and tool-log-X deduped");

  const db = openMemory(dbA);
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
  const again = await mergeMemoryBundle({ bundlePath: bundle, dbPath: dbA, keyFile: keyPath });
  assert.equal(again.sessionsAdded, 0, "re-merge adds no sessions");
  assert.equal(again.messagesAdded, 0, "re-merge adds no messages (NULL-uuid dedup holds)");
});

test("merge into a fresh machine (no local DB yet) imports everything", async (t) => {
  const root = tempDir(t, "zemory-memory-merge-fresh-");
  const dbB = join(root, "b.db");
  const dbNew = join(root, "new.db");
  const keyPath = join(root, "share.key");
  const bundle = join(root, "b.zemory.enc");

  seedMemory(dbB, [{ id: "s1", host: "PC-B", messages: [{ uuid: "m1", content: "hello" }] }]);
  writeMemoryShareKey(keyPath);
  await exportMemoryBundle({ dbPath: dbB, outPath: bundle, keyFile: keyPath });

  const r = await mergeMemoryBundle({ bundlePath: bundle, dbPath: dbNew, keyFile: keyPath });
  assert.equal(r.sessionsAdded, 1);
  assert.equal(r.messagesAdded, 1);
});

test("default bundle is LEAN (rows only) and is far smaller than a full snapshot", async (t) => {
  const root = tempDir(t, "zemory-memory-lean-");
  const dbPath = join(root, "memory.db");
  const keyPath = join(root, "share.key");
  // Enough rows that the derived layers (FTS + indexes) dominate the file.
  const messages = Array.from({ length: 400 }, (_, i) => ({ uuid: `m${i}`, content: `lean payload sample ${i} ` .repeat(20) }));
  seedMemory(dbPath, [{ id: "s1", host: "PC-A", messages }]);
  writeMemoryShareKey(keyPath);

  const lean = await exportMemoryBundle({ dbPath, outPath: join(root, "lean.enc"), keyFile: keyPath });
  const full = await exportMemoryBundle({ dbPath, outPath: join(root, "full.enc"), keyFile: keyPath, payload: "full" });

  assert.equal(lean.payload, "rows", "rows is the default payload");
  assert.equal(full.payload, "full");
  assert.equal(lean.rows.messages, 400);
  assert.equal(lean.rows.sessions, 1);
  assert.ok(lean.bundleBytes < full.bundleBytes, "lean bundle is smaller than the full snapshot");
});

test("delta carries only messages past the watermark, and merges onto the baseline", async (t) => {
  const root = tempDir(t, "zemory-memory-delta-");
  const dbA = join(root, "a.db");
  const dbB = join(root, "b.db");
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);

  seedMemory(dbA, [{ id: "s1", host: "PC-A", messages: [{ uuid: "m1", content: "first" }, { uuid: "m2", content: "second" }] }]);
  const base = await exportMemoryBundle({ dbPath: dbA, outPath: join(root, "base.enc"), keyFile: keyPath });
  assert.equal(base.rows.messages, 2);

  // B starts from the baseline.
  await mergeMemoryBundle({ bundlePath: join(root, "base.enc"), dbPath: dbB, keyFile: keyPath });

  // A grows; the delta must carry ONLY the new row.
  seedMemory(dbA, [{ id: "s2", host: "PC-A", messages: [{ uuid: "m3", content: "third" }] }]);
  const delta = await exportMemoryBundle({
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

  const merged = await mergeMemoryBundle({ bundlePath: join(root, "delta.enc"), dbPath: dbB, keyFile: keyPath });
  assert.equal(merged.messagesAdded, 1, "delta grafts onto the baseline");
  const db = openMemory(dbB);
  try {
    assert.equal(db.prepare("SELECT COUNT(*) c FROM messages").get().c, 3, "B now holds every message");
  } finally {
    db.close();
  }
});

test("export watermark persists per bundle name and never travels in a bundle", async (t) => {
  const root = tempDir(t, "zemory-memory-watermark-");
  const dbPath = join(root, "memory.db");
  const dbOther = join(root, "other.db");
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);
  seedMemory(dbPath, [{ id: "s1", host: "PC-A", messages: [{ uuid: "m1", content: "hi" }] }]);

  assert.equal(readExportWatermark("nope.enc", dbPath), 0, "unknown bundle starts at 0");
  writeExportWatermark("mine.enc", 42, dbPath);
  assert.equal(readExportWatermark("mine.enc", dbPath), 42);
  writeExportWatermark("mine.enc", 99, dbPath);
  assert.equal(readExportWatermark("mine.enc", dbPath), 99, "watermark advances in place");

  // sync_state is machine-local: it must not ride along to another memory.
  await exportMemoryBundle({ dbPath, outPath: join(root, "b.enc"), keyFile: keyPath });
  await mergeMemoryBundle({ bundlePath: join(root, "b.enc"), dbPath: dbOther, keyFile: keyPath });
  assert.equal(readExportWatermark("mine.enc", dbOther), 0, "receiver keeps its own watermark");
});

// Point ~/.zemory (where config.json lives) at a temp dir so the sync-level
// setting round-trips without touching the real machine config.
function sandboxHome(t) {
  const home = tempDir(t, "zemory-synclevel-home-");
  const save = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME, GLOBAL_MEMORY_DB: process.env.GLOBAL_MEMORY_DB };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.APPDATA = home;
  process.env.XDG_CONFIG_HOME = home;
  delete process.env.GLOBAL_MEMORY_DB; // let the memory dir follow the sandboxed HOME
  t.after(() => {
    for (const k of Object.keys(save)) {
      if (save[k] === undefined) delete process.env[k];
      else process.env[k] = save[k];
    }
  });
  return home;
}

test("sync level (plan 08 §7) defaults to lean and round-trips", async (t) => {
  sandboxHome(t);
  const { getSyncLevel, setSyncLevel } = await import("../../dist/settings.js");
  assert.equal(getSyncLevel(), "lean", "default depth is the lean rows bundle");
  setSyncLevel("full");
  assert.equal(getSyncLevel(), "full", "persisted to full");
  setSyncLevel("lean");
  assert.equal(getSyncLevel(), "lean", "back to lean");
  setSyncLevel("bogus"); // anything but "full" normalizes to lean
  assert.equal(getSyncLevel(), "lean", "unknown value falls back to lean");
});

test("syncDrive uses the persisted sync level, and an explicit level overrides it", async (t) => {
  sandboxHome(t);
  const { setSyncLevel } = await import("../../dist/settings.js");
  const { syncDrive } = await import("../../dist/memory/share.js");
  const root = tempDir(t, "zemory-synclevel-drive-");
  const dbPath = join(root, "memory.db");
  const driveDir = join(root, "drive");
  const keyPath = join(root, "share.key");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(driveDir, { recursive: true });
  openMemory(dbPath).close(); // empty memory → scan is a no-op, embed has nothing to do
  writeMemoryShareKey(keyPath);
  process.env.ZEMORY_SHARE_KEY = readFileSync(keyPath, "utf8").trim();
  t.after(() => delete process.env.ZEMORY_SHARE_KEY);

  setSyncLevel("full");
  const full = await syncDrive({ driveDir, keyFile: keyPath, dbPath });
  assert.equal(full.level, "full", "honors the persisted 'full' setting");

  setSyncLevel("lean");
  const lean = await syncDrive({ driveDir, keyFile: keyPath, dbPath });
  assert.equal(lean.level, "lean", "honors the persisted 'lean' setting");

  const forced = await syncDrive({ driveDir, keyFile: keyPath, dbPath, level: "full" });
  assert.equal(forced.level, "full", "explicit level param overrides the setting");
});

test("importing a rows bundle yields a complete, searchable memory", async (t) => {
  const root = tempDir(t, "zemory-memory-rows-import-");
  const dbPath = join(root, "memory.db");
  const restored = join(root, "restored.db");
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);
  seedMemory(dbPath, [{ id: "s1", host: "PC-A", messages: [{ uuid: "m1", content: "zsentinelrestore token" }] }]);

  await exportMemoryBundle({ dbPath, outPath: join(root, "r.enc"), keyFile: keyPath });
  await importMemoryBundle({ bundlePath: join(root, "r.enc"), dbPath: restored, keyFile: keyPath, force: true });

  const db = openMemory(restored);
  try {
    assert.equal(db.prepare("SELECT COUNT(*) c FROM messages").get().c, 1);
    // FTS is a DERIVED layer that never ships — it must have been rebuilt on insert.
    const hits = db.prepare("SELECT COUNT(*) c FROM messages_fts WHERE messages_fts MATCH 'zsentinelrestore'").get().c;
    assert.equal(hits, 1, "FTS index was rebuilt locally from the shipped rows");
  } finally {
    db.close();
  }
});
