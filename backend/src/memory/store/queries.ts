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
  // the id of the (N+1)-th message above ? that THIS machine originated: where a block of N+1 own messages ends
  ownNthMessageAbove:
    "SELECT m.id AS m FROM messages m JOIN sessions s ON s.id = m.session_id WHERE m.id > ? AND (s.host = ? OR s.host IS NULL OR s.host = 'unknown') ORDER BY m.id ASC LIMIT 1 OFFSET ?",
  // the lowest id above ? that THIS machine originated (same rule as above), walked up the primary key
  ownMinMessageAbove:
    "SELECT m.id AS m FROM messages m JOIN sessions s ON s.id = m.session_id WHERE m.id > ? AND (s.host = ? OR s.host IS NULL OR s.host = 'unknown') ORDER BY m.id ASC LIMIT 1",
  countSessionMessages: "SELECT COUNT(*) c FROM messages WHERE session_id = ?",
  sessionAliasOf: "SELECT session_id AS id FROM session_alias WHERE alias_id = ?",
  // every session with its message count, ordered so two machines hash the same list the same way (`memory hosts --sets`)
  sessionSetRows: "SELECT source, id, message_count AS n FROM sessions ORDER BY source, id",
  // message catch-up (`memory vectors-catchup`): every local message with its session's scope columns, the list of ids the
  // shared store lacks (a TEMP table: the list never travels), and the rows those ids carry into the bundle
  catchUpLocalMessages:
    "SELECT m.id AS i, m.session_id AS s, m.uuid AS u, m.timestamp AS ts, m.content AS c, se.origin, se.host, se.source, se.account FROM messages m JOIN sessions se ON se.id = m.session_id",
  catchUpProbeKeys: "SELECT session_id AS s, uuid AS u, timestamp AS ts, content AS c FROM messages",
  catchUpIdsTable: "CREATE TEMP TABLE IF NOT EXISTS catchup_ids (id INTEGER PRIMARY KEY)",
  catchUpIdPut: "INSERT OR IGNORE INTO temp.catchup_ids (id) VALUES (?)",
  catchUpSessions:
    "INSERT OR IGNORE INTO main.sessions SELECT * FROM src.sessions WHERE id IN (SELECT session_id FROM src.messages WHERE id IN (SELECT id FROM temp.catchup_ids))",
  catchUpMessages:
    "INSERT INTO main.messages (session_id, uuid, role, content, tool_name, timestamp) SELECT session_id, uuid, role, content, tool_name, timestamp FROM src.messages WHERE id IN (SELECT id FROM temp.catchup_ids)",
  // the totals two machines compare to know their memories match (`memory where`)
  sessionTotals: "SELECT COUNT(*) AS n, COALESCE(SUM(message_count), 0) AS m, MAX(ended_at) AS last FROM sessions",
  // the encoded folder name is spelt with the drive letter's case of the cwd Claude Code saw: compare without case
  sessionAliasOfAnyCase: "SELECT session_id AS id FROM session_alias WHERE lower(alias_id) = lower(?)",
  upsertSessionAlias: "INSERT INTO session_alias (alias_id, session_id) VALUES (?, ?) ON CONFLICT(alias_id) DO UPDATE SET session_id = excluded.session_id",
  messageIdByUuid: "SELECT id FROM messages WHERE session_id = ? AND uuid = ?",
  // the uuid-less messages of ONE session (the (session_id, uuid) index): the receiving side keys their vectors by a hash
  nullUuidMessagesOfSession: "SELECT id, timestamp, content FROM messages WHERE session_id = ? AND uuid IS NULL",
  // the vectors a block ships: its messages in (from, to], and one message by id (a catch-up id)
  shipMessagesBetween: "SELECT id, session_id, uuid, timestamp, content FROM messages WHERE id > ? AND id <= ? ORDER BY id",
  shipMessageById: "SELECT id, session_id, uuid, timestamp, content FROM messages WHERE id = ?",
  // A message with a uuid is deduplicated by UNIQUE(session_id, uuid). One without (codex, tool lines) is matched on content
  // identity, the same key the bundle merge uses: a re-read of a transcript whose ingest mark was lost re-inserted every
  // uuid-less line (2026-10-26: 5,658 copies in the second machine's codex sessions).
  insertMessage: `INSERT OR IGNORE INTO messages (session_id, uuid, role, content, tool_name, timestamp)
     SELECT @session, @uuid, @role, @content, @tool, @ts
      WHERE @uuid IS NOT NULL OR NOT EXISTS (
        SELECT 1 FROM messages WHERE session_id = @session AND uuid IS NULL
           AND role IS @role AND timestamp IS @ts AND content IS @content)`,
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
  // the origin's whole replace of a session, shipped so the other machine follows it (memory/replace.ts)
  sessionContentRows: "SELECT id, role, timestamp, content FROM messages WHERE session_id = ?",
  sessionReplacedUpsert:
    "INSERT INTO session_replaced (session_id, keys, max_ts, at) VALUES (?, ?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET keys = excluded.keys, max_ts = excluded.max_ts, at = excluded.at",
  replacePendingUpsert:
    "INSERT INTO session_replace_pending (session_id, keys, max_ts, at) VALUES (?, ?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET keys = excluded.keys, max_ts = excluded.max_ts, at = excluded.at WHERE excluded.at >= session_replace_pending.at",
  replacePendingAll: "SELECT session_id, keys, max_ts FROM session_replace_pending",
  replacePendingDelete: "DELETE FROM session_replace_pending WHERE session_id = ?",
  replaceIncoming: "SELECT r.session_id, r.keys, r.max_ts, r.at, s.host, s.origin FROM src.session_replaced r JOIN sessions s ON s.id = r.session_id",
  // the merge, web sessions: the bigger copy wins - an incoming line under a uuid this store holds shorter takes the longer text
  webLongerWins: `UPDATE messages SET content = (SELECT s.content FROM src.messages s WHERE s.session_id = messages.session_id AND s.uuid = messages.uuid)
    WHERE uuid IS NOT NULL
      AND session_id IN (SELECT id FROM sessions WHERE origin = 'web')
      AND (session_id, uuid) IN (SELECT session_id, uuid FROM src.messages WHERE uuid IS NOT NULL)
      AND length(COALESCE((SELECT s.content FROM src.messages s WHERE s.session_id = messages.session_id AND s.uuid = messages.uuid), '')) > length(COALESCE(content, ''))
    RETURNING id, session_id`,
  replaceShipDdl: "CREATE TABLE IF NOT EXISTS main.session_replaced (session_id TEXT PRIMARY KEY, keys TEXT NOT NULL, max_ts TEXT, at TEXT NOT NULL)",
  replaceShip: "INSERT OR REPLACE INTO main.session_replaced SELECT session_id, keys, max_ts, at FROM src.session_replaced WHERE session_id IN (SELECT id FROM main.sessions)",
  deleteMessageById: "DELETE FROM messages WHERE id = ?",
  // the receiver of a replace: an incoming line under a uuid it already holds (INSERT OR IGNORE kept the old text)
  replaceIncomingUuidRows:
    "SELECT uuid, role, content, tool_name, timestamp FROM src.messages WHERE session_id = ? AND uuid IS NOT NULL",
  messageBySessionUuid: "SELECT id, role, timestamp, content FROM messages WHERE session_id = ? AND uuid = ?",
  messageTextUpdate: "UPDATE messages SET role = ?, content = ?, tool_name = ?, timestamp = ? WHERE id = ?",
  // `memory reship`: the rows of a session written again under new ids, its attachments moved along
  reshipSessionRows: "SELECT id, uuid, role, content, tool_name, timestamp FROM messages WHERE session_id = ? ORDER BY id",
  reshipInsertRow: "INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
  reshipLinkRows:
    "SELECT l.message_id, l.attachment_id, l.name FROM attachment_link l JOIN messages m ON m.id = l.message_id WHERE m.session_id = ?",
  reshipLinkDelete: "DELETE FROM attachment_link WHERE message_id = ?",
  reshipLinkInsert: "INSERT OR IGNORE INTO attachment_link (message_id, attachment_id, name) VALUES (?, ?, ?)",
  reshipAttachmentMove: "UPDATE attachment SET message_id = ? WHERE message_id = ?",
  sessionHost: "SELECT id, source, host FROM sessions WHERE id = ?",
  deleteSessionDigest: "DELETE FROM session_digest WHERE session_id = ?",
  // `memory redact`: every message with its session's source, so the dry run counts per source
  redactScanMessages:
    "SELECT m.id, m.content AS value, s.source FROM messages m LEFT JOIN sessions s ON s.id = m.session_id WHERE m.content IS NOT NULL AND m.content != ''",
  // the dry run of `memory forget`: the vector rows `forgetVectors` would delete (direct rowid + long-message chunks)
  vecCountTemp: "CREATE TEMP TABLE IF NOT EXISTS zemory_vec_count(id INTEGER PRIMARY KEY)",
  vecCountPut: "INSERT OR IGNORE INTO zemory_vec_count(id) VALUES (?)",
  vecCountForget:
    "SELECT (SELECT COUNT(*) FROM vec_chunks WHERE rowid IN (SELECT rowid FROM vec_map WHERE message_id IN (SELECT id FROM zemory_vec_count)))" +
    " + (SELECT COUNT(*) FROM vec_chunks WHERE rowid IN (SELECT id FROM zemory_vec_count)) AS c",
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
  srcTableExists: "SELECT name FROM src.sqlite_master WHERE type='table' AND name=?",
  hasVecRowidsTable: "SELECT name FROM sqlite_master WHERE type='table' AND name='vec_chunks_rowids'",
  attachSrc: "ATTACH DATABASE ? AS src",
  detachSrc: "DETACH DATABASE src",

  // ── a borrowed browser cookie store (not the memory DB) ───────────────────
  countCookies: "SELECT COUNT(1) n FROM cookies",
} as const;
