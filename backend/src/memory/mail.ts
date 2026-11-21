// Agent mailbox between machines (plan/40): a letter is queued here, carried by the p2p channel (`mail` / `mailack`
// frames), and lands in the other machine's inbox, where `zemory msg wait` wakes the agent of the target repo.
//
// Why a store of its own and not the GM: HP 18 keeps the GM folder to `global_memory.db` alone, and mail is the
// MACHINE's state (what is queued, what is read), not memory. A delivered letter still reaches the GM the normal way:
// sending and reading are tool calls in a transcript. Second machine (02-1): the letters themselves are what crosses,
// over the channel; the box state is per machine on purpose.
import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { basename, dirname, join } from "node:path";
import Database from "better-sqlite3";
import { currentMemoryDir } from "./db.js";
import { redact } from "./redact.js";
import { markRepoBusy, markSessionBusy } from "./session-live.js";
import { letterToMemorySafe } from "./mail-gm.js";
import { Q } from "./store/queries.js";

export interface MailAddress {
  host: string;
  repo: string;
  title?: string;
  /** the agent session the letter is for (the project chat names it): its GM thread is mail:to:<session> (mail-gm.ts) */
  session?: string;
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
  // no pruning since 2026-11-20: this store is the SOURCE of every letter (its GM rows derive from it, mail-gm.ts), and a
  // source is kept like a transcript file is - pruning at 30 days made old letters unfindable
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
  if (sameHost(o.to.host, host)) {
    // the person at THIS machine's interface (the project chat, plan/41 §6b): an agent answers them here, so the letter
    // lands straight in this inbox where the chat room shows it - there is no channel to cross
    if (repoKey(o.to.repo) === "user") return deliverHere({ ...o, host }, path);
    throw new Error(
      `${o.to.host} is this machine - mail goes between machines; a session here is reached through Claude Code`,
    );
  }
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
  // the letter is a message of the GM too, so it travels with the GM's sync and stays findable (mail-gm.ts)
  if (!path) letterToMemorySafe(env);
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
  if (e.to.session !== undefined && !str(e.to.session, 128)) return null;
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
  // the repo's session is about to be woken by this letter, with no prompt hook to say so: mark it working (plan/41 §6b).
  // Only for the live store - a test's own mail file must not touch this machine's marks.
  if (!path) {
    markRepoBusy(repoKey(env.to.repo));
    // a letter for one session: that session's turn is followed live too, not only its repo's spinner
    if (env.to.session) markSessionBusy(env.to.session);
  }
  const fresh = withMail(
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
  if (fresh && !path) letterToMemorySafe(env);
  return fresh;
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

/**
 * Letters for a repo (all repos when empty) that landed after `sinceIso`, READ OR NOT. Measured 20/11 on both machines:
 * a leftover `msg watch` marked each letter read ~0.15 s after it landed, so a waiter asking for UNREAD letters never
 * woke and the session never saw the letter. What wakes a waiter is a letter arriving, not its read flag.
 */
export function landedSince(repo: string, sinceIso: string, path?: string): InboxRow[] {
  return withMail(
    (db) =>
      (
        (repo
          ? db.prepare(Q.mailLandedSinceRepo).all(sinceIso, repoKey(repo))
          : db.prepare(Q.mailLandedSinceAll).all(sinceIso)) as Row[]
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

// ── Waiters (user 20/11: "msg watch phải luôn tự bật cho mọi phiên") ─────────────────────────────────────────────────
// Only a background task wakes an IDLE session, and it wakes only the session that started it. Measured on the PC
// 20/11: a session with no waiter left two letters unread for about an hour, until the person typed. So every
// `msg wait`/`msg watch` started for a session registers here (one file per process, removed on exit), and the Stop hook
// asks "does THIS session still have a live waiter?" - a waiter that fired on a letter, or was reaped for low memory,
// is gone, and the hook has the agent arm a new one.
export interface Waiter {
  pid: number;
  repo: string;
  session: string;
  startedAt: string;
}

export function waitersDir(machineDir = currentMemoryDir()): string {
  return join(machineDir, "mail", "waiters");
}

const safe = (s: string): string => s.replace(/[^\w.-]/g, "_").slice(0, 80) || "_";

export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Record this process as a waiter for `session` (and `repo`); the file goes when the process exits. */
export function registerWaiter(repo: string, session: string, dir = waitersDir()): string {
  mkdirSync(dir, { recursive: true });
  const w: Waiter = { pid: process.pid, repo: repoKey(repo || ""), session, startedAt: new Date().toISOString() };
  const file = join(dir, `${safe(session || "nosession")}.${process.pid}.json`);
  writeFileSync(file, JSON.stringify(w));
  if (session) writeFileSync(join(dir, `${safe(session)}.last`), w.startedAt);
  const drop = (): void => {
    try {
      rmSync(file, { force: true });
    } catch {
      /* the next reader drops a dead pid's file */
    }
  };
  process.once("exit", drop);
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.once(sig, () => (drop(), process.exit(130)));
  return file;
}

/** The live waiters (a dead pid's file is removed on the way). */
export function liveWaiters(dir = waitersDir()): Waiter[] {
  let names: string[];
  try {
    names = readdirSync(dir).filter((n) => n.endsWith(".json"));
  } catch {
    return [];
  }
  const out: Waiter[] = [];
  for (const n of names) {
    const file = join(dir, n);
    try {
      const w = JSON.parse(readFileSync(file, "utf8")) as Waiter;
      if (Number.isInteger(w.pid) && pidAlive(w.pid)) out.push(w);
      else rmSync(file, { force: true });
    } catch {
      /* half-written or gone: skip */
    }
  }
  return out;
}

/** Does `session` have a live waiter that covers `repo` (its own repo, or every repo)? */
export function sessionHasWaiter(session: string, repo: string, dir = waitersDir()): boolean {
  const key = repoKey(repo);
  return liveWaiters(dir).some((w) => w.session === session && (!w.repo || w.repo === key));
}

/** When `session` last started a waiter (kept after the waiter exits), or "" - the Stop hook's "was it re-armed?". */
export function lastWaiterStart(session: string, dir = waitersDir()): string {
  try {
    return readFileSync(join(dir, `${safe(session)}.last`), "utf8").trim();
  } catch {
    return "";
  }
}

/** The command the hooks hand to the agent: a background waiter bound to this session. */
export function waiterCommand(session: string): string {
  return `zemory msg wait --timeout 0 --session ${session}`;
}
