// Global brain store — one SQLite DB at ~/.zemory/global_memory.db holding session
// transcripts from every agent across every project. The DB is a DERIVED lens:
// it is rebuilt from the agents' own transcript files and is safe to delete.
//
// Storage tiers (see docs/plan): canonical docs stay as per-project markdown;
// THIS store holds the episodic/session tier, machine-wide. Nothing here is
// transmitted anywhere — local-only by construction.

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// Brain DB location. GLOBAL_MEMORY_DB supports an explicitly shared A.I Center
// location; otherwise zemory owns ~/.zemory/global_memory.db.
const ENV_DB = process.env.GLOBAL_MEMORY_DB?.trim();
export const BRAIN_DIR = ENV_DB ? dirname(ENV_DB) : join(homedir(), ".zemory");
export const BRAIN_DB = ENV_DB || join(BRAIN_DIR, "global_memory.db");

const SCHEMA_VERSION = 4;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);

-- One row per agent session (a single conversation/transcript file).
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,   -- session id (transcript file stem)
  source        TEXT NOT NULL,      -- agent name, e.g. 'claude-code'
  project_root  TEXT,               -- normalized cwd the session ran in
  cwd           TEXT,
  title         TEXT,
  host          TEXT,               -- machine that ingested it (os.hostname()); null/'unknown' = pre-v4
  started_at    TEXT,               -- ISO timestamp of first message
  ended_at      TEXT,               -- ISO timestamp of last message
  message_count INTEGER NOT NULL DEFAULT 0
);

-- One row per stored message. uuid is the agent's own message id, used to
-- dedupe so re-scanning never double-inserts (UNIQUE + INSERT OR IGNORE).
CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL,
  uuid        TEXT,
  role        TEXT,
  content     TEXT,
  tool_name   TEXT,
  timestamp   TEXT,
  UNIQUE(session_id, uuid)
);

CREATE INDEX IF NOT EXISTS idx_sessions_source  ON sessions(source);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_root);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, timestamp);

-- DOC / PLAN (DB is the SOURCE for plan; .md is a derived render). A doc is a
-- markdown file split at heading boundaries into sections. body is stored
-- VERBATIM (raw markdown) so render(db) reproduces the file faithfully.
CREATE TABLE IF NOT EXISTS doc (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  project_root  TEXT,
  path          TEXT NOT NULL,        -- e.g. "docs/plan/00_build_plan.md"
  kind          TEXT NOT NULL DEFAULT 'plan',
  rendered_at   TEXT,
  UNIQUE(project_root, path)
);

CREATE TABLE IF NOT EXISTS section (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id     INTEGER NOT NULL,
  ordinal    INTEGER NOT NULL,        -- order within doc (0 = preamble)
  level      INTEGER NOT NULL,        -- heading depth; 0 = preamble (no heading)
  parent_id  INTEGER,                 -- nearest ancestor section (TOC tree)
  heading    TEXT,                    -- trimmed heading text (null for preamble)
  anchor     TEXT,
  body        TEXT                    -- VERBATIM markdown between this heading and next
);
CREATE INDEX IF NOT EXISTS idx_section_doc ON section(doc_id, ordinal);

