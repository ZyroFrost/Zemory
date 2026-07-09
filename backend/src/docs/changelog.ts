// Changelog in the DB (log shape). Entries are dated rows; archive becomes a
// query (full history stays queryable, render shows active ones). Source = DB;
// .md (04_CHANGES) is a render. import = one-time seed from existing markdown.

import { readFileSync, writeFileSync } from "node:fs";
import { BRAIN_DB, openBrain } from "../brain/db.js";

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

/** Split a changelog markdown into dated entries (one per `## ` heading). */
export function parseChangelog(text: string): ChEntry[] {
  const lines = text.split("\n");
  const offsets: number[] = [];
  let off = 0;
  for (const l of lines) {
    offsets.push(off);
    off += l.length + 1;
  }
  let inFence = false;
  const heads: { idx: number; h: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = H2.exec(lines[i]);
    if (m) heads.push({ idx: i, h: m[1] });
  }
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

export function importChangelog(absPath: string, projectRoot: string, dbPath = BRAIN_DB): number {
  const entries = parseChangelog(readFileSync(absPath, "utf8"));
  const db = openBrain(dbPath);
  try {
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM changelog WHERE project_root=?").run(projectRoot);
      const ins = db.prepare(
        "INSERT INTO changelog (project_root, date, title, body, created_at) VALUES (?,?,?,?,?)",
      );
      const now = new Date().toISOString();
      for (const e of entries) ins.run(projectRoot, e.date, e.title, e.body, now);
      return entries.length;
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
  dbPath = BRAIN_DB,
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
  dbPath = BRAIN_DB,
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

export function listEntries(projectRoot: string, dbPath = BRAIN_DB): ChRow[] {
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
  const db = openBrain(opts.dbPath ?? BRAIN_DB);
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
  "<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory changelog add` -->\n# Change Log\n\n> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.\n\n---\n\n";

/** Render the active changelog (archived=0) back to a .md file (db → md). */
export function renderChangelog(projectRoot: string, outAbsPath: string, dbPath = BRAIN_DB): number {
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
    writeFileSync(outAbsPath, md);
    return rows.length;
  } finally {
    db.close();
  }
}
