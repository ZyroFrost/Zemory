// Plan/docs INDEX — the .md FILE is the SOURCE (FILE WINS); the DB doc/section
// rows are a DERIVED, READ-ONLY search index, rebuilt from .md by `reindex`.
// Nothing here writes back to .md — agents edit .md directly and reindex to
// refresh search. Search is FTS over sections (heading-weighted).

import { readFileSync } from "node:fs";
import { isAbsolute, normalize, relative, resolve } from "node:path";
import { type MemoryDB, currentMemoryDb, openMemory } from "../memory/db.js";
import { parseMarkdown, roundTripOk } from "./markdown.js";

export interface ImportResult {
  path: string;
  docId: number;
  sections: number;
  /** File parses+re-renders identically (a clean-structure lint signal). */
  roundTrip: boolean;
}

function upsertDoc(db: MemoryDB, projectRoot: string, relPath: string, kind: string): number {
  const canonicalPath = normalize(relPath);
  db.prepare(
    `INSERT INTO doc (project_root, path, kind) VALUES (?, ?, ?)
     ON CONFLICT(project_root, path) DO UPDATE SET kind = excluded.kind`,
  ).run(projectRoot, canonicalPath, kind);
  return (
    db.prepare("SELECT id FROM doc WHERE project_root=? AND path=?").get(projectRoot, canonicalPath) as {
      id: number;
    }
  ).id;
}

function replaceSections(db: MemoryDB, docId: number, text: string): number {
  const sections = parseMarkdown(text);
  db.prepare("DELETE FROM section WHERE doc_id=?").run(docId);
  const ins = db.prepare(
    "INSERT INTO section (doc_id, ordinal, level, parent_id, heading, anchor, body) VALUES (?,?,?,?,?,?,?)",
  );
  const stack: { level: number; id: number }[] = [];
  for (const s of sections) {
    let parent: number | null = null;
    if (s.level > 0) {
      while (stack.length && stack[stack.length - 1].level >= s.level) stack.pop();
      parent = stack.length ? stack[stack.length - 1].id : null;
    }
    const id = Number(ins.run(docId, s.ordinal, s.level, parent, s.heading, s.anchor, s.body).lastInsertRowid);
    if (s.level > 0) stack.push({ level: s.level, id });
  }
  return sections.length;
}

/** Reindex ONE markdown file into the DB search index (read-only; never writes
 *  the file). The .md is the source; this only refreshes the derived index. */
export function importDoc(absPath: string, relPath: string, projectRoot: string, kind = "plan", dbPath = currentMemoryDb()): ImportResult {
  // Strip any prior GENERATED header (legacy renders) so it is not indexed as body.
  const text = readFileSync(absPath, "utf8").replace(/^<!-- GENERATED[^\n]*-->\r?\n/, "");
  const roundTrip = roundTripOk(text);
  const db = openMemory(dbPath);
  try {
    const tx = db.transaction(() => {
      const docId = upsertDoc(db, projectRoot, relPath, kind);
      const n = replaceSections(db, docId, text);
      return { docId, n };
    });
    const { docId, n } = tx();
    return { path: relPath, docId, sections: n, roundTrip };
  } finally {
    db.close();
  }
}

/** Resolve a docs-relative path, rejecting anything that escapes `docs/`. */
export function resolveDocPath(projectRoot: string, docPath: string): string {
  const docsRoot = resolve(projectRoot, "docs");
  const abs = resolve(projectRoot, docPath);
  const rel = relative(docsRoot, abs);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return abs;
  throw new Error(`Unsafe docs path: ${docPath}`);
}

export interface DocRow {
  id: number;
  path: string;
  kind: string;
  sections: number;
}

export function listDocs(projectRoot: string, dbPath = currentMemoryDb()): DocRow[] {
  const db = openMemory(dbPath);
  try {
    return db
      .prepare(
        `SELECT d.id, d.path, d.kind, COUNT(s.id) AS sections
         FROM doc d LEFT JOIN section s ON s.doc_id=d.id
         WHERE d.project_root=? GROUP BY d.id ORDER BY d.kind, d.path`,
      )
      .all(projectRoot) as DocRow[];
  } finally {
    db.close();
  }
}

export interface TocRow {
  id: number;
  level: number;
  heading: string | null;
  anchor: string | null;
}

/** Table of contents (derived) for a doc — query, not a stored index file. */
export function listToc(docPath: string, projectRoot: string, dbPath = currentMemoryDb()): TocRow[] {
  const db = openMemory(dbPath);
  try {
    const doc = db.prepare("SELECT id FROM doc WHERE project_root=? AND path=?").get(projectRoot, docPath) as { id: number } | undefined;
    if (!doc) return [];
    return db
      .prepare("SELECT id, level, heading, anchor FROM section WHERE doc_id=? AND level>0 ORDER BY ordinal")
      .all(doc.id) as TocRow[];
  } finally {
    db.close();
  }
}

export function showSection(id: number, dbPath = currentMemoryDb()) {
  const db = openMemory(dbPath);
  try {
    return db
      .prepare(
        "SELECT s.id, d.path, s.level, s.heading, s.body FROM section s JOIN doc d ON d.id=s.doc_id WHERE s.id=?",
      )
      .get(id);
  } finally {
    db.close();
  }
}

export interface PlanHit {
  id: number;
  path: string;
  heading: string | null;
  snippet: string;
}

/** FTS search over sections (heading weighted), word then trigram fallback. */
export function searchSections(query: string, opts: { project?: string; limit?: number; dbPath?: string } = {}): PlanHit[] {
  const q = query.trim();
  if (!q) return [];
  const limit = opts.limit ?? 10;
  const db = openMemory(opts.dbPath ?? currentMemoryDb());
  try {
    const run = (table: string, match: string): PlanHit[] => {
      try {
        return db
          .prepare(
            `SELECT s.id, d.path, s.heading,
                    snippet(${table}, 1, '[', ']', '…', 12) AS snippet
             FROM ${table} f JOIN section s ON s.id=f.rowid JOIN doc d ON d.id=s.doc_id
             ${opts.project ? "WHERE d.project_root = @proj AND" : "WHERE"} ${table} MATCH @m
             ORDER BY bm25(${table}, 5.0, 1.0) LIMIT @lim`,
          )
          .all({ proj: opts.project, m: match, lim: limit }) as PlanHit[];
      } catch {
        return [];
      }
    };
    const terms = q.toLowerCase().split(/\s+/).map((t) => t.replace(/["()*:^]/g, "")).filter(Boolean);
    if (!terms.length) return [];
    const word = run("section_fts", terms.map((t) => `"${t}"`).join(" "));
    return word.length ? word : run("section_fts_tri", `"${terms.join(" ")}"`);
  } finally {
    db.close();
  }
}