-- CHANGELOG (DB is the source; .md is a render). Each row = one dated entry.
-- supersedes_id links an entry that reverses an older decision (🔄). archived
-- flags old entries kept out of the rendered active changelog (archive = query,
-- not file-cutting) — full history stays queryable.
CREATE TABLE IF NOT EXISTS changelog (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  project_root  TEXT,
  date          TEXT,
  title         TEXT,
  body          TEXT,
  supersedes_id INTEGER,
  archived      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_changelog_proj ON changelog(project_root, date DESC);

-- Token-savings ledger: one row per saving event, two comparable figures —
-- baseline_tokens (what it WOULD cost without zemory) vs actual_tokens (what it
-- cost with zemory). saved = baseline - actual. Honest benchmark.
CREATE TABLE IF NOT EXISTS ledger (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ts              TEXT,
  kind            TEXT,            -- 'compress' | 'recall'
  project_root    TEXT,
  baseline_tokens INTEGER,         -- cost WITHOUT zemory (raw / full unit)
  actual_tokens   INTEGER,         -- cost WITH zemory (compressed / snippet)
  detail          TEXT
);
CREATE INDEX IF NOT EXISTS idx_ledger_ts ON ledger(ts DESC);

-- Store locations a deep scan has discovered (agent transcript dirs found
-- ANYWHERE on the machine). A normal scan re-enumerates these directly so it
-- never has to walk the whole disk again.
CREATE TABLE IF NOT EXISTS known_stores (
  store_root TEXT PRIMARY KEY,
  source     TEXT NOT NULL,
  found_at   TEXT
);

-- Incremental scan bookkeeping: how far we have already ingested each file.
CREATE TABLE IF NOT EXISTS ingest_state (
  file_path   TEXT PRIMARY KEY,
  source      TEXT,
  session_id  TEXT,
  size        INTEGER,    -- file size at last ingest (shrink => re-ingest)
  mtime_ms    INTEGER,    -- file mtime at last ingest
  last_line   INTEGER,    -- number of lines already processed (append offset)
  updated_at  TEXT,
  parser_version INTEGER NOT NULL DEFAULT 2
);

-- ARTIFACT STORE (phase B). Raw tool output is kept as a content-addressed file
-- on disk (named by sha256, restricted perms); THIS table is metadata only — no
-- raw bytes in SQLite. artifact_index is a REDACTED per-line index for search so
-- a search hit never leaks a secret. compression_event is the per-decision audit.
CREATE TABLE IF NOT EXISTS artifact (
  id               TEXT PRIMARY KEY,        -- handle, e.g. 'zmo_...'
  sha256           TEXT NOT NULL,           -- content hash of raw output
  project_root     TEXT,
  session_id       TEXT,
  source           TEXT,
  tool_name        TEXT,
  command_redacted TEXT,
  exit_code        INTEGER,
  media_type       TEXT,
  raw_bytes        INTEGER NOT NULL DEFAULT 0,
  admitted_bytes   INTEGER NOT NULL DEFAULT 0,
  storage_path     TEXT,                    -- null = no-store (metadata only)
  retention_class  TEXT NOT NULL DEFAULT 'default',
  has_secret       INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT,
  accessed_at      TEXT,                    -- bumped on show/search (LRU)
  expires_at       TEXT                     -- null = never (pinned)
);
CREATE INDEX IF NOT EXISTS idx_artifact_sha  ON artifact(sha256);
CREATE INDEX IF NOT EXISTS idx_artifact_exp  ON artifact(expires_at);
CREATE INDEX IF NOT EXISTS idx_artifact_proj ON artifact(project_root, created_at DESC);

CREATE TABLE IF NOT EXISTS artifact_index (
  artifact_id   TEXT NOT NULL,
  ordinal       INTEGER NOT NULL,           -- 1-based line number
  text_redacted TEXT
);
CREATE INDEX IF NOT EXISTS idx_artifact_index ON artifact_index(artifact_id, ordinal);

CREATE TABLE IF NOT EXISTS compression_event (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  artifact_id             TEXT,
  engine                  TEXT,
  handler                 TEXT,
  policy                  TEXT,
  before_chars            INTEGER,
  after_chars             INTEGER,
  before_lines            INTEGER,
  after_lines             INTEGER,
  estimated_tokens_before INTEGER,
  estimated_tokens_after  INTEGER,
  passthrough_reason      TEXT,
  recovery_count          INTEGER NOT NULL DEFAULT 0,
  created_at              TEXT
);
CREATE INDEX IF NOT EXISTS idx_compression_event_art ON compression_event(artifact_id);
`;

// FTS5 indexes are a derived view over messages.content. The default
// (unicode61) table powers word search; the trigram table powers substring /
// CJK / Vietnamese-with-diacritics matching. Triggers keep both in sync.
const FTS = `
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content);
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts_tri USING fts5(content, tokenize='trigram');

CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content)     VALUES (new.id, COALESCE(new.content, ''));
  INSERT INTO messages_fts_tri(rowid, content) VALUES (new.id, COALESCE(new.content, ''));
END;
CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
  DELETE FROM messages_fts     WHERE rowid = old.id;
  DELETE FROM messages_fts_tri WHERE rowid = old.id;
END;
CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
  DELETE FROM messages_fts     WHERE rowid = old.id;
  DELETE FROM messages_fts_tri WHERE rowid = old.id;
  INSERT INTO messages_fts(rowid, content)     VALUES (new.id, COALESCE(new.content, ''));
  INSERT INTO messages_fts_tri(rowid, content) VALUES (new.id, COALESCE(new.content, ''));
END;

