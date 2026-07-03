import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import Database from "better-sqlite3";
import { openBrain } from "../dist/brain/db.js";
import { buildDigest, digestBackfill, getDigest, searchDigests } from "../dist/brain/digest.js";
import { tempDir } from "./helpers.mjs";

function seedSession(db, id, opts, msgs) {
  db.prepare(
    "INSERT INTO sessions (id, source, project_root, cwd, title, host, message_count) VALUES (?,?,?,?,?,?,0)",
  ).run(id, opts.source ?? "claude-code", opts.project ?? null, opts.cwd ?? opts.project ?? null, opts.title ?? null, opts.host ?? "TESTPC");
  const ins = db.prepare(
    "INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp) VALUES (?,?,?,?,?,?)",
  );
  msgs.forEach((m, i) => ins.run(id, `${id}-u${i}`, m.role, m.content, m.tool ?? null, m.ts));
  db.prepare(
    `UPDATE sessions SET
       message_count=(SELECT COUNT(*) FROM messages WHERE session_id=@id),
       started_at=(SELECT MIN(timestamp) FROM messages WHERE session_id=@id),
       ended_at=(SELECT MAX(timestamp) FROM messages WHERE session_id=@id)
     WHERE id=@id`,
  ).run({ id });
}

test("digest: build extracts tasks/decisions/errors with anchors, scoped meta; idempotent + change-detect", (t) => {
  const root = tempDir(t, "zemory-digest-");
  const dbPath = join(root, "brain.db");
  const db = openBrain(dbPath);
  seedSession(db, "s1", { project: "C:\\proj", host: "PC1", title: "làm robot" }, [
    { role: "user", content: "làm điều khiển robot giúp tôi", ts: "2026-01-01T00:00:00Z" },
    { role: "assistant", content: "CHỐT: dùng Python để điều khiển", ts: "2026-01-01T00:00:01Z" },
    { role: "user", content: "[tool_result] some tool output blob", ts: "2026-01-01T00:00:02Z" },
    { role: "user", content: "[tool_result] Traceback: SyntaxError near line 3", tool: "Bash", ts: "2026-01-01T00:00:03Z" },
    { role: "assistant", content: "đã sửa xong, chạy ổn", ts: "2026-01-01T00:00:04Z" },
  ]);
  assert.equal(buildDigest(db, "s1").built, true);
  db.close();

  const d = getDigest(dbPath, "s1");
  assert.ok(d, "digest exists");
  assert.equal(d.tasks.length, 1, "only the real user turn is a task (tool_result excluded)");
  assert.match(d.tasks[0].text, /điều khiển robot/);
  assert.ok(d.tasks[0].id > 0, "task carries an anchor message id");
  assert.ok(d.decisions.some((x) => /CH[OỐ]T|Python/.test(x.text)), "decision captured");
  assert.ok(d.errors.some((x) => /Traceback|SyntaxError/.test(x.text)), "error captured");
  assert.equal(d.meta.host, "PC1");
  assert.equal(d.meta.project_root, "C:\\proj");
  assert.equal(d.meta.messages, 5);

  // anchor resolves to the real message
  const chk = openBrain(dbPath);
  const anchored = chk.prepare("SELECT content FROM messages WHERE id=?").get(d.tasks[0].id);
  assert.match(anchored.content, /điều khiển robot/, "anchor points to the true source message");

  // idempotent: unchanged → no rebuild
  assert.equal(buildDigest(chk, "s1").built, false, "unchanged session is a no-op");
  // add a message → signature changes → rebuild
  chk.prepare(
    "INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES ('s1','s1-new','user','thêm việc mới: deploy','2026-01-01T00:01:00Z')",
  ).run();
  chk.prepare("UPDATE sessions SET message_count=6, ended_at='2026-01-01T00:01:00Z' WHERE id='s1'").run();
  assert.equal(buildDigest(chk, "s1").built, true, "changed session rebuilds");
  chk.close();
  assert.equal(getDigest(dbPath, "s1").tasks.length, 2, "new user turn added as a task");
});

test("digest: sessions never mix — each digest is scoped to its own session_id", (t) => {
  const root = tempDir(t, "zemory-digest2-");
  const dbPath = join(root, "brain.db");
  const db = openBrain(dbPath);
  seedSession(db, "A", { host: "PC1" }, [{ role: "user", content: "việc phiên A: alpha alpha", ts: "2026-02-01T00:00:00Z" }]);
  seedSession(db, "B", { host: "PC2" }, [{ role: "user", content: "việc phiên B: bravo bravo", ts: "2026-02-02T00:00:00Z" }]);
  buildDigest(db, "A");
  buildDigest(db, "B");
  db.close();

  const dA = getDigest(dbPath, "A");
  const dB = getDigest(dbPath, "B");
  assert.match(dA.tasks[0].text, /alpha/);
  assert.ok(!/bravo/.test(JSON.stringify(dA)), "A digest contains no B content");
  assert.match(dB.tasks[0].text, /bravo/);
  assert.ok(!/alpha/.test(JSON.stringify(dB)), "B digest contains no A content");
  assert.equal(dA.meta.host, "PC1");
  assert.equal(dB.meta.host, "PC2");
});

test("digest: backfill builds all + searchDigests finds by content", (t) => {
  const root = tempDir(t, "zemory-digest3-");
  const dbPath = join(root, "brain.db");
  const db = openBrain(dbPath);
  seedSession(db, "X", { host: "PC1", project: "C:\\zephyr" }, [
    { role: "user", content: "cấu hình pipeline crypto binance", ts: "2026-03-01T00:00:00Z" },
  ]);
  db.close();
  const r = digestBackfill(dbPath);
  assert.equal(r.built, 1);
  const hits = searchDigests("binance", { dbPath });
  assert.ok(hits.length >= 1, "digest lane finds the session by content");
  assert.equal(hits[0].session_id, "X");
});

test("digest: empty session is a safe no-op (fail-open)", (t) => {
  const root = tempDir(t, "zemory-digest0-");
  const dbPath = join(root, "brain.db");
  const db = openBrain(dbPath);
  db.prepare("INSERT INTO sessions (id, source, message_count) VALUES ('empty','x',0)").run();
  const r = buildDigest(db, "empty");
  db.close();
  assert.equal(r.built, false);
});

test("opening a pre-v5 DB migrates: adds session_digest table and sets version 5", (t) => {
  const root = tempDir(t, "zemory-digmig-");
  const dbPath = join(root, "old.db");
  const raw = new Database(dbPath);
  raw.exec(`
    CREATE TABLE schema_version (version INTEGER NOT NULL);
    INSERT INTO schema_version (version) VALUES (4);
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY, source TEXT NOT NULL, project_root TEXT, cwd TEXT,
      title TEXT, host TEXT, started_at TEXT, ended_at TEXT, message_count INTEGER NOT NULL DEFAULT 0
    );
  `);
  raw.close();

  const db = openBrain(dbPath);
  const tbl = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_digest'").all();
  const ver = db.prepare("SELECT version FROM schema_version LIMIT 1").get();
  db.close();
  assert.equal(tbl.length, 1, "session_digest table created by migration");
  assert.equal(ver.version, 6); // migrates through to the latest schema version
});
