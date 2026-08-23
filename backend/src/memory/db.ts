// Global memory store — one SQLite DB at <repo>/data/global_memory.db holding session
// transcripts from every agent across every project. The DB is a DERIVED lens:
// it is rebuilt from the agents' own transcript files and is safe to delete.
//
// Storage tiers (see docs/plan): canonical docs stay as per-project markdown;
// THIS store holds the episodic/session tier, machine-wide. Nothing here is
// transmitted anywhere — local-only by construction.

import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// Memory DB location — resolved in priority order so the DB can live OFF C:\
// (it grows without bound) while a tiny FIXED pointer stays in the home dir:
//   1. GLOBAL_MEMORY_DB env — explicit override (A.I Center / tests), wins always.
//   2. ~/.zemory/location.json { dataDir } — the "move my storage" pointer.
//   3. ~/.zemory — the historical default.
// The pointer MUST live at a fixed home path (not next to the DB) or moving the
// DB would move the very file that says where the DB is (chicken-and-egg).
// Everything else (config.json, browser/, imports/, backups/) hangs off MEMORY_DIR,
// so relocating the data dir moves the whole cluster in one step.
const ENV_DB = process.env.GLOBAL_MEMORY_DB?.trim();
export const HOME_ZEMORY_DIR = join(homedir(), ".zemory");
export const LOCATION_POINTER = join(HOME_ZEMORY_DIR, "location.json");

let warnedDanglingPointer = false;

function resolveMemoryDir(): string {
  if (ENV_DB) return dirname(ENV_DB);
  try {
    const parsed = JSON.parse(readFileSync(LOCATION_POINTER, "utf8")) as { dataDir?: unknown };
    if (typeof parsed.dataDir === "string" && parsed.dataDir.trim()) {
      const dir = parsed.dataDir.trim();
      // Dangling pointer (target folder wiped, e.g. repo re-cloned without data/)
      // would silently spawn a fresh EMPTY memory there while an old DB still sits
      // in the home dir — warn loudly ONCE instead of "losing" the memory.
      if (
        !warnedDanglingPointer &&
        !existsSync(join(dir, "global_memory.db")) &&
        existsSync(join(HOME_ZEMORY_DIR, "global_memory.db"))
      ) {
        warnedDanglingPointer = true;
        console.error(
          `zemory: WARNING — ${LOCATION_POINTER} points to ${dir} but no memory DB is there, ` +
            `while ${join(HOME_ZEMORY_DIR, "global_memory.db")} exists. A new EMPTY memory will be created at the pointer target. ` +
            `If this is wrong: delete location.json (falls back to the home DB) or run \`zemory memory relocate\` again.`,
        );
      }
      return dir;
    }
  } catch {
    /* no pointer (or unreadable) → fall back to the home default */
  }
  return HOME_ZEMORY_DIR;
}

/** True while an env override is pinning the DB location (pointer is ignored). */
export const MEMORY_DB_PINNED_BY_ENV = Boolean(ENV_DB);
export const MEMORY_DIR = resolveMemoryDir();
export const MEMORY_DB = ENV_DB || join(MEMORY_DIR, "global_memory.db");

const SCHEMA_VERSION = 22;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);

-- One row per agent session (a single conversation/transcript file).
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,   -- session id (transcript file stem)
  source        TEXT NOT NULL,      -- agent name, e.g. 'claude-code'
  project_root  TEXT,               -- grouping folder (defaults to cwd; user 'merge' may repoint it)
  project_pinned INTEGER NOT NULL DEFAULT 0, -- 1 = project_root set by a user merge → re-scan must NOT overwrite it (cwd still holds the original folder)
  pinned        INTEGER NOT NULL DEFAULT 0, -- 1 = user pinned THIS session: float it to the top of memory_context. Deliberately NOT project_pinned, which is load-bearing for re-scan (v20)
  cwd           TEXT,
  title         TEXT,
  host          TEXT,               -- machine that ingested it (os.hostname()); null/'unknown' = pre-v4
  origin        TEXT NOT NULL DEFAULT 'local', -- 'local' = agent transcript on disk; 'web' = web-chat (chatgpt-web/…)
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

-- Per-MACHINE export watermark (v13): the highest local messages.id already
-- shipped in a given bundle, so the next export can carry only what is new.
-- Local state like ingest_state — it must NEVER travel inside a bundle.
CREATE TABLE IF NOT EXISTS sync_state (
  bundle          TEXT PRIMARY KEY,   -- bundle file name, e.g. 'global_memory.SS01-IT-10.zemory.enc'
  last_message_id INTEGER NOT NULL DEFAULT 0,
  updated_at      TEXT
);

