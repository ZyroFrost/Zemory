/**
 * SQL for the attachment surfaces whose shape depends on the call (a list of ids, optional filters) - assembled here, in
 * the store, so the call sites name a query instead of writing one (02_RULES `02-25`). Fixed queries live in queries.ts.
 */

/** The attachments linked to `n` messages, with whether the db holds their bytes. One `?` per message id. */
export function attachmentsOfMessagesSql(n: number): string {
  const marks = Array.from({ length: Math.max(1, n) }, () => "?").join(",");
  return `SELECT al.message_id AS mid, a.sha256, a.name, a.mime, a.bytes, a.kind, (a.blob IS NOT NULL) AS hasBlob
            FROM attachment_link al JOIN attachment a ON a.id = al.attachment_id
           WHERE al.message_id IN (${marks})`;
}

/** Every attachment, one row each (a file linked to several messages takes the earliest), narrowed by `where`
 *  (`s.id = ?` · `s.project_root = ?` · a name match - the caller passes the values in the same order). */
export function listFilesSql(where: Array<"session" | "project" | "name">): string {
  const parts = where.map((w) => (w === "session" ? "s.id = ?" : w === "project" ? "s.project_root = ?" : "LOWER(COALESCE(a.name, '')) LIKE ?"));
  return `SELECT a.id, a.sha256, a.name, a.mime, a.bytes, a.kind, (a.blob IS NOT NULL) AS hasBlob,
                 MIN(m.timestamp) AS at, MIN(m.id) AS messageId,
                 MIN(s.id) AS sessionId, MIN(s.source) AS source, MIN(s.project_root) AS projectRoot
            FROM attachment a
            LEFT JOIN attachment_link al ON al.attachment_id = a.id
            LEFT JOIN messages m ON m.id = al.message_id
            LEFT JOIN sessions s ON s.id = m.session_id
            ${parts.length ? `WHERE ${parts.join(" AND ")}` : ""}
           GROUP BY a.id`;
}
