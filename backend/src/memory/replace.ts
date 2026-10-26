// A session replaced whole at its origin is replaced on the other machines too (owner's rule 2026-10-26: the machine a session
// was born on keeps the copy). Before this, a re-ingest with a new parser re-inserted every line under new ids, the delta
// shipped them, and the receiver - merging additively - kept both versions: 272 stale codex lines on the second machine.
//
// Origin: at a whole replace, `recordReplace` writes the content key of every message the session now holds. The delta
// carries that row (`shipReplaces`). Receiver: `receiveReplaces` queues it for a session it is not the origin of, and
// `applyReplaces` drops, once EVERY listed message has arrived, the rows outside the list - never a row newer than the newest
// listed one (a line appended after the replace stays). A queue entry whose messages are still on their way waits.
import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import { Q } from "./store/queries.js";

type Db = Database.Database;
type Row = { id: number; role: string | null; timestamp: string | null; content: string | null };

/** The identity of a message across machines: the merge key of uuid-less lines (role, timestamp, content). */
export function contentKey(r: { role: string | null; timestamp: string | null; content: string | null }): string {
  return createHash("sha256").update(`${r.role ?? ""}|${r.timestamp ?? ""}|${r.content ?? ""}`).digest("hex").slice(0, 16);
}

/** Origin side, right after a whole replace: the session's content keys and its newest timestamp. */
export function recordReplace(db: Db, sessionId: string): void {
  const rows = db.prepare(Q.sessionContentRows).all(sessionId) as Row[];
  if (!rows.length) return;
  const keys = [...new Set(rows.map(contentKey))].sort().join(",");
  const maxTs = rows.reduce<string>((m, r) => ((r.timestamp ?? "") > m ? (r.timestamp ?? "") : m), "");
  db.prepare(Q.sessionReplacedUpsert).run(sessionId, keys, maxTs || null, new Date().toISOString());
}

/** Export side: the replace rows of the sessions this bundle carries (`src` = the live store, `main` = the bundle). */
export function shipReplaces(db: Db): number {
  if (!db.prepare(Q.srcTableExists).get("session_replaced")) return 0;
  db.exec(Q.replaceShipDdl);
  return db.prepare(Q.replaceShip).run().changes;
}

/** Receive side: queue the incoming replaces of sessions this machine is not the origin of. */
export function receiveReplaces(db: Db, ownHost: string): number {
  if (!db.prepare(Q.srcTableExists).get("session_replaced")) return 0;
  const rows = db.prepare(Q.replaceIncoming).all() as { session_id: string; keys: string; max_ts: string | null; at: string; host: string | null; origin: string | null }[];
  let queued = 0;
  for (const r of rows) {
    if (r.origin === "web") continue; // web: the web is the origin and the bigger copy wins (plan/24 §14) - never drop lines
    if (!r.host || r.host === ownHost || r.host === "unknown") continue; // this machine is the origin (or cannot tell): it keeps its copy
    queued += db.prepare(Q.replacePendingUpsert).run(r.session_id, r.keys, r.max_ts, r.at).changes;
  }
  return queued;
}

/**
 * Receive side, before `applyReplaces`: a line the origin rewrote under the SAME uuid. The merge inserts with
 * INSERT OR IGNORE, so the receiver keeps its old text and the replace would wait forever for a key that never arrives.
 * Measured 2026-10-26: three chatgpt-web sessions, every line with a uuid, held cut at 4000 characters on one machine
 * and whole on the other. An incoming line whose text the replace lists wins; returns the ids whose text changed
 * (their vectors are stale and go after). `src` = the bundle being merged.
 */
export function followReplacedText(db: Db): number[] {
  const changed: number[] = [];
  const hasDigest = !!db.prepare(Q.tableExists).get("session_digest");
  for (const p of db.prepare(Q.replacePendingAll).all() as { session_id: string; keys: string }[]) {
    const keep = new Set(p.keys.split(","));
    let touched = false;
    const incoming = db.prepare(Q.replaceIncomingUuidRows).all(p.session_id) as (Row & { uuid: string; tool_name: string | null })[];
    for (const r of incoming) {
      if (!keep.has(contentKey(r))) continue;
      const cur = db.prepare(Q.messageBySessionUuid).get(p.session_id, r.uuid) as Row | undefined;
      if (!cur || contentKey(cur) === contentKey(r)) continue;
      db.prepare(Q.messageTextUpdate).run(r.role, r.content, r.tool_name, r.timestamp, cur.id);
      changed.push(cur.id);
      touched = true;
    }
    if (touched && hasDigest) db.prepare(Q.deleteSessionDigest).run(p.session_id);
  }
  return changed;
}

/**
 * The machine holding the right copy of a session sends it again: every row written again under a new id (attachments
 * follow their message), then the replace recorded, so the next delta carries the rows and the list and every other
 * machine takes this copy. Reads nothing from the source file - the copy in the store is the one meant. Returns the
 * old ids (their vectors go; the new rows are embedded again).
 */
export function reshipSession(db: Db, sessionId: string): number[] {
  const rows = db.prepare(Q.reshipSessionRows).all(sessionId) as (Row & { uuid: string | null; tool_name: string | null })[];
  if (!rows.length) return [];
  const links = db.prepare(Q.reshipLinkRows).all(sessionId) as { message_id: number; attachment_id: number; name: string | null }[];
  db.prepare(Q.deleteSessionMessages).run(sessionId);
  const moved = new Map<number, number>();
  for (const r of rows) {
    const info = db.prepare(Q.reshipInsertRow).run(sessionId, r.uuid, r.role, r.content, r.tool_name, r.timestamp);
    moved.set(r.id, Number(info.lastInsertRowid));
  }
  for (const l of links) {
    db.prepare(Q.reshipLinkDelete).run(l.message_id);
    db.prepare(Q.reshipLinkInsert).run(moved.get(l.message_id), l.attachment_id, l.name);
  }
  for (const [from, to] of moved) db.prepare(Q.reshipAttachmentMove).run(to, from);
  recordReplace(db, sessionId);
  return rows.map((r) => r.id);
}

/** Apply every queued replace whose messages have all arrived; returns the ids of the rows dropped (their vectors go after). */
export function applyReplaces(db: Db): number[] {
  const dropped: number[] = [];
  const hasDigest = !!db.prepare(Q.tableExists).get("session_digest");
  for (const p of db.prepare(Q.replacePendingAll).all() as { session_id: string; keys: string; max_ts: string | null }[]) {
    const keep = new Set(p.keys.split(","));
    const rows = db.prepare(Q.sessionContentRows).all(p.session_id) as Row[];
    const have = new Set(rows.map(contentKey));
    if ([...keep].some((k) => !have.has(k))) continue; // still on its way: wait for the next block
    const drop = rows.filter((r) => !keep.has(contentKey(r)) && (p.max_ts === null || (r.timestamp ?? "") <= p.max_ts));
    for (const r of drop) db.prepare(Q.deleteMessageById).run(r.id);
    if (drop.length && hasDigest) db.prepare(Q.deleteSessionDigest).run(p.session_id);
    if (drop.length) db.prepare(Q.refreshSessionStats).run({ id: p.session_id });
    db.prepare(Q.replacePendingDelete).run(p.session_id);
    dropped.push(...drop.map((r) => r.id));
  }
  return dropped;
}