-- Section FTS: heading + body, two tokenizers (word + trigram for Vietnamese).
-- bm25 can weight heading above body at query time.
CREATE VIRTUAL TABLE IF NOT EXISTS section_fts     USING fts5(heading, body);
CREATE VIRTUAL TABLE IF NOT EXISTS section_fts_tri USING fts5(heading, body, tokenize='trigram');

CREATE TRIGGER IF NOT EXISTS section_ai AFTER INSERT ON section BEGIN
  INSERT INTO section_fts(rowid, heading, body)     VALUES (new.id, COALESCE(new.heading,''), COALESCE(new.body,''));
  INSERT INTO section_fts_tri(rowid, heading, body) VALUES (new.id, COALESCE(new.heading,''), COALESCE(new.body,''));
END;
CREATE TRIGGER IF NOT EXISTS section_ad AFTER DELETE ON section BEGIN
  DELETE FROM section_fts     WHERE rowid = old.id;
  DELETE FROM section_fts_tri WHERE rowid = old.id;
END;
CREATE TRIGGER IF NOT EXISTS section_au AFTER UPDATE ON section BEGIN
  DELETE FROM section_fts     WHERE rowid = old.id;
  DELETE FROM section_fts_tri WHERE rowid = old.id;
  INSERT INTO section_fts(rowid, heading, body)     VALUES (new.id, COALESCE(new.heading,''), COALESCE(new.body,''));
  INSERT INTO section_fts_tri(rowid, heading, body) VALUES (new.id, COALESCE(new.heading,''), COALESCE(new.body,''));
END;

CREATE VIRTUAL TABLE IF NOT EXISTS changelog_fts USING fts5(title, body);
CREATE TRIGGER IF NOT EXISTS changelog_ai AFTER INSERT ON changelog BEGIN
  INSERT INTO changelog_fts(rowid, title, body) VALUES (new.id, COALESCE(new.title,''), COALESCE(new.body,''));
END;
CREATE TRIGGER IF NOT EXISTS changelog_ad AFTER DELETE ON changelog BEGIN
  DELETE FROM changelog_fts WHERE rowid = old.id;
END;
CREATE TRIGGER IF NOT EXISTS changelog_au AFTER UPDATE ON changelog BEGIN
  DELETE FROM changelog_fts WHERE rowid = old.id;
  INSERT INTO changelog_fts(rowid, title, body) VALUES (new.id, COALESCE(new.title,''), COALESCE(new.body,''));
END;
`;

export type BrainDB = Database.Database;

function hasColumn(db: BrainDB, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

function migrate(db: BrainDB, fromVersion: number): void {
  let version = fromVersion;
  if (version < 2) {
    if (!hasColumn(db, "ingest_state", "parser_version")) {
      // Version 1 counted the trailing empty JSONL segment as a consumed line.
      // Mark old rows for one full, self-healing re-ingest under parser v2.
      db.exec("ALTER TABLE ingest_state ADD COLUMN parser_version INTEGER NOT NULL DEFAULT 1");
    }
    version = 2;
  }
  if (version < 3) {
    // v3 adds the artifact store tables. They are created by the SCHEMA exec
    // above (CREATE TABLE IF NOT EXISTS), so there is nothing to backfill.
    version = 3;
  }
  if (version < 4) {
    // v4 adds sessions.host (the machine that ingested the transcript) for
    // per-PC provenance. Existing rows predate host capture → mark 'unknown'
    // (we cannot reliably reconstruct which machine produced an old session).
    if (!hasColumn(db, "sessions", "host")) {
      db.exec("ALTER TABLE sessions ADD COLUMN host TEXT");
    }
    db.exec("UPDATE sessions SET host = 'unknown' WHERE host IS NULL");
    version = 4;
  }
  db.prepare("UPDATE schema_version SET version=?").run(version);
}

/** Open (creating if needed) the global brain DB with schema applied. */
export function openBrain(dbPath: string = BRAIN_DB): BrainDB {
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL"); // many readers, single writer
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  db.exec(FTS);
  const row = db.prepare("SELECT version FROM schema_version LIMIT 1").get() as
    | { version: number }
    | undefined;
  if (!row) db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(SCHEMA_VERSION);
  else if (row.version < SCHEMA_VERSION) migrate(db, row.version);
  // The host index lives here, not in SCHEMA, because on a pre-v4 DB the column
  // does not exist yet when SCHEMA runs; by now it does (CREATE TABLE or migrate).
  db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_host ON sessions(host)");
  return db;
}
