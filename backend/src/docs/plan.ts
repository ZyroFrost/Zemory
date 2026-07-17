// Plan store — DB is the SOURCE for plan docs; .md is a derived render.
// import = seed DB from existing .md (one-time, fence-aware, verbatim, with a
// round-trip fidelity check). After that, edit via set/add/rm (DB) and render
// back to .md (db → md). Search is FTS over sections (heading-weighted).

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, normalize, relative, resolve } from "node:path";
import { type BrainDB, currentBrainDb, openBrain } from "../brain/db.js";
import { parseMarkdown, renderSections, roundTripOk, slug } from "./markdown.js";

// FILE-WINS doctrine (2026-07-16, user decision — supersedes "DB là nguồn"):
// the .md FILE is the source for curated docs; the DB doc/section rows are a
// derived SEARCH INDEX. Agents edit .md freely (following the harness standard)
// — the file IS the source. `plan set`/`changelog add` remain optional
// conveniences (they update the DB then re-render the file so both stay aligned).
const RENDER_HEADER =
  "<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->\n";

export interface ImportResult {
  path: string;
  docId: number;
  sections: number;
  roundTrip: boolean;
  /** File content matches the DB index (nothing to re-import). */
  skipped?: boolean;
}

function upsertDoc(db: BrainDB, projectRoot: string, relPath: string, kind: string): number {
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

function replaceSections(db: BrainDB, docId: number, text: string): number {
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

/** Seed the DB from a markdown file (DB becomes the source thereafter). */
export function importDoc(absPath: string, relPath: string, projectRoot: string, kind = "plan", dbPath = currentBrainDb()): ImportResult {
  // Strip a prior render's GENERATED header so re-import → re-render doesn't double it.
  const text = readFileSync(absPath, "utf8").replace(/^<!-- GENERATED[^\n]*-->\r?\n/, "");
  const roundTrip = roundTripOk(text);
  const db = openBrain(dbPath);
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

/** Create a new DB-source doc and immediately render its markdown mirror. */
export function createDoc(
  relPath: string,
  text: string,
  projectRoot: string,
  kind = "plan",
  dbPath = currentBrainDb(),
): ImportResult {
  const canonicalPath = normalize(relPath);
  resolveDocPath(projectRoot, canonicalPath);
  const db = openBrain(dbPath);
  let result: ImportResult;
  try {
    const exists = db
      .prepare("SELECT 1 AS ok FROM doc WHERE project_root=? AND path=?")
      .get(projectRoot, canonicalPath) as { ok: number } | undefined;
    if (exists) throw new Error(`Doc already exists: ${canonicalPath}`);
    const tx = db.transaction(() => {
      const docId = upsertDoc(db, projectRoot, canonicalPath, kind);
      const sections = replaceSections(db, docId, text);
      return { path: canonicalPath, docId, sections, roundTrip: roundTripOk(text) };
    });
    result = tx();
  } finally {
    db.close();
  }
  renderDoc(canonicalPath, projectRoot, dbPath);
  return result;
}

const normPath = (p: string) => normalize(p);

// Normalize for content comparison only (CRLF checkouts must not force churn).
const normEol = (s: string) => s.replace(/\r\n/g, "\n");

/** Resolve a DB doc path without allowing writes outside the project docs dir. */
export function resolveDocPath(projectRoot: string, docPath: string): string {
  const docsRoot = resolve(projectRoot, "docs");
  const abs = resolve(projectRoot, docPath);
  const rel = relative(docsRoot, abs);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return abs;
  throw new Error(`Unsafe docs path: ${docPath}`);
}

/** Remove a doc (and its sections) from the DB. Returns true if it existed. */
export function removeDoc(projectRoot: string, relPath: string, dbPath = currentBrainDb()): boolean {
  const db = openBrain(dbPath);
  try {
    const want = normPath(relPath);
    const doc = db
      .prepare("SELECT id FROM doc WHERE project_root=? AND path=?")
      .get(projectRoot, want) as { id: number } | undefined;
    if (!doc) return false;
    db.prepare("DELETE FROM section WHERE doc_id=?").run(doc.id);
    db.prepare("DELETE FROM doc WHERE id=?").run(doc.id);
    return true;
  } finally {
    db.close();
  }
}

// (The bulk .md→DB importer was removed 2026-07-16 — the docs-index is fed only
//  by `plan set`/`changelog add` now; agents read .md directly.)

export interface DocRow {
  id: number;
  path: string;
  kind: string;
  sections: number;
}

export function listDocs(projectRoot: string, dbPath = currentBrainDb()): DocRow[] {
  const db = openBrain(dbPath);
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

/** Render EVERY doc back to its .md mirror (db → md). Overwrites files. */
export function renderAll(projectRoot: string, dbPath = currentBrainDb()): string[] {
  const written: string[] = [];
  for (const d of listDocs(projectRoot, dbPath)) {
    const r = renderDoc(d.path, projectRoot, dbPath);
    if (r) written.push(d.path);
  }
  return written;
}

export interface TocRow {
  id: number;
  level: number;
  heading: string | null;
  anchor: string | null;
}

/** Table of contents (derived) for a doc — query, not a stored index file. */
export function listToc(docPath: string, projectRoot: string, dbPath = currentBrainDb()): TocRow[] {
  const db = openBrain(dbPath);
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

export function showSection(id: number, dbPath = currentBrainDb()) {
  const db = openBrain(dbPath);
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
  const db = openBrain(opts.dbPath ?? currentBrainDb());
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

const sha1 = (text: string): string => createHash("sha1").update(text).digest("hex");

/** Render a doc from the DB back to its .md file (db → md) — the RECOVERY path
 *  under FILE WINS (the file is normally the source). Salvages the on-disk file
 *  to `.hand-edited-*.bak` first IFF it holds content the DB does NOT have — so a
 *  render can't destroy work that was never put into the DB. */
export function renderDoc(
  docPath: string,
  projectRoot: string,
  dbPath = currentBrainDb(),
): { path: string; bytes: number; salvaged: string | null } | null {
  const db = openBrain(dbPath);
  try {
    const doc = db.prepare("SELECT id FROM doc WHERE project_root=? AND path=?").get(projectRoot, docPath) as
      | { id: number }
      | undefined;
    if (!doc) return null;
    const sections = db.prepare("SELECT level, heading, body FROM section WHERE doc_id=? ORDER BY ordinal").all(doc.id) as {
      level: number;
      heading: string | null;
      body: string;
    }[];
    const body = renderSections(sections);
    const md = RENDER_HEADER + body;
    const abs = resolveDocPath(projectRoot, docPath);
    mkdirSync(dirname(abs), { recursive: true });
    let salvaged: string | null = null;
    if (existsSync(abs)) {
      const current = readFileSync(abs, "utf8");
      // Compare the file's BODY against what the DB holds — NOT rendered_hash.
      // Body-vs-body (not a stored hash) is the question that actually matters:
      // does the file hold anything the DB does NOT already have?
      const currentBody = normEol(current.replace(/^<!-- GENERATED[^\n]*-->\r?\n/, ""));
      if (currentBody !== normEol(body)) {
        salvaged = `${abs}.hand-edited-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
        copyFileSync(abs, salvaged);
        console.error(
          `zemory: ${docPath} has hand-edits the DB index does NOT have — saved to ${salvaged} before this render overwrote them. ` +
            "FILE WINS: the .md file is the source; render (db → md) is a recovery path only.",
        );
      }
    }
    writeFileSync(abs, md);
    db.prepare("UPDATE doc SET rendered_at=?, rendered_hash=? WHERE id=?").run(new Date().toISOString(), sha1(md), doc.id);
    return { path: abs, bytes: md.length, salvaged };
  } finally {
    db.close();
  }
}

/** Replace a section's body (edit-on-DB), then re-render its .md. */
export function setBody(id: number, body: string, projectRoot: string, dbPath = currentBrainDb()): boolean {
  const db = openBrain(dbPath);
  let docPath: string | undefined;
  try {
    const row = db
      .prepare(
        "SELECT s.doc_id, d.path FROM section s JOIN doc d ON d.id=s.doc_id WHERE s.id=? AND d.project_root=?",
      )
      .get(id, projectRoot) as
      | { doc_id: number; path: string }
      | undefined;
    if (!row) return false;
    docPath = row.path;
    db.prepare("UPDATE section SET body=? WHERE id=?").run(body, id);
  } finally {
    db.close();
  }
  if (docPath) renderDoc(docPath, projectRoot, dbPath);
  return true;
}

/** Rename a section's heading (and re-derive its anchor), then re-render its .md.
 *  Body is untouched. Headings are single-line; any newline is rejected. */
export function setHeading(id: number, heading: string, projectRoot: string, dbPath = currentBrainDb()): boolean {
  const clean = heading.replace(/^#+\s*/, "").trim();
  if (!clean || /\n/.test(heading)) return false;
  const db = openBrain(dbPath);
  let docPath: string | undefined;
  try {
    const row = db
      .prepare(
        "SELECT s.level, d.path FROM section s JOIN doc d ON d.id=s.doc_id WHERE s.id=? AND d.project_root=?",
      )
      .get(id, projectRoot) as
      | { level: number; path: string }
      | undefined;
    if (!row || row.level === 0) return false; // preamble has no heading
    docPath = row.path;
    db.prepare("UPDATE section SET heading=?, anchor=? WHERE id=?").run(clean, slug(clean), id);
  } finally {
    db.close();
  }
  if (docPath) renderDoc(docPath, projectRoot, dbPath);
  return true;
}