-- RECEIVER side of delta Drive sync: remembers which OTHER-machine bundle files
-- this machine has already merged, so a sync only pulls files that are new or
-- changed. Keyed by file name; sig = size + header createdAt (read from the
-- plaintext header, no decrypt). Per-machine, like sync_state — NEVER travels.
CREATE TABLE IF NOT EXISTS merged_bundles (
  file      TEXT PRIMARY KEY,   -- bundle file name in the Drive folder
  sig       TEXT NOT NULL,      -- '<bytes>:<createdAt>' — changes when the file is rewritten
  merged_at TEXT
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
  path          TEXT NOT NULL,        -- e.g. "docs/plan/00_overview.md"
  kind          TEXT NOT NULL DEFAULT 'plan',
  rendered_at   TEXT,
  rendered_hash TEXT,                  -- sha1 of the last render → detect hand-edits before overwriting
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

-- SESSION DIGEST (plan 06). A DERIVED, per-session summary lens for cheap-token
-- recall: read the digest first, drill down to real messages via anchors only
-- when needed. Rebuildable (safe to delete); keyed 1:1 to a session so it can
-- never mix sessions; NO LLM in this layer (extractive, deterministic).
CREATE TABLE IF NOT EXISTS session_digest (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT NOT NULL UNIQUE,
  kind         TEXT NOT NULL DEFAULT 'extractive', -- 'extractive' | 'agent'
  tasks        TEXT,        -- JSON [{text, id}] — things done, each anchored to a message id
  paths        TEXT,        -- JSON [string] — folders/repos the session touched
  decisions    TEXT,        -- JSON [{text, id}]
  errors       TEXT,        -- JSON [{text, id}]
  outcome      TEXT,        -- last non-tool lines
  meta         TEXT,        -- JSON {source, host, project_root, messages, from, to}
  source_sig   TEXT,        -- staleness signature (count:maxId:lastTs) → regen on change
  digest_text  TEXT,        -- flattened text, indexed by FTS for the recall digest lane
  updated_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_session_digest_sid ON session_digest(session_id);

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

-- Lịch sử fitness của code-graph, một hàng mỗi lần graph được DỰNG LẠI THẬT (chữ ký
-- nguồn đổi) — không phải mỗi lần đọc. Vì sao cần: graphFitness vốn chỉ là ảnh chụp
-- đạt/không-đạt, mà thứ báo hiệu thoái hoá là XU HƯỚNG chứ không phải một điểm số lẻ
-- (đọc "Graph Engineering" §VII.D 2026-07-27: "một cú tăng đột ngột số node cô lập
-- báo hiệu hồi quy"). Đây là trạng thái BỀN VỮNG thật, KHÔNG phải lớp dẫn xuất: không
-- thể dựng lại fitness của hôm qua từ code hôm nay, nên nó không rơi vào điều 3.
-- Tất cả đo tất định từ graph, 0 LLM (điều 6 · 12).
CREATE TABLE IF NOT EXISTS graph_fitness (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  project   TEXT NOT NULL,
  built_at  TEXT NOT NULL,
  sig       TEXT,
  passed    INTEGER NOT NULL,
  files     INTEGER NOT NULL,
  edges     INTEGER NOT NULL,
  metrics   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS graph_fitness_proj ON graph_fitness(project, built_at);

-- FILE ĐÍNH KÈM của một message. Tách khỏi messages vì ba lý do đo được:
--   ① Nội dung nhị phân KHÔNG được vào messages.content — cột đó nuôi FTS5, nhét blob
--      vào là thổi index lên mà không tìm được gì (bài học v16/v17: trigram nuốt tool-dump
--      làm DB phình 435 MB).
--   ② Một file bị đọc lại nhiều lần trong cùng phiên = MỘT nội dung. Dedup theo sha256
--      để không lưu 20 bản của cùng một file.
--   ③ Đính kèm là dữ liệu NGUỒN (đến từ transcript), không phải lớp dẫn xuất — nên nó
--      không rơi vào điều 3 "vứt đi dựng lại được".
--
-- BA HẠNG kind, có chủ ý — quyết định lưu-hay-không phải TƯỜNG MINH, không lặng lẽ:
--   · 'text' — file văn bản, nội dung nằm ở content (đã redact secret, điều 7).
--   · 'blob' — nhị phân, nằm ở blob.
--   · 'ref'  — CHỈ ghi nhận "từng có file này, ở đường dẫn này", KHÔNG lưu nội dung.
--              Dùng khi file vượt ngưỡng. Thà biết nó từng tồn tại còn hơn im lặng bỏ qua.
--
-- Đo trên corpus thật 2026-07-28 (105 transcript, 5.456 attachment): p99 = 1,6 KB,
-- max 12 KB, tổng 0,2 MB, **0 file nhị phân**. Tức hôm nay mọi thứ rơi vào 'text'.
-- Đường 'blob'/'ref' dựng sẵn cho ảnh dán từ claude.ai/Desktop — CHƯA có dữ liệu thật
-- để kiểm, nên chưa nối vào bundle sync (xem 05_TODO: L3 chờ user chốt chính sách).
CREATE TABLE IF NOT EXISTS attachment (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  session_id TEXT    NOT NULL,
  name       TEXT,
  mime       TEXT,
  bytes      INTEGER NOT NULL DEFAULT 0,
  sha256     TEXT    NOT NULL,
  kind       TEXT    NOT NULL DEFAULT 'text',
  content    TEXT,
  blob       BLOB,
  src_path   TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS attachment_msg  ON attachment(message_id);
CREATE INDEX IF NOT EXISTS attachment_sess ON attachment(session_id);
-- Dedup NỘI DUNG: cùng sha256 thì chỉ giữ một bản; các message khác trỏ tới qua
-- attachment_link. Không đặt UNIQUE trên chính bảng vì một nội dung có thể xuất hiện
-- ở nhiều phiên với tên khác nhau.
CREATE UNIQUE INDEX IF NOT EXISTS attachment_sha ON attachment(sha256);

-- Nối nhiều-nhiều: message ↔ attachment. Một file đọc lại 20 lần = 1 hàng attachment
-- + 20 hàng ở đây, thay vì 20 bản sao nội dung.
CREATE TABLE IF NOT EXISTS attachment_link (
  message_id    INTEGER NOT NULL,
  attachment_id INTEGER NOT NULL,
  name          TEXT,
  PRIMARY KEY (message_id, attachment_id)
);
CREATE INDEX IF NOT EXISTS attachment_link_att ON attachment_link(attachment_id);
CREATE INDEX IF NOT EXISTS idx_compression_event_art ON compression_event(artifact_id);
`;

// FTS5 index over messages.content. EXTERNAL CONTENT (content='messages',
// content_rowid='id'): the index stores only the inverted-index postings, not
// a second copy of the text — messages.content (already on disk) is read on
// demand for snippet()/highlight(). This is what plan 12 buoc 4 trades a
// second (and third) verbatim copy of every message for. The default
// (unicode61) table powers word search; the trigram table powers substring /
// CJK / Vietnamese-with-diacritics matching. External-content triggers differ
// from a standalone FTS table: DELETE/UPDATE must pass the OLD content back in
// via the special 'delete' command (the index has no copy of its own to look
// up) — see https://sqlite.org/fts5.html#external_content_tables.
const MESSAGES_FTS_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content, content='messages', content_rowid='id');
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts_tri USING fts5(content, content='messages', content_rowid='id', tokenize='trigram');

-- LANE TRIGRAM INDEX CẢ tool_use, CHỈ LOẠI tool_result (v21, 2026-08-12).
--
-- ĐẢO vế "không index tool-dump" của v16/v17. Vế đó chọn bằng số DUNG LƯỢNG mà KHÔNG ai đo
-- phần chất lượng mất — đúng lỗi HP điều 15 sinh ra để chặn. Đo A/B/C trên bản sao kho thật
-- (68 nhãn, cùng lệnh, chỉ khác trigram của tool_use):
--   trigram 0%   → tool_use @10 14% · MRR 0,046 | keyword @10 42% | hybrid MRR 0,263
--   trigram 78%  → tool_use @10 21% · MRR 0,116 | keyword @10 50% | hybrid MRR 0,290
--   trigram 100% → tool_use @10 21% · MRR 0,080 | keyword @10 50% | hybrid MRR 0,276
-- Gỡ lane này đi thì tool_use mất 60% MRR, và lớp keyword — không ai ngờ — sập 8 điểm@10.
-- Tức tool-dump trong trigram ĐANG trả tiền nuôi thân. Giá: +167 MB trên kho 1,9 GB.
--
-- Lớp tool_result GIỮ NGUYÊN loại trừ: nó là phần dump TO NHẤT (46,9 MB hồi v17) và đã có sẵn
-- HAI luồng (word + vector 99,8%), nên thêm luồng thứ ba là trả đĩa cho thứ chưa đo là thiếu.
--
-- Vẫn đúng mô hình "1 lớp đầy + 1 lớp lọc": messages giữ NGUYÊN VẸN (nguồn, plan/06 §6),
-- chỉ lớp DẪN XUẤT lọc bớt. Tiêu chí vẫn là NGỮ NGHĨA (tiền tố '[tool_result]'), không phải
-- ngưỡng số ma.
CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content)     VALUES (new.id, COALESCE(new.content, ''));
END;
CREATE TRIGGER IF NOT EXISTS messages_ai_tri AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts_tri(rowid, content) VALUES (new.id, COALESCE(new.content, ''));
END;
CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content)     VALUES('delete', old.id, COALESCE(old.content, ''));
END;
CREATE TRIGGER IF NOT EXISTS messages_ad_tri AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts_tri(messages_fts_tri, rowid, content) VALUES('delete', old.id, COALESCE(old.content, ''));
END;
CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content)     VALUES('delete', old.id, COALESCE(old.content, ''));
  INSERT INTO messages_fts(rowid, content)     VALUES (new.id, COALESCE(new.content, ''));
END;
-- UPDATE: MỘT trigger, hai câu lệnh CÓ ĐIỀU KIỆN — gỡ theo giá trị CŨ rồi thêm theo giá trị MỚI.
--
-- 🔴 SỬA LỖI THẬT (2026-08-12). Bản cũ tách thành hai trigger (_del + _ins) với lý do
-- "hàng có thể ĐỔI PHÍA". Lý do đúng, cách làm SAI: SQLite KHÔNG bảo đảm thứ tự nổ giữa
-- nhiều trigger cùng loại trên cùng bảng. Khi CẢ HAI điều kiện cùng đúng — tin văn xuôi bị
-- sửa nội dung, ca xảy ra mỗi lần redact() chạy — thì _ins có thể nổ TRƯỚC _del, thành
-- "thêm rồi xoá" ⇒ posting biến mất hoàn toàn. Đo được: UPDATE một hàng prose xong thì
-- bảng _docsize RỖNG, tin đó rơi khỏi trigram vĩnh viễn mà không lệnh nào báo.
-- Bộ test cũ mù ca này vì mọi ca của nó đều ĐỔI PHÍA (chỉ một trigger nổ, thứ tự vô nghĩa).
--
-- Thứ tự các câu lệnh TRONG một thân trigger thì SQLite bảo đảm, nên gộp lại là cách đúng.
-- Dùng INSERT … SELECT … WHERE để mỗi câu tự mang điều kiện riêng (thân trigger không có IF).
-- Lane word ở trên vốn đã là một trigger hai câu — nay hai lane cùng một khuôn.
CREATE TRIGGER IF NOT EXISTS messages_au_tri AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts_tri(messages_fts_tri, rowid, content) VALUES('delete', old.id, COALESCE(old.content, ''));
  INSERT INTO messages_fts_tri(rowid, content) VALUES (new.id, COALESCE(new.content, ''));
END;
`;

const FTS = `
${MESSAGES_FTS_SQL}
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

-- Session-digest FTS: the "digest lane" for recall (word + Vietnamese trigram).
-- rowid = session_digest.id; triggers keep both in sync on insert/delete/update.
CREATE VIRTUAL TABLE IF NOT EXISTS session_digest_fts USING fts5(digest_text);
CREATE VIRTUAL TABLE IF NOT EXISTS session_digest_fts_tri USING fts5(digest_text, tokenize='trigram');

CREATE TRIGGER IF NOT EXISTS session_digest_ai AFTER INSERT ON session_digest BEGIN
  INSERT INTO session_digest_fts(rowid, digest_text)     VALUES (new.id, COALESCE(new.digest_text, ''));
  INSERT INTO session_digest_fts_tri(rowid, digest_text) VALUES (new.id, COALESCE(new.digest_text, ''));
END;
CREATE TRIGGER IF NOT EXISTS session_digest_ad AFTER DELETE ON session_digest BEGIN
  DELETE FROM session_digest_fts     WHERE rowid = old.id;
  DELETE FROM session_digest_fts_tri WHERE rowid = old.id;
END;
CREATE TRIGGER IF NOT EXISTS session_digest_au AFTER UPDATE ON session_digest BEGIN
  DELETE FROM session_digest_fts     WHERE rowid = old.id;
  DELETE FROM session_digest_fts_tri WHERE rowid = old.id;
  INSERT INTO session_digest_fts(rowid, digest_text)     VALUES (new.id, COALESCE(new.digest_text, ''));
  INSERT INTO session_digest_fts_tri(rowid, digest_text) VALUES (new.id, COALESCE(new.digest_text, ''));
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

export type MemoryDB = Database.Database;

function hasColumn(db: MemoryDB, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

function hasTable(db: MemoryDB, table: string): boolean {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
}

function migrate(db: MemoryDB, fromVersion: number): void {
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
  if (version < 5) {
    // v5 adds the session_digest table + its FTS lane. Both are created by the
    // SCHEMA/FTS exec above (CREATE ... IF NOT EXISTS); digests are built lazily
    // by scan + `memory digest --all`, so there is nothing to backfill here.
    version = 5;
  }
  if (version < 6) {
    // v6 adds sessions.origin ('local' | 'web') so recall can separate local
    // agent transcripts from captured web-chat. Every existing row is a local
    // agent session → the NOT NULL DEFAULT 'local' backfills them automatically.
    if (!hasColumn(db, "sessions", "origin")) {
      db.exec("ALTER TABLE sessions ADD COLUMN origin TEXT NOT NULL DEFAULT 'local'");
    }
    version = 6;
  }
  // v7–v9 only reshaped recall_savings, a table v11 removes entirely. They now
  // no-op unless a real old DB still carries the table (guarded), since v11 drops
  // it anyway — a fresh/synthetic DB never had it (it's no longer in SCHEMA).
  if (version < 7) {
    if (hasTable(db, "recall_savings")) {
      if (!hasColumn(db, "recall_savings", "query")) db.exec("ALTER TABLE recall_savings ADD COLUMN query TEXT");
      if (!hasColumn(db, "recall_savings", "hits")) db.exec("ALTER TABLE recall_savings ADD COLUMN hits INTEGER");
    }
    version = 7;
  }
  if (version < 8) {
    if (hasTable(db, "recall_savings") && !hasColumn(db, "recall_savings", "feature")) {
      db.exec("ALTER TABLE recall_savings ADD COLUMN feature TEXT NOT NULL DEFAULT 'recall'");
    }
    version = 8;
  }
  if (version < 9) {
    if (hasTable(db, "recall_savings")) {
      db.exec("UPDATE recall_savings SET feature='recall' WHERE feature IN ('search','show')");
    }
    version = 9;
  }
  if (version < 10) {
    // v10 added doc.rendered_hash (sha1 of the last render). VESTIGIAL since
    // 2026-07-17 — render (db → md) was removed under FILE WINS (the .md is the
    // source; the DB is a read-only search index). Kept for schema-version
    // continuity; no longer written or read.
    if (!hasColumn(db, "doc", "rendered_hash")) {
      db.exec("ALTER TABLE doc ADD COLUMN rendered_hash TEXT");
    }
    version = 10;
  }
  if (version < 11) {
    // v11 drops the recall_savings ledger — the "% token saved" it fed was a
    // counterfactual (baseline = whole matched sessions) that always read ~99.99%,
    // never a real saving. Recall/Digest themselves stay; only the fake meter goes.
    db.exec("DROP TABLE IF EXISTS recall_savings");
    version = 11;
  }
  if (version < 12) {
    // v12 (plan 12 buoc 4): messages_fts/_tri were STANDALONE fts5 tables, so
    // each kept its own verbatim copy of messages.content — two extra copies of
    // every message's text (~246MB measured, see plan 11 §1/plan 12 §0). Convert
    // to EXTERNAL CONTENT (content='messages', content_rowid='id'): the index
    // reads content from `messages` on demand instead of duplicating it. Drop +
    // recreate is required — `db.exec(FTS)` above already ran with the OLD
    // tables present (IF NOT EXISTS skipped it), so this migration explicitly
    // replaces them, then 'rebuild' repopulates the postings from `messages`.
    db.exec("DROP TRIGGER IF EXISTS messages_ai");
    db.exec("DROP TRIGGER IF EXISTS messages_ad");
    db.exec("DROP TRIGGER IF EXISTS messages_au");
    db.exec("DROP TABLE IF EXISTS messages_fts");
    db.exec("DROP TABLE IF EXISTS messages_fts_tri");
    db.exec(MESSAGES_FTS_SQL);
    db.exec("INSERT INTO messages_fts(messages_fts) VALUES('rebuild')");
    db.exec("INSERT INTO messages_fts_tri(messages_fts_tri) VALUES('rebuild')");
    version = 12;
  }
  if (version < 13) {
    // v13 adds sync_state (per-machine export watermark for delta bundles).
    // Created by the SCHEMA exec above (CREATE TABLE IF NOT EXISTS); an empty
    // table means "never exported" → the first delta export ships everything.
    version = 13;
  }
  if (version < 14) {
    // v14 adds merged_bundles (receiver-side dedup for delta Drive sync). Created
    // by the SCHEMA exec above (CREATE TABLE IF NOT EXISTS); empty = "merged
    // nothing yet" → the first sync merges every remote bundle it finds.
    version = 14;
  }
  if (version < 15) {
    // v15 adds sessions.project_pinned: when the user MERGES a discovered folder
    // into another project (UI "Gộp"), project_root is repointed and pinned so the
    // next scan's COALESCE upsert can't revert it to cwd. Existing rows = 0 (not
    // user-merged); the NOT NULL DEFAULT 0 backfills them.
    if (!hasColumn(db, "sessions", "project_pinned")) {
      db.exec("ALTER TABLE sessions ADD COLUMN project_pinned INTEGER NOT NULL DEFAULT 0");
    }
    version = 15;
  }
  if (version < 16) {
    // v16: lane TRIGRAM thôi index tool-dump. `messages_fts_tri_data` đo được **435,4 MB
    // = 42% cả DB**, gấp đôi text gốc — trigram trên JSON/code dump gần như vô dụng cho
    // tìm kiếm mà cực tốn. Lane word (`messages_fts`) GIỮ NGUYÊN index tất cả nên tool-dump
    // vẫn tìm được bằng từ khoá; `messages` KHÔNG đụng tới (nguồn phải đầy — plan/06 §6).
    //
    // Trigger cũ gộp 2 lane trong một BEGIN…END ⇒ phải thay hẳn bộ trigger, rồi dựng lại
    // postings CHỈ cho hàng `tool_name IS NULL`. Dùng 'delete-all' (hợp lệ với external
    // content) thay vì 'rebuild' — 'rebuild' sẽ nạp lại TOÀN BỘ, đúng thứ đang muốn tránh.
    for (const t of ["messages_ai", "messages_ad", "messages_au", "messages_ai_tri", "messages_ad_tri", "messages_au_tri_del", "messages_au_tri_ins"]) {
      db.exec(`DROP TRIGGER IF EXISTS ${t}`);
    }
    db.exec(MESSAGES_FTS_SQL);
    db.exec("INSERT INTO messages_fts_tri(messages_fts_tri) VALUES('delete-all')");
    db.exec(
      "INSERT INTO messages_fts_tri(rowid, content) SELECT id, COALESCE(content, '') FROM messages WHERE tool_name IS NULL",
    );
    version = 16;
  }
  if (version < 17) {
    // v17 VÁ LỖI CỦA v16: điều kiện "tool_name IS NULL" KHÔNG bắt được `tool_result`.
    // Adapter chỉ set `tool_name` cho `tool_use` (firstTool đọc tên tool của assistant);
    // còn `[tool_result]` nằm trong LƯỢT USER và `tool_name = NULL` (đo: 0/44.102 hàng có
    // tool_name) ⇒ đúng phần dump TO NHẤT vẫn lọt vào trigram. Đo sau v16: trigram mới giảm
    // 435→309 MB, còn 46,9 MB tool_result nằm trong đó.
    // Dùng CÙNG dấu hiệu tất định mà `search.ts roleMatches()` đang dùng: tiền tố
    // '[tool_result]' (mọi tin chứa nó đều BẮT ĐẦU bằng nó — đo 44.102 = 44.102).
    for (const t of ["messages_ai_tri", "messages_ad_tri", "messages_au_tri_del", "messages_au_tri_ins"]) {
      db.exec(`DROP TRIGGER IF EXISTS ${t}`);
    }
    db.exec(MESSAGES_FTS_SQL);
    db.exec("INSERT INTO messages_fts_tri(messages_fts_tri) VALUES('delete-all')");
    db.exec(
      "INSERT INTO messages_fts_tri(rowid, content) SELECT id, COALESCE(content, '') FROM messages " +
        "WHERE tool_name IS NULL AND COALESCE(content, '') NOT LIKE '[tool_result]%'",
    );
    version = 17;
  }
  if (version < 18) {
    // v18 thêm bảng graph_fitness (lịch sử fitness code-graph). Bảng do khối SCHEMA
    // ở trên tạo bằng CREATE TABLE IF NOT EXISTS, và lịch sử quá khứ thì KHÔNG dựng
    // lại được từ code hiện tại — nên cố tình không backfill: chuỗi thời gian bắt
    // đầu từ lần dựng graph kế tiếp. Bịa số cho quá khứ là vi phạm điều 12.
    version = 18;
  }
  if (version < 19) {
    // v19 thêm `attachment` + `attachment_link` (file đính kèm của message). Cả hai do
    // khối SCHEMA ở trên tạo bằng CREATE TABLE IF NOT EXISTS.
    // KHÔNG backfill: 52 tin đính kèm đã ingest đang nằm ở messages.content dạng
    // "[file:<đường dẫn>]" + nội dung, và VẪN ĐÚNG — chúng là lớp full, tìm được, đọc
    // được. Chuyển chúng sang bảng mới là viết lại dữ liệu NGUỒN chỉ để gọn gàng hơn,
    // không đáng (điều 3). Bảng mới nhận đính kèm TỪ ĐÂY VỀ SAU.
    version = 19;
  }
  if (version < 20) {
    // v20 thêm `sessions.pinned` — ghim MỘT PHIÊN để nó nổi lên đầu `memory_context`.
    // CỘT RIÊNG, cố ý không mượn `project_pinned`: cột đó đang gánh nghĩa khác và chịu
    // lực ("project_root do user gộp tay ⇒ scan sau CẤM ghi đè", dùng trong upsert của
    // ingest). Mượn nó thì ghim một phiên = khoá luôn đường cập nhật project_root của
    // phiên đó — một lỗi âm thầm, không ai thấy cho tới lúc scan không cập nhật nữa.
    if (!hasColumn(db, "sessions", "pinned")) {
      db.exec("ALTER TABLE sessions ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0");
    }
    version = 20;
  }
  if (version < 21) {
    // v21 ĐẢO v16/v17 cho lớp `tool_use`: nay CÓ trigram (lý do + số đo ở MESSAGES_FTS_SQL).
    //
    // DELETE-ALL rồi nạp lại TOÀN BỘ theo chính sách mới, thay vì "chỉ thêm phần thiếu".
    // Hai lý do, cái thứ hai mới là cái quyết định:
    //  ① không có cách RẺ và CHẮC nào để biết một hàng đã có posting hay chưa — bảng
    //    `_docsize` là bảng bóng nội bộ của FTS5, dựa vào nó là dựa vào chi tiết cài đặt;
    //  ② kho thật đang ở trạng thái NỬA VỜI mà không ai cố ý tạo ra: `salvage.ts` chạy
    //    'rebuild' (nạp TẤT CẢ, bỏ qua điều kiện trigger) nên tin có trước lần cứu hộ
    //    cuối thì có posting, tin sau thì không — đo 2026-08-12: tháng 5–7 phủ 98–100%,
    //    tháng 8 chỉ 8%. Nạp-phần-thiếu sẽ GIỮ NGUYÊN mọi lệch lạc khác đang có; nạp lại
    //    tất cả đưa chỉ mục về đúng một trạng thái suy ra được từ nguồn (điều 3).
    // Giá đo trên bản sao 1,9 GB: ~40 s nạp + ~20 s optimize, 0 lời gọi model.
    //
    // Migration này KIÊM luôn bản vá lỗi thứ tự trigger UPDATE (xem MESSAGES_FTS_SQL): hai
    // trigger `_del`/`_ins` bị thay bằng MỘT `messages_au_tri`. Dựng lại toàn bộ postings ở
    // đây cũng chính là thứ dọn sạch những hàng đã rơi khỏi trigram vì lỗi đó — chúng không
    // đếm được bằng cách nào rẻ hơn, vì index không lưu dấu vết của thứ nó đã đánh mất.
    for (const t of ["messages_ai_tri", "messages_ad_tri", "messages_au_tri_del", "messages_au_tri_ins", "messages_au_tri"]) {
      db.exec(`DROP TRIGGER IF EXISTS ${t}`);
    }
    db.exec(MESSAGES_FTS_SQL);
    db.exec("INSERT INTO messages_fts_tri(messages_fts_tri) VALUES('delete-all')");
    db.exec(
      "INSERT INTO messages_fts_tri(rowid, content) SELECT id, COALESCE(content, '') FROM messages " +
        "WHERE COALESCE(content, '') NOT LIKE '[tool_result]%'",
    );
    // Gộp segment ngay: bỏ qua bước này thì truy vấn đầu tiên sau migration phải đọc rất
    // nhiều segment rời — người dùng gặp một lượt tìm chậm bất thường mà không hiểu vì sao.
    db.exec("INSERT INTO messages_fts_tri(messages_fts_tri) VALUES('optimize')");
    version = 21;
  }
  if (version < 22) {
    // v22 ĐẢO v17: lane trigram nhận LẠI `tool_result`.
    //
    // v17 cắt nó để tiết kiệm đĩa (trigram 435 -> 309 MB). Nhưng lớp đó hoá ra là lớp YẾU
    // NHẤT của recall trong khi chiếm ~31% kho, và nó chỉ còn HAI luồng (word + vector) —
    // mà quan hệ "số luồng -> recall" là đơn điệu và đã đo nhiều lần (plan/17 §3c).
    //
    // Đo A/B trên BẢN SAO trước khi làm (HP điều 15), corpus 108 nhãn, hybrid, --no-rerank:
    //   tool_result  @1 0% -> 12% · @10 20% -> 28% · MRR 0,060 -> 0,167  (+178%)
    //   prose        y NGUYÊN (26/41/47/59 · 0,349 -> 0,350)
    //   tool_use     MRR 0,152 -> 0,171
    //   keyword      MRR 0,250 -> 0,201  <- TỤT, nằm đúng ngưỡng nhiễu của n=23
    //   tổng nghiêm  MRR 0,214 -> 0,233 · tương đương 0,435 -> 0,451  (cả hai thước LÊN)
    // Giá: kho 2.042 -> 2.304 MB (+262 MB) · truy vấn 1.333 -> 1.645 ms (+23%).
    // Cổng "không lớp nào tụt" TRƯỢT ở keyword ⇒ **user chốt** đánh đổi này (điều 12), vì
    // phần được ở lớp yếu nhất vượt xa nhiễu còn phần mất thì không.
    //
    // Chỉ NẠP BÙ phần thiếu, KHÔNG 'rebuild': rebuild nạp lại toàn bộ (~200 MB công vô ích).
    for (const t of ["messages_ai_tri", "messages_ad_tri", "messages_au_tri"]) {
      db.exec(`DROP TRIGGER IF EXISTS ${t}`);
    }
    db.exec(MESSAGES_FTS_SQL);
    db.exec(
      "INSERT INTO messages_fts_tri(rowid, content) SELECT id, COALESCE(content, '') FROM messages " +
        "WHERE COALESCE(content, '') LIKE '[tool_result]%'",
    );
    // Gộp segment ngay: nạp một phát 89k hàng đẻ rất nhiều segment rời, để nguyên thì lượt
    // tìm đầu tiên chậm bất thường mà không ai hiểu vì sao (cùng bài học v21).
    db.exec("INSERT INTO messages_fts_tri(messages_fts_tri) VALUES('optimize')");
    version = 22;
  }
  db.prepare("UPDATE schema_version SET version=?").run(version);
}

/** Re-resolve the data dir NOW (reads the pointer fresh) so a long-lived process
 *  — e.g. the `zemory ui` server — picks up a `memory relocate` without a restart. */
export function currentMemoryDir(): string {
  return ENV_DB ? dirname(ENV_DB) : resolveMemoryDir();
}

/** Same, for the DB file itself. Prefer this over the `MEMORY_DB` const as a
 *  default everywhere — the const freezes the location at process start. */
export function currentMemoryDb(): string {
  return ENV_DB || join(resolveMemoryDir(), "global_memory.db");
}

/** Open (creating if needed) the global memory DB with schema applied. Defaults to
 *  the freshly-resolved path so relocation is honoured mid-process. */
export function openMemory(dbPath: string = currentMemoryDb()): MemoryDB {
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL"); // many readers, single writer
  // FULL, không phải NORMAL — đổi sau sự cố hỏng DB 2026-08-03, và ĐÃ ĐO chứ không đoán.
  //
  // Vật chứng của lần hỏng đó: cây bóng FTS5 trỏ tới trang VƯỢT `page_count` — tức trang được
  // tham chiếu nhưng **chưa bao giờ xuống đĩa**. Đó là chữ ký của MẤT GHI, không phải tranh
  // chấp ghi (tranh chấp cho ra lệch logic, không tạo được con trỏ vượt cuối file). Đã dựng
  // phép tái hiện giết cứng tiến trình giữa lúc FTS5 đang trộn: **0/8 lượt hỏng** — nên kill
  // KHÔNG phải nguyên nhân. Nghi can còn lại là mất ghi ở tầng HĐH/đĩa; máy này là laptop và
  // nhật ký Windows có "entering sleep — Sleep Reason: Battery".
  //
  // Với WAL, `NORMAL` không fsync ở mỗi commit; `FULL` thì có. Chi phí ĐO ĐƯỢC trên chính tải
  // per-message của repo (200 giao dịch × 20 tin, có trigger FTS): **12,3ms → 13,0ms mỗi lượt,
  // đắt hơn 5%**. Đổi lấy việc không mất ghi khi máy ngủ/hết pin thì quá rẻ.
  db.pragma("synchronous = FULL");
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
  // origin (v6) may be added by migrate on a pre-v6 DB → build its index once the column exists.
  db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_origin ON sessions(origin)");
  return db;
}
