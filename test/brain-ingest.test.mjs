import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import test from "node:test";
import { join } from "node:path";
import Database from "better-sqlite3";
import { claudeAdapter } from "../dist/brain/adapters/claude.js";
import { brainHostTree, brainSummary, scan } from "../dist/brain/ingest.js";
import { openBrain } from "../dist/brain/db.js";
import { tempDir } from "./helpers.mjs";

test("append scans ingest the first line written after a trailing newline", (t) => {
  const root = tempDir(t, "zemory-ingest-");
  const store = join(root, ".claude", "projects", "demo");
  const transcript = join(store, "session.jsonl");
  const dbPath = join(root, "brain.db");
  mkdirSync(store, { recursive: true });

  writeFileSync(
    transcript,
    `${JSON.stringify({ type: "meta", cwd: "C:\\demo" })}\n${JSON.stringify({
      type: "user",
      uuid: "u1",
      timestamp: "2026-01-01T00:00:00Z",
      message: { role: "user", content: "first" },
    })}\n`,
  );
  const first = scan({ dbPath, home: root, adapters: [claudeAdapter] });

  appendFileSync(
    transcript,
    `${JSON.stringify({
      type: "assistant",
      uuid: "a1",
      timestamp: "2026-01-01T00:00:01Z",
      message: { role: "assistant", content: "second" },
    })}\n`,
  );
  const second = scan({ dbPath, home: root, adapters: [claudeAdapter] });

  assert.equal(first.totals.messages, 1);
  assert.equal(second.totals.messages, 2);
  assert.equal(second.totals.newMessages, 1);
  const unchanged = scan({ dbPath, home: root, adapters: [claudeAdapter] });
  assert.equal(unchanged.sessions.length, 0);
});

test("ingest stamps the ingesting machine onto each session (host provenance)", (t) => {
  const root = tempDir(t, "zemory-host-");
  const store = join(root, ".claude", "projects", "demo");
  const transcript = join(store, "session.jsonl");
  const dbPath = join(root, "brain.db");
  mkdirSync(store, { recursive: true });

  writeFileSync(
    transcript,
    `${JSON.stringify({ type: "meta", cwd: "C:\\demo" })}\n${JSON.stringify({
      type: "user",
      uuid: "u1",
      timestamp: "2026-01-01T00:00:00Z",
      message: { role: "user", content: "hello host" },
    })}\n`,
  );
  scan({ dbPath, home: root, adapters: [claudeAdapter] });

  const here = hostname() || "unknown";
  const db = openBrain(dbPath);
  const row = db.prepare("SELECT host FROM sessions LIMIT 1").get();
  db.close();
  assert.equal(row.host, here);

  // brainSummary rolls sessions up per host…
  const summary = brainSummary(dbPath);
  assert.equal(summary.totals.hosts, 1);
  const h = summary.hosts.find((x) => x.host === here);
  assert.ok(h, "host present in summary");
  assert.equal(h.sessions, 1);
  assert.equal(h.messages, 1);

  // …and brainHostTree nests PC → source → project.
  const tree = brainHostTree(dbPath);
  const node = tree.find((x) => x.host === here);
  assert.ok(node, "host present in tree");
  assert.equal(node.sources[0].source, "claude-code");
  assert.equal(node.sources[0].projects[0].project, "C:\\demo");
});

test("opening a pre-v4 DB migrates: adds host column and backfills 'unknown'", (t) => {
  const root = tempDir(t, "zemory-migrate-");
  const dbPath = join(root, "old.db");

  // Hand-build a v3-shaped DB (sessions WITHOUT a host column).
  const raw = new Database(dbPath);
  raw.exec(`
    CREATE TABLE schema_version (version INTEGER NOT NULL);
    INSERT INTO schema_version (version) VALUES (3);
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY, source TEXT NOT NULL, project_root TEXT, cwd TEXT,
      title TEXT, started_at TEXT, ended_at TEXT, message_count INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO sessions (id, source, message_count) VALUES ('legacy', 'claude-code', 5);
  `);
  raw.close();

  const db = openBrain(dbPath);
  const cols = db.prepare("PRAGMA table_info(sessions)").all().map((c) => c.name);
  const row = db.prepare("SELECT host FROM sessions WHERE id='legacy'").get();
  const ver = db.prepare("SELECT version FROM schema_version LIMIT 1").get();
  db.close();

  assert.ok(cols.includes("host"), "host column added by migration");
  assert.equal(row.host, "unknown", "legacy rows backfilled to 'unknown'");
  assert.equal(ver.version, 5); // migrates through the latest schema version
});
