// Letters between machines live in the GM like every other message (user 2026-11-20: a letter is a message, it belongs
// in the GM and travels with the GM's sync). Measured the same day: a letter the session never printed (read by a
// leftover process) existed only in data/mail/mail.db, which dropped it after 30 days - not findable.
//
// HP article 3: one source per layer. The mail store is the SOURCE of a letter (as a transcript file is of a session) and
// is kept for good; the GM rows are derived from it and rebuilt by `mailBackfill` at any time. The GM rows then travel
// with the GM's own sync to every machine; the `mail` frame stays only as the fast lane that wakes the other side.
//
// One thread per pair of endpoints (host/repo, sorted), so both machines write the SAME session id, and the letter id is
// the message uuid: the GM merge's UNIQUE(session_id, uuid) keeps one copy whichever side wrote it first.
import { basename } from "node:path";
import { hostname } from "node:os";
import { currentMemoryDb, openMemory } from "./db.js";
import { writeSession } from "./ingest.js";
import { mailDbPath, openMail, repoKey, sameHost, type MailEnvelope } from "./mail.js";
import { Q } from "./store/queries.js";

/** The `sessions.source` of a mail thread: not a working session (the Chat tab does not list it as one). */
export const MAIL_SOURCE = "zemory-mail";

const end = (a: { host: string; repo: string }): string => `${a.host.toLowerCase()}/${repoKey(a.repo)}`;

/** The GM thread of the letters written to one agent session (the project chat, from the desktop or a phone). */
export const sessionMailThread = (session: string): string => `mail:to:${session}`;

/**
 * The thread a letter belongs to - the same id on both machines, whichever way the letter went: a letter to a session
 * files under that session (user 2026-11-20: a message from the phone sits in the GM with the session it was written
 * to), any other one under its pair of endpoints.
 */
export function mailThreadId(env: MailEnvelope): string {
  if (env.to.session) return sessionMailThread(env.to.session);
  const [a, b] = [end(env.from), end(env.to)].sort();
  return `mail:${a}~${b}`;
}

/** The text a letter is stored as: who -> who, its id (searchable by its first 8 characters), then the body. */
export function letterText(env: MailEnvelope): string {
  const head =
    `✉ ${env.from.host}/${env.from.repo} → ${env.to.host}/${env.to.repo} · letter ${env.id.slice(0, 8)}` +
    (env.replyTo ? ` · reply to ${env.replyTo.slice(0, 8)}` : "");
  return `${head}\n\n${env.body}`;
}

/** The project folder of this machine's end of the thread (its repo's newest project_root), or null. */
function localProject(db: ReturnType<typeof openMemory>, env: MailEnvelope, host: string): string | null {
  const mine = sameHost(env.to.host, host) ? env.to : sameHost(env.from.host, host) ? env.from : null;
  const repo = mine ? repoKey(mine.repo) : "";
  if (!repo || repo === "user") return null;
  const rows = db.prepare(Q.projectRootsLike).all(`%${repo}`) as { root: string }[];
  return rows.map((r) => r.root).find((r) => repoKey(basename(r.replace(/[\\/]+$/, ""))) === repo) ?? null;
}

/** Write letters into the GM (idempotent by letter id). Returns how many were new. */
export function lettersToMemory(envs: MailEnvelope[], dbPath: string = currentMemoryDb(), host = hostname()): number {
  if (!envs.length) return 0;
  const db = openMemory(dbPath);
  try {
    const threads = new Map<string, MailEnvelope[]>();
    for (const e of envs) {
      const t = mailThreadId(e);
      threads.set(t, [...(threads.get(t) ?? []), e]);
    }
    let added = 0;
    db.transaction(() => {
      for (const [id, list] of threads) {
        const first = list[0];
        const [a, b] = [end(first.from), end(first.to)].sort();
        const project = localProject(db, first, host);
        const title = first.to.session ? `Mail -> session ${first.to.session.slice(0, 8)}` : `Mail ${a} ↔ ${b}`;
        added += writeSession(db, {
          sessionId: id,
          source: MAIL_SOURCE,
          origin: "local",
          ...(project ? { project, cwd: project } : {}),
          title,
          msgs: list.map((e) => ({ uuid: e.id, role: "user", content: letterText(e), tool: null, ts: e.sentAt })),
          wholeReplace: false,
        });
      }
    })();
    return added;
  } finally {
    db.close();
  }
}

/** One letter into the GM, never failing the caller (fail-open, HP article 9): mail delivery must not hang on the GM. */
export function letterToMemorySafe(env: MailEnvelope): void {
  try {
    lettersToMemory([env]);
  } catch {
    /* the backfill picks it up next time */
  }
}

/** Every letter of this machine's mail store into the GM - rebuilds the derived rows from their source. */
export function mailBackfill(mailPath = mailDbPath(), dbPath: string = currentMemoryDb()): { letters: number; added: number } {
  const m = openMail(mailPath);
  let envs: MailEnvelope[];
  try {
    envs = [...(m.prepare(Q.mailAllInbox).all() as { json: string }[]), ...(m.prepare(Q.mailAllOutbox).all() as { json: string }[])]
      .map((r) => JSON.parse(r.json) as MailEnvelope);
  } finally {
    m.close();
  }
  const seen = new Set<string>();
  const unique = envs.filter((e) => !seen.has(e.id) && !!seen.add(e.id));
  return { letters: unique.length, added: lettersToMemory(unique, dbPath) };
}
