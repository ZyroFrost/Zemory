// Agent mailbox between machines (plan/40): a letter is queued here, carried by the p2p channel (`mail` / `mailack`
// frames), and lands in the other machine's inbox, where `zemory msg wait` wakes the agent of the target repo.
//
// Why a store of its own and not the GM: HP 18 keeps the GM folder to `global_memory.db` alone, and mail is the
// MACHINE's state (what is queued, what is read), not memory. A delivered letter still reaches the GM the normal way:
// sending and reading are tool calls in a transcript. Second machine (02-1): the letters themselves are what crosses,
// over the channel; the box state is per machine on purpose.
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { hostname } from "node:os";
import { basename, dirname, join } from "node:path";
import Database from "better-sqlite3";
import { currentMemoryDir } from "./db.js";
import { redact } from "./redact.js";
import { Q } from "./store/queries.js";

export interface MailAddress {
  host: string;
  repo: string;
  title?: string;
}
export interface MailEnvelope {
  id: string;
  from: MailAddress & { session?: string };
  to: MailAddress;
  replyTo?: string;
  subject: string;
  body: string;
  sentAt: string;
}
export interface InboxRow {
  env: MailEnvelope;
  receivedAt: string;
  readAt: string | null;
}
export interface OutboxRow {
  env: MailEnvelope;
  queuedAt: string;
  ackedAt: string | null;
}

/** Read or delivered letters older than this are dropped when the store opens (plan/40 §7: 30 days). */
export const MAIL_KEEP_DAYS = 30;
/** A body over this is refused: mail carries instructions, not payloads (files are step ⑤, packages go by mirror). */
export const MAIL_MAX_BODY = 256 * 1024;

export function mailDbPath(machineDir = currentMemoryDir()): string {
  return join(machineDir, "mail", "mail.db");
}

/** Open (and create) the mail store. One short-lived connection per call: the CLI and the daemon both write here. */
export function openMail(path = mailDbPath()): Database.Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(Q.mailDdl);
  const cut = new Date(Date.now() - MAIL_KEEP_DAYS * 86_400_000).toISOString();
  db.prepare(Q.mailPruneInbox).run(cut);
  db.prepare(Q.mailPruneOutbox).run(cut);
  return db;
}

