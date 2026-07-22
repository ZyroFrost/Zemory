// Changelog INDEX — the .md (06_CHANGES.md) is the SOURCE (FILE WINS); the DB
// changelog rows are a DERIVED, read-only search index rebuilt from the .md by
// `reindex`. Nothing here writes the .md — entries are added by editing the file
// directly; `import` (reindex) reseeds the search index from it.

import { readFileSync } from "node:fs";
import { currentMemoryDb, openMemory } from "../memory/db.js";

const FENCE = /^[ \t]*(```|~~~)/;
const H2 = /^## (.*?)[ \t]*$/;
const DATE = /^\[([^\]]+)\][ \t]*[—-]*[ \t]*(.*)$/;

export interface ChEntry {
  date: string | null;
  title: string;
  body: string;
}

/** Split a changelog markdown into dated entries (one per `## ` heading).
 *  CRLF-safe: see the normEol guard in markdown.ts — a Windows-written file
 *  used to parse as ZERO entries here. */
export function parseChangelog(input: string): ChEntry[] {
  const text = input.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const offsets: number[] = [];
  let off = 0;
  for (const l of lines) {
    offsets.push(off);
    off += l.length + 1;
  }
  let inFence = false;
  const all: { idx: number; h: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = H2.exec(lines[i]);
    if (m) all.push({ idx: i, h: m[1] });
  }
  // An entry head is `## [<date>] — title`. A bare `## Foo` inside a body is body
  // text, not a new entry. Fallback: a changelog with NO dated head is legacy —
  // keep the old behaviour so `import` can still seed it.
  const dated = all.filter((x) => DATE.test(x.h));
  const heads = dated.length > 0 ? dated : all;
  const entries: ChEntry[] = [];
  for (let k = 0; k < heads.length; k++) {
    const start = offsets[heads[k].idx];
    const end = k + 1 < heads.length ? offsets[heads[k + 1].idx] : text.length;
    const block = text.slice(start, end);
    const nl = block.indexOf("\n");
    const body = (nl < 0 ? "" : block.slice(nl + 1)).replace(/\s+$/, "");
    const dm = DATE.exec(heads[k].h);
    entries.push({ date: dm ? dm[1] : null, title: dm ? dm[2] : heads[k].h, body });
  }
  return entries;
}

/** Reindex a changelog .md into the DB search index (read-only; never writes the
 *  file). Default MERGE (add entries the index lacks, by date+title); `replace`
 *  wipes this project's changelog rows and reseeds — used by `reindex` so the
 *  index mirrors the file exactly (FILE WINS). */
export function importChangelog(
  absPath: string,
  projectRoot: string,
  dbPath = currentMemoryDb(),
  opts: { replace?: boolean } = {},
): number {
  const entries = parseChangelog(readFileSync(absPath, "utf8"));
  const db = openMemory(dbPath);
  try {
    const tx = db.transaction(() => {
      if (opts.replace) db.prepare("DELETE FROM changelog WHERE project_root=?").run(projectRoot);
      const exists = db.prepare(
        "SELECT 1 AS ok FROM changelog WHERE project_root=? AND date IS ? AND title=?",
      );
      const ins = db.prepare(
        "INSERT INTO changelog (project_root, date, title, body, created_at) VALUES (?,?,?,?,?)",
      );
      const now = new Date().toISOString();
      let added = 0;
      for (const e of entries) {
        if (!opts.replace && exists.get(projectRoot, e.date, e.title)) continue;
        ins.run(projectRoot, e.date, e.title, e.body, now);
        added++;
      }
      return added;
    });
    return tx();
  } finally {
    db.close();
  }
}

export interface ChRow {
  id: number;
  date: string | null;
  title: string;
  archived: number;
  supersedes_id: number | null;
}

export function listEntries(projectRoot: string, dbPath = currentMemoryDb()): ChRow[] {
  const db = openMemory(dbPath);
  try {
    return db
      .prepare(
        "SELECT id, date, title, archived, supersedes_id FROM changelog WHERE project_root=? ORDER BY date DESC, id DESC",
      )
      .all(projectRoot) as ChRow[];
  } finally {
    db.close();
  }
}

export function searchChangelog(query: string, opts: { project?: string; limit?: number; dbPath?: string } = {}): { id: number; date: string | null; title: string; snippet: string }[] {
  const q = query.trim();
  if (!q) return [];
  const db = openMemory(opts.dbPath ?? currentMemoryDb());
  try {
    const terms = q.toLowerCase().split(/\s+/).map((t) => t.replace(/["()*:^]/g, "")).filter(Boolean);
    if (!terms.length) return [];
    const match = terms.map((t) => `"${t}"`).join(" ");
    try {
      return db
        .prepare(
          `SELECT c.id, c.date, c.title, snippet(changelog_fts, 1, '[', ']', '…', 12) AS snippet
           FROM changelog_fts f JOIN changelog c ON c.id=f.rowid
           ${opts.project ? "WHERE c.project_root=@proj AND" : "WHERE"} changelog_fts MATCH @m
           ORDER BY bm25(changelog_fts, 5.0, 1.0) LIMIT @lim`,
        )
        .all({ proj: opts.project, m: match, lim: opts.limit ?? 10 }) as any;
    } catch {
      return [];
    }
  } finally {
    db.close();
  }
}
