// Plan 12 buoc 4: messages_fts/_tri switch from STANDALONE fts5 tables (each
// keeping its own verbatim copy of message content, ~246MB measured) to
// EXTERNAL CONTENT tables that read text from `messages` on demand. This
// covers the v11→v12 migration path on a hand-built pre-migration DB, and the
// external-content trigger rewrite (DELETE/UPDATE must pass old content back
// via the special 'delete' command — a standalone-table trigger would not).
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { join } from "node:path";
import test from "node:test";
import { openBrain } from "../../dist/brain/db.js";
import { tempDir } from "./helpers.mjs";

// Minimal v11-shaped DB: sessions/messages + the OLD standalone FTS tables and
// triggers, exactly as db.ts defined them before this migration.
function buildPreV12Db(dbPath) {
  const raw = new Database(dbPath);
  raw.exec(`
    CREATE TABLE schema_version (version INTEGER NOT NULL);
    INSERT INTO schema_version (version) VALUES (11);
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY, source TEXT NOT NULL, project_root TEXT, cwd TEXT, title TEXT,
      host TEXT, origin TEXT NOT NULL DEFAULT 'local', started_at TEXT, ended_at TEXT,
      message_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, uuid TEXT, role TEXT,
      content TEXT, tool_name TEXT, timestamp TEXT, UNIQUE(session_id, uuid)
    );
    CREATE VIRTUAL TABLE messages_fts USING fts5(content);
    CREATE VIRTUAL TABLE messages_fts_tri USING fts5(content, tokenize='trigram');
    CREATE TRIGGER messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content)     VALUES (new.id, COALESCE(new.content, ''));
      INSERT INTO messages_fts_tri(rowid, content) VALUES (new.id, COALESCE(new.content, ''));
    END;
    CREATE TRIGGER messages_ad AFTER DELETE ON messages BEGIN
      DELETE FROM messages_fts     WHERE rowid = old.id;
      DELETE FROM messages_fts_tri WHERE rowid = old.id;
    END;
    CREATE TRIGGER messages_au AFTER UPDATE ON messages BEGIN
      DELETE FROM messages_fts     WHERE rowid = old.id;
      DELETE FROM messages_fts_tri WHERE rowid = old.id;
      INSERT INTO messages_fts(rowid, content)     VALUES (new.id, COALESCE(new.content, ''));
      INSERT INTO messages_fts_tri(rowid, content) VALUES (new.id, COALESCE(new.content, ''));
    END;
    INSERT INTO sessions(id, source, project_root, message_count) VALUES ('s1','claude-code','C:\\demo',3);
  `);
  const ins = raw.prepare("INSERT INTO messages(session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  ins.run("s1", "u1", "user", "reset the postgres database password", "2026-07-01T00:00:00Z");
  ins.run("s1", "u2", "assistant", "the recipe calls for two cups of flour", "2026-07-01T00:01:00Z");
  ins.run("s1", "u3", "user", "a kitten sleeping on the warm windowsill", "2026-07-01T00:02:00Z");
  raw.close();
}

test("v11→v12 migrates messages_fts/_tri to EXTERNAL CONTENT tables, preserving search results", (t) => {
  const dbPath = join(tempDir(t, "zemory-fts-migrate-"), "old.db");
  buildPreV12Db(dbPath);

  const db = openBrain(dbPath);
  const ver = db.prepare("SELECT version FROM schema_version LIMIT 1").get();
  const fresh = openBrain(join(tempDir(t, "zemory-fts-fresh-"), "fresh.db"));
  assert.equal(ver.version, fresh.prepare("SELECT version FROM schema_version LIMIT 1").get().version, "migrates to latest schema version");
  fresh.close();

  // sqlite_master's CREATE VIRTUAL TABLE text proves external-content actually
  // took effect (not just a same-shape recreate).
  const sql = db.prepare("SELECT sql FROM sqlite_master WHERE name='messages_fts'").get().sql;
  assert.match(sql, /content\s*=\s*'messages'/, "messages_fts is now an external-content table");
  const sqlTri = db.prepare("SELECT sql FROM sqlite_master WHERE name='messages_fts_tri'").get().sql;
  assert.match(sqlTri, /content\s*=\s*'messages'/, "messages_fts_tri is now an external-content table");

  // The 'rebuild' repopulated postings from `messages` — old data is still searchable.
  const hit = db.prepare("SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'postgres'").all();
  assert.deepEqual(hit.map((r) => r.rowid), [1], "old row survives the migration, searchable via word FTS");
  const triHit = db.prepare("SELECT rowid FROM messages_fts_tri WHERE messages_fts_tri MATCH 'kitten'").all();
  assert.deepEqual(triHit.map((r) => r.rowid), [3]);

  db.close();
});

test("post-migration triggers keep external-content FTS in sync on insert/update/delete", (t) => {
  const dbPath = join(tempDir(t, "zemory-fts-sync-"), "old.db");
  buildPreV12Db(dbPath);
  const db = openBrain(dbPath); // migrates to v12 on open

  // INSERT
  db.prepare("INSERT INTO messages(session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run(
    "s1", "u4", "user", "rotate the aws access key immediately", "2026-07-02T00:00:00Z",
  );
  let hit = db.prepare("SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'aws'").all();
  assert.equal(hit.length, 1, "new message indexed by the external-content insert trigger");
  const newId = hit[0].rowid;

  // UPDATE — old term must disappear, new term must appear (proves the
  // external-content 'delete' command correctly received the OLD content).
  db.prepare("UPDATE messages SET content = ? WHERE id = ?").run("completely different wording about llamas", newId);
  hit = db.prepare("SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'aws'").all();
  assert.equal(hit.length, 0, "stale term removed after update");
  hit = db.prepare("SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'llamas'").all();
  assert.deepEqual(hit.map((r) => r.rowid), [newId], "new term indexed after update");

  // DELETE
  db.prepare("DELETE FROM messages WHERE id = ?").run(newId);
  hit = db.prepare("SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'llamas'").all();
  assert.equal(hit.length, 0, "removed from the index after delete");

  db.close();
});
