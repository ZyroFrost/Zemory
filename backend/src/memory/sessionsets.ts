// The two-machine sync acceptance (plan/24 §6, user 25/10): compare the SET of sessions each store holds, not totals per
// host. A conversation captured on two machines carries one id, and each store keeps the host of whichever copy arrived
// first, so per-host counts never agree while the sets do. Each source yields a fingerprint of its session ids and one of
// (id, message count): equal ids = the same sessions; equal contents = their messages have arrived too.
import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import { currentMemoryDb } from "./db.js";
import { Q } from "./store/queries.js";

export interface SessionSet {
  source: string;
  sessions: number;
  messages: number;
  ids: string;
  contents: string;
}

const fp = (h: ReturnType<typeof createHash>): string => h.digest("hex").slice(0, 12);

/** One row per source plus `(all)` first; read-only, one pass over `sessions`. */
export function sessionSets(dbPath: string = currentMemoryDb()): SessionSet[] {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const rows = db.prepare(Q.sessionSetRows).all() as { source: string; id: string; n: number | null }[];
    const by = new Map<string, { sessions: number; messages: number; ids: ReturnType<typeof createHash>; contents: ReturnType<typeof createHash> }>();
    const slot = (k: string) => {
      let s = by.get(k);
      if (!s) by.set(k, (s = { sessions: 0, messages: 0, ids: createHash("sha256"), contents: createHash("sha256") }));
      return s;
    };
    for (const r of rows) {
      for (const k of ["(all)", r.source]) {
        const s = slot(k);
        s.sessions++;
        s.messages += r.n ?? 0;
        s.ids.update(`${r.id}\n`);
        s.contents.update(`${r.id}\t${r.n ?? 0}\n`);
      }
    }
    return [...by].map(([source, s]) => ({ source, sessions: s.sessions, messages: s.messages, ids: fp(s.ids), contents: fp(s.contents) }));
  } finally {
    db.close();
  }
}
