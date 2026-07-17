// Changelog in the DB (log shape). Entries are dated rows; archive becomes a
// query (full history stays queryable, render shows active ones). Source = DB;
// .md (05_CHANGES) is a render. import = one-time seed from existing markdown.

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { currentBrainDb, openBrain } from "../brain/db.js";

const FENCE = /^[ \t]*(```|~~~)/;
const H2 = /^## (.*?)[ \t]*$/;
const DATE = /^\[([^\]]+)\][ \t]*[—-]*[ \t]*(.*)$/;

export interface ChEntry {
  date: string | null;
  title: string;
  body: string;
}

function localDate(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Split a changelog markdown into dated entries (one per `## ` heading).
 *  CRLF-safe: see the normEol guard in markdown.ts — a Windows-written file
 *  used to parse as ZERO entries here, so `import` said "merged 0" while the
 *  .md was full, and the render-salvage guard saw nothing to protect. */
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
  // An entry head is `## [<date>] — title` (the documented format). A bare
  // `## Foo` INSIDE a body is body text, not a new entry — treating every H2 as
  // a boundary shredded any entry whose body had sub-headings into phantom
  // dateless entries (harmless under the old "DB is source" rule, but FILE WINS
  // re-imports on every sync, so each one became junk in the DB).
  // Fallback: a changelog with NO dated head at all is a hand-written/legacy
  // one — keep the old behaviour so `import` can still seed it.
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

export function importChangelog(
  absPath: string,
  projectRoot: string,
  dbPath = currentBrainDb(),
  opts: { replace?: boolean } = {},
): number {
  const entries = parseChangelog(readFileSync(absPath, "utf8"));
  const db = openBrain(dbPath);
  try {
    const tx = db.transaction(() => {
      // Default = MERGE: only add entries the DB doesn't have yet (matched on
      // date+title). A re-import must never renumber ids or wipe archived/
      // supersedes state — those exist only in the DB, not in the rendered .md.
      // `replace` keeps the old wipe-and-reseed for a deliberate one-time seed.
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

export function addEntry(
  projectRoot: string,
  title: string,
  body: string,
  date?: string,
  dbPath = currentBrainDb(),
  supersedesId?: number,
): number {
  const db = openBrain(dbPath);
  try {
    if (supersedesId) {
      const target = db
        .prepare("SELECT 1 AS ok FROM changelog WHERE id=? AND project_root=?")
        .get(supersedesId, projectRoot) as { ok: number } | undefined;
      if (!target) throw new Error(`Cannot supersede changelog #${supersedesId} from another project.`);
    }
    const d = date ?? localDate();
    return Number(
      db
        .prepare(
          "INSERT INTO changelog (project_root, date, title, body, supersedes_id, created_at) VALUES (?,?,?,?,?,?)",
        )
        .run(projectRoot, d, title, body, supersedesId ?? null, new Date().toISOString()).lastInsertRowid,
    );
  } finally {
    db.close();
  }
}

/** Correct an entry date without allowing cross-project mutation. */
export function setEntryDate(
  projectRoot: string,
  id: number,
  date: string,
  dbPath = currentBrainDb(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const db = openBrain(dbPath);
  try {
    return (
      db.prepare("UPDATE changelog SET date=? WHERE id=? AND project_root=?").run(date, id, projectRoot)
        .changes === 1
    );
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

export function listEntries(projectRoot: string, dbPath = currentBrainDb()): ChRow[] {
  const db = openBrain(dbPath);
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
  const db = openBrain(opts.dbPath ?? currentBrainDb());
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

const CH_HEADER =
  "<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->\n# Change Log\n\n> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.\n\n---\n\n";

/** Render the active changelog (archived=0) back to a .md file (db → md). */
export function renderChangelog(projectRoot: string, outAbsPath: string, dbPath = currentBrainDb()): number {
  const db = openBrain(dbPath);
  try {
    const rows = db
      .prepare(
        "SELECT date, title, body, supersedes_id FROM changelog WHERE project_root=? AND archived=0 ORDER BY date DESC, id DESC",
      )
      .all(projectRoot) as {
      date: string | null;
      title: string;
      body: string;
      supersedes_id: number | null;
    }[];
    const parts = rows.map((r) => {
      const head = r.date ? `## [${r.date}] — ${r.title}` : `## ${r.title}`;
      const relation = r.supersedes_id ? `> 🔄 Supersedes changelog #${r.supersedes_id}.\n\n` : "";
      return `${head}\n\n${relation}${r.body}\n`;
    });
    const md = CH_HEADER + parts.join("\n");
    // FILE WINS: before overwriting, salvage the on-disk file iff it holds
    // entries the DB does NOT have (by date+title) — those would otherwise be
    // silently lost. (The old header-only check clobbered hand-edits that
    // kept the GENERATED header; a differs-at-all check would .bak-spam on
    // every routine `changelog add`, since a fresh render always differs.)
    if (existsSync(outAbsPath)) {
      const current = readFileSync(outAbsPath, "utf8");
      if (current !== md) {
        const known = db.prepare("SELECT 1 AS ok FROM changelog WHERE project_root=? AND date IS ? AND title=?");
        const unmerged = parseChangelog(current).filter((e) => !known.get(projectRoot, e.date, e.title));
        if (unmerged.length > 0) {
          const bak = `${outAbsPath}.hand-edited-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
          copyFileSync(outAbsPath, bak);
          console.error(
            `zemory: changelog file holds ${unmerged.length} entr(ies) not in the DB — saved to ${bak}. ` +
              "FILE WINS: run `zemory docs sync` (or `changelog import`) to merge them, then render.",
          );
        }
      }
    }
    writeFileSync(outAbsPath, md);
    return rows.length;
  } finally {
    db.close();
  }
}