function withMail<T>(fn: (db: Database.Database) => T, path?: string): T {
  const db = openMail(path);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

type Row = { json: string; received_at: string; read_at: string | null };
const inboxRow = (r: Row): InboxRow => ({
  env: JSON.parse(r.json) as MailEnvelope,
  receivedAt: r.received_at,
  readAt: r.read_at,
});

/** Host names compare without case; a repo is its folder name, without case (`Zemory` = `zemory`). */
export const sameHost = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();
export const repoKey = (repoOrPath: string): string =>
  basename(repoOrPath.replace(/[\\/]+$/, "").replace(/\\/g, "/")).toLowerCase();

/** `<host>/<repo>[/<title>]` -> address. The title may hold slashes. */
export function parseAddress(s: string): MailAddress | null {
  const parts = s.trim().split("/");
  if (parts.length < 2 || !parts[0]?.trim() || !parts[1]?.trim()) return null;
  const title = parts.slice(2).join("/").trim();
  return {
    host: parts[0].trim(),
    repo: parts[1].trim(),
    ...(title ? { title } : {}),
  };
}

/** Queue a letter. The body is redacted BEFORE it is stored (HP 7): nothing credential-shaped ever leaves the machine. */
export function queueMail(
  o: {
    to: MailAddress;
    body: string;
    from: { repo: string; session?: string; title?: string };
    replyTo?: string;
    host?: string;
  },
  path?: string,
): MailEnvelope {
  const host = o.host ?? hostname();
  if (sameHost(o.to.host, host))
    throw new Error(
      `${o.to.host} is this machine - mail goes between machines; a session here is reached through Claude Code`,
    );
  const body = redact(o.body.replace(/\r\n/g, "\n")).trim();
  if (!body) throw new Error("the letter is empty");
  if (Buffer.byteLength(body, "utf8") > MAIL_MAX_BODY)
    throw new Error(
      `the letter is over ${MAIL_MAX_BODY / 1024} KB - send a path or a summary instead`,
    );
  const env: MailEnvelope = {
    id: randomUUID(),
    from: {
      host,
      repo: o.from.repo,
      ...(o.from.session ? { session: o.from.session } : {}),
      ...(o.from.title ? { title: o.from.title } : {}),
    },
    to: o.to,
    ...(o.replyTo ? { replyTo: o.replyTo } : {}),
    subject: body.split("\n")[0].slice(0, 120),
    body,
    sentAt: new Date().toISOString(),
  };
  withMail(
    (db) =>
      db
        .prepare(Q.mailQueue)
        .run(env.id, env.to.host, JSON.stringify(env), env.sentAt),
    path,
  );
  return env;
}

/**
 * A letter from the person at this machine's interface to an agent on THIS machine (plan/41 §6b, the project chat): no
 * channel to cross, so it lands straight in this inbox, where the hooks wake the target repo's session. Same shape and
 * redaction as `queueMail`.
 */
export function deliverHere(
  o: { to: MailAddress; body: string; from: { repo: string; title?: string }; replyTo?: string; host?: string },
  path?: string,
): MailEnvelope {
  const host = o.host ?? hostname();
  const body = redact(o.body.replace(/\r\n/g, "\n")).trim();
  if (!body) throw new Error("the letter is empty");
  if (Buffer.byteLength(body, "utf8") > MAIL_MAX_BODY) throw new Error(`the letter is over ${MAIL_MAX_BODY / 1024} KB`);
  const env: MailEnvelope = {
    id: randomUUID(),
    from: { host, repo: o.from.repo, ...(o.from.title ? { title: o.from.title } : {}) },
    to: { ...o.to, host },
    ...(o.replyTo ? { replyTo: o.replyTo } : {}),
    subject: body.split("\n")[0].slice(0, 120),
    body,
    sentAt: new Date().toISOString(),
  };
  receiveMail(env, host, path);
  return env;
}

/** Letters still owed to `peerHost` (no ack yet), oldest first. */
export function outgoingFor(
  peerHost: string,
  path?: string,
  limit = 50,
): MailEnvelope[] {
  return withMail(
    (db) =>
      (
        db.prepare(Q.mailOwed).all(limit * 4) as Array<{
          json: string;
          to_host: string;
        }>
      )
        .filter((r) => sameHost(r.to_host, peerHost))
        .slice(0, limit)
        .map((r) => JSON.parse(r.json) as MailEnvelope),
    path,
  );
}

/** The other machine confirmed it holds this letter. */
export function markAcked(id: string, path?: string): boolean {
  return withMail(
    (db) => db.prepare(Q.mailAck).run(new Date().toISOString(), id).changes > 0,
    path,
  );
}

/** Validate a letter that came over the wire - nothing in it is trusted. */
export function asEnvelope(x: unknown): MailEnvelope | null {
  const e = x as MailEnvelope;
  const str = (v: unknown, max: number): boolean =>
    typeof v === "string" && v.length > 0 && v.length <= max;
  if (
    !e ||
    typeof e !== "object" ||
    !str(e.id, 64) ||
    !str(e.body, MAIL_MAX_BODY) ||
    !str(e.sentAt, 40)
  )
    return null;
  if (
    !e.from ||
    !str(e.from.host, 64) ||
    !str(e.from.repo, 200) ||
    !e.to ||
    !str(e.to.host, 64) ||
    !str(e.to.repo, 200)
  )
    return null;
  if (e.replyTo !== undefined && !str(e.replyTo, 64)) return null;
  return {
    ...e,
    subject:
      typeof e.subject === "string"
        ? e.subject.slice(0, 120)
        : e.body.split("\n")[0].slice(0, 120),
  };
}

/** Store a letter from `fromHost`. A letter already held is kept as it is (idempotent by id) - the caller acks either way. */
export function receiveMail(
  env: MailEnvelope,
  fromHost: string,
  path?: string,
): boolean {
  return withMail(
    (db) =>
      db
        .prepare(Q.mailReceive)
        .run(
          env.id,
          fromHost,
          repoKey(env.to.repo),
          JSON.stringify(env),
          new Date().toISOString(),
        ).changes > 0,
    path,
  );
}

/** Unread letters for a repo (all repos when `repo` is empty), oldest first. */
export function unreadFor(repo: string, path?: string): InboxRow[] {
  return withMail(
    (db) =>
      (
        (repo
          ? db.prepare(Q.mailUnreadRepo).all(repoKey(repo))
          : db.prepare(Q.mailUnreadAll).all()) as Row[]
      ).map(inboxRow),
    path,
  );
}

/** One letter of the inbox by id (or id prefix), read or not. */
export function inboxLetter(id: string, path?: string): InboxRow | null {
  return withMail((db) => {
    const r = db.prepare(Q.mailLetter).get(id, `${id}%`) as Row | undefined;
    return r ? inboxRow(r) : null;
  }, path);
}

export function markRead(ids: string[], path?: string): number {
  if (!ids.length) return 0;
  return withMail((db) => {
    const st = db.prepare(Q.mailMarkRead);
    const at = new Date().toISOString();
    return db.transaction((xs: string[]) =>
      xs.reduce((n, x) => n + st.run(at, x).changes, 0),
    )(ids);
  }, path);
}

export function listInbox(limit = 30, path?: string): InboxRow[] {
  return withMail(
    (db) => (db.prepare(Q.mailInbox).all(limit) as Row[]).map(inboxRow),
    path,
  );
}

export function listOutbox(limit = 30, path?: string): OutboxRow[] {
  return withMail(
    (db) =>
      (
        db.prepare(Q.mailOutbox).all(limit) as Array<{
          json: string;
          queued_at: string;
          acked_at: string | null;
        }>
      ).map((r) => ({
        env: JSON.parse(r.json) as MailEnvelope,
        queuedAt: r.queued_at,
        ackedAt: r.acked_at,
      })),
    path,
  );
}

/** What the p2p session needs - kept here so the channel layer stays free of mail storage. Fail-open: mail never kills a sync. */
export interface MailHooks {
  outgoing: (peerHost: string) => MailEnvelope[];
  receive: (env: MailEnvelope, fromHost: string) => void;
  acked: (id: string) => void;
}
export function mailHooks(path?: string): MailHooks {
  return {
    outgoing: (h) => outgoingFor(h, path),
    receive: (env, from) => void receiveMail(env, from, path),
    acked: (id) => void markAcked(id, path),
  };
}
