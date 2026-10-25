/**
 * Named SQL for the memory domain — ONE place per query (02_RULES §Luật khi VIẾT "SQL — 1 CÁCH", plan/27 §2g).
 *
 * Before writing a query, look here: if it exists, call it by name; if not, add ONE named entry here instead of writing
 * the string at the call site. The guard hook and the ratchet gate read this file to recognise a query that already has
 * a name (comparison is case- and whitespace-insensitive), so keep every value a plain string literal.
 *
 * Measured 2026-10-14 before this file existed: 327 inline SQL strings, 25 groups written more than once (62 copies) —
 * e.g. "count messages" 10 times in 6 files, in two spellings (`count(*)` / `COUNT(*)`).
 */
export const Q = {
  // ── messages ──────────────────────────────────────────────────────────────
  countMessages: "SELECT COUNT(*) c FROM messages",
  maxMessageId: "SELECT COALESCE(MAX(id),0) m FROM messages",
  // the highest id in (from, to] that THIS machine originated (host = ?, or NULL / 'unknown' for pre-v4 rows), walked down
  // the primary key and stopped at the first hit; the fast lane asks only for the ids that arrived since its last tick
  ownMaxMessageBetween:
    "SELECT m.id AS m FROM messages m JOIN sessions s ON s.id = m.session_id WHERE m.id > ? AND m.id <= ? AND (s.host = ? OR s.host IS NULL OR s.host = 'unknown') ORDER BY m.id DESC LIMIT 1",
  // the lowest id above ? that THIS machine originated (same rule as above), walked up the primary key
  ownMinMessageAbove:
    "SELECT m.id AS m FROM messages m JOIN sessions s ON s.id = m.session_id WHERE m.id > ? AND (s.host = ? OR s.host IS NULL OR s.host = 'unknown') ORDER BY m.id ASC LIMIT 1",
  countSessionMessages: "SELECT COUNT(*) c FROM messages WHERE session_id = ?",
  messageIdByUuid: "SELECT id FROM messages WHERE session_id = ? AND uuid = ?",
  // the uuid-less messages of ONE session (the (session_id, uuid) index): the receiving side keys their vectors by a hash
  nullUuidMessagesOfSession: "SELECT id, timestamp, content FROM messages WHERE session_id = ? AND uuid IS NULL",
  // the vectors a block ships: its messages in (from, to], and one message by id (a catch-up id)
  shipMessagesBetween: "SELECT id, session_id, uuid, timestamp, content FROM messages WHERE id > ? AND id <= ? ORDER BY id",
  shipMessageById: "SELECT id, session_id, uuid, timestamp, content FROM messages WHERE id = ?",
  insertMessage: `INSERT OR IGNORE INTO messages (session_id, uuid, role, content, tool_name, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
  // Whole-replace re-ingest of ONE session from its source transcript (HP điều 3: the transcript is the source).
  deleteSessionMessages: "DELETE FROM messages WHERE session_id = ?",

  // a delta mark (`sync_state`): the highest message id a channel / a receiving machine already has
  syncStateMark: "SELECT last_message_id AS v FROM sync_state WHERE bundle = ?",

  // ── sessions ──────────────────────────────────────────────────────────────
  countSessions: "SELECT COUNT(*) c FROM sessions",
  sessionsBySource: "SELECT id, ended_at FROM sessions WHERE source = ?",
  refreshSessionStats: `UPDATE sessions SET
       message_count = (SELECT COUNT(*) FROM messages WHERE session_id = @id),
       started_at    = (SELECT MIN(timestamp) FROM messages WHERE session_id = @id),
       ended_at      = (SELECT MAX(timestamp) FROM messages WHERE session_id = @id)
     WHERE id = @id`,
  // A session with zero chat lines is junk (failed/empty transcript) — not a source row worth keeping.
  deleteEmptySession: "DELETE FROM sessions WHERE id = @id AND message_count = 0",

  // ── stores · attachments · mirror queue ───────────────────────────────────
  knownStores: "SELECT store_root AS root, source FROM known_stores",
  attachmentIdBySha: "SELECT id FROM attachment WHERE sha256 = ?",
  deletePeerFileQueued: "DELETE FROM peer_file_queue WHERE id=?",
  // HP 18: an attachment's bytes live in the db (`blob`). A row whose bytes still sit in the legacy files/ folder has
  // `blob` NULL and `src_path` = its path there; `ref` rows keep the source URL in `src_path` and no bytes.
  attachmentsOnLegacyDisk:
    "SELECT id, sha256, src_path FROM attachment WHERE kind = 'blob' AND blob IS NULL AND src_path IS NOT NULL ORDER BY id",
  attachmentSetBlob: "UPDATE attachment SET blob = ?, src_path = NULL WHERE id = ?",
  insertAttachmentForMessage: `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, blob, created_at)
     VALUES (?, (SELECT session_id FROM messages WHERE id = ?), ?, ?, ?, ?, 'blob', ?, ?)`,
  insertPickedAttachment: `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, blob, created_at)
     VALUES (0, ?, ?, ?, ?, ?, 'blob', ?, ?)`,
  insertAttachmentLink: "INSERT OR IGNORE INTO attachment_link (message_id, attachment_id) VALUES (?, ?)",
  attachmentBlobBySha: "SELECT blob FROM attachment WHERE sha256 = ? AND blob IS NOT NULL",
  // a `ref` whose bytes were just downloaded becomes a `blob` row holding them (the real size, name and mime with it)
  attachmentRefFetched: `UPDATE attachment
        SET kind = 'blob', blob = ?, src_path = NULL, sha256 = ?, bytes = ?,
            mime = COALESCE(?, mime), name = COALESCE(?, name)
      WHERE id = ?`,

  // ── vectors ───────────────────────────────────────────────────────────────
  // the p2p channel (HP 18): which of THIS machine's vectors each receiving machine has confirmed
  peerVecSentDdl: "CREATE TABLE IF NOT EXISTS peer_vec_sent (peer TEXT NOT NULL, message_id INTEGER NOT NULL, PRIMARY KEY (peer, message_id)) WITHOUT ROWID",
  peerVecSentClear: "DELETE FROM peer_vec_sent WHERE peer = ?",
  peerVecSentAdd: "INSERT OR IGNORE INTO peer_vec_sent (peer, message_id) VALUES (?, ?)",
  vecShippedExists: "SELECT name FROM sqlite_master WHERE type='table' AND name='vec_shipped'",
  // own vectors (host = ?, or a pre-v4 row) of messages up to ? that peer ? has not confirmed - main rows only
  peerVecUnsent: `SELECT v.rowid AS id FROM vec_chunks_rowids v
       JOIN messages m ON m.id = v.rowid JOIN sessions s ON s.id = m.session_id
      WHERE v.rowid < 1099511627776 AND v.rowid <= ? AND (s.host = ? OR s.host IS NULL OR s.host = 'unknown')
        AND NOT EXISTS (SELECT 1 FROM peer_vec_sent p WHERE p.peer = ? AND p.message_id = v.rowid)
      ORDER BY v.rowid LIMIT ?`,
  vecConfig: "SELECT * FROM vec_config LIMIT 1",
  vecDims: "SELECT dims FROM vec_config LIMIT 1",
  vecEmbedding: "SELECT embedding FROM vec_chunks WHERE rowid = ?",
  putVecChunk: "INSERT OR REPLACE INTO vec_chunks(rowid, embedding) VALUES (?, ?)",
  putVecMap: "INSERT OR REPLACE INTO vec_map(rowid, message_id, seq) VALUES (?, ?, ?)",

  // ── schema probes · attach ────────────────────────────────────────────────
  tableExists: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
  hasVecRowidsTable: "SELECT name FROM sqlite_master WHERE type='table' AND name='vec_chunks_rowids'",
  attachSrc: "ATTACH DATABASE ? AS src",
  detachSrc: "DETACH DATABASE src",

  // ── a borrowed browser cookie store (not the memory DB) ───────────────────
  countCookies: "SELECT COUNT(1) n FROM cookies",
} as const;
