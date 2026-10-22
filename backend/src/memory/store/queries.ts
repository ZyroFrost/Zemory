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
  // the highest id above a watermark that THIS machine originated (host = ?, or NULL / 'unknown' for pre-v4 rows), walked
  // down the primary key and stopped at the first hit - MAX() over the join read every row above the watermark
  ownMaxMessageAbove:
    "SELECT m.id AS m FROM messages m JOIN sessions s ON s.id = m.session_id WHERE m.id > ? AND (s.host = ? OR s.host IS NULL OR s.host = 'unknown') ORDER BY m.id DESC LIMIT 1",
  countSessionMessages: "SELECT COUNT(*) c FROM messages WHERE session_id = ?",
  messageIdByUuid: "SELECT id FROM messages WHERE session_id = ? AND uuid = ?",
  insertMessage: `INSERT OR IGNORE INTO messages (session_id, uuid, role, content, tool_name, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
  // Whole-replace re-ingest of ONE session from its source transcript (HP điều 3: the transcript is the source).
  deleteSessionMessages: "DELETE FROM messages WHERE session_id = ?",

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

  // ── vectors ───────────────────────────────────────────────────────────────
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
