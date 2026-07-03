// Scan engine: for every known agent adapter, discover its transcripts and
// ingest new messages into the global brain, returning a detailed report.
// Incremental + idempotent: append-mode files resume from a line offset;
// whole-mode files re-parse only when changed. Local-only: no network anywhere.

import { readFileSync, statSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { type BrainDB, BRAIN_DB, openBrain } from "./db.js";
import { type Adapter, allAdapters } from "./adapters/index.js";
import type { TranscriptFile } from "./adapters/types.js";
import { type StoreRef, type UnknownStore, discover } from "./discovery.js";
import { buildDigest } from "./digest.js";
import { redact } from "./redact.js";

const PARSER_VERSION = 2;

// The machine doing the ingest. Transcript files are local to the machine that
// ran the agent, so the ingesting host IS the producing host. Stamped onto each
// session for per-PC provenance (PC → source → project rollups).
const HOST = hostname() || "unknown";

export interface SessionReport {
  id: string;
  source: string;
  project: string;
  from: string | null;
  to: string | null;
  messages: number; // total messages in DB for this session
  newMessages: number; // messages added in THIS scan
}

export interface AgentReport {
  source: string;
  sessions: number;
  messages: number;
  from: string | null;
  to: string | null;
}

export interface ScanReport {
  dbPath: string;
  deep: boolean;
  roots: string[];
  /** Agent transcript store folders enumerated in this scan. */
  stores: StoreRef[];
  scannedFiles: number;
  changedFiles: number;
  agents: AgentReport[];
  sessions: SessionReport[];
  /** Transcript-shaped stores found in a deep scan that no adapter can read. */
  unknown: UnknownStore[];
  totals: {
    agents: number;
    sessions: number;
    messages: number;
    newMessages: number;
    from: string | null;
    to: string | null;
  };
}

export interface ScanOptions {
  dbPath?: string;
  home?: string;
  adapters?: Adapter[];
  /** Walk the machine to find agents anywhere (heavier; first run only). */
  deep?: boolean;
  /** Extra roots to walk in deep mode (e.g. other drives). */
  roots?: string[];
}

/** Run a full scan over every known agent and ingest into the brain. */
export function scan(opts: ScanOptions = {}): ScanReport {
  const dbPath = opts.dbPath ?? BRAIN_DB;
  const home = opts.home ?? homedir();
  const adapters = opts.adapters ?? allAdapters();
  const bySource = new Map(adapters.map((a) => [a.source, a]));
  const db = openBrain(dbPath);
  try {
    // Re-use store locations a previous deep scan discovered, so a normal scan
    // never has to walk the disk again.
    const knownStores = db
      .prepare("SELECT store_root AS root, source FROM known_stores")
      .all() as { root: string; source: string }[];

    const found = discover(adapters, { home, deep: opts.deep, roots: opts.roots, knownStores });

    // Remember every store root seen this run (deep scan discovers new ones).
    const saveStore = db.prepare(
      "INSERT OR IGNORE INTO known_stores (store_root, source, found_at) VALUES (?, ?, ?)",
    );
    const now = new Date().toISOString();
    for (const s of found.stores) saveStore.run(s.root, s.source, now);

    const touched = new Map<string, SessionReport>();
    let changedFiles = 0;

    for (const file of found.files) {
      const adapter = bySource.get(file.source);
      if (!adapter) continue;
      const r = ingestFile(db, adapter, file);
      if (r.changed) changedFiles++;
      for (const rs of r.sessions) {
        // Dedupe by session id (a resumed session can appear under two files).
        const ex = touched.get(rs.id);
        if (ex) {
          ex.newMessages += rs.newMessages;
          ex.messages = rs.messages;
          ex.from = minDate(ex.from, rs.from);
          ex.to = maxDate(ex.to, rs.to);
        } else {
          touched.set(rs.id, rs);
        }
      }
    }

    // Sweep any legacy zero-message sessions (e.g. ingested before this rule).
    db.prepare("DELETE FROM sessions WHERE message_count = 0").run();
    const live = [...touched.values()].filter((s) => s.messages > 0);

    // Refresh the per-session digest lens for every session that changed this
    // scan (hash-guarded inside buildDigest → unchanged sessions are a no-op).
    // Fail-open: a digest error must never break ingest.
    for (const s of live) {
      try {
        buildDigest(db, s.id);
      } catch {
        /* ignore — digest is a derived, rebuildable lens */
      }
    }

    return buildReport(db, dbPath, found, changedFiles, live);
  } finally {
    db.close();
  }
}

/** Per-table snapshot of the brain DB — a terminal window into the store. */
export function brainInfo(dbPath: string = BRAIN_DB): {
  dbPath: string;
  sizeKB: number;
  tables: { name: string; rows: number; detail?: string }[];
} {
  const db = openBrain(dbPath);
  try {
    const count = (sql: string, ...p: unknown[]) => (db.prepare(sql).get(...p) as { c: number }).c;
    const docKinds = db
      .prepare("SELECT kind, COUNT(*) c FROM doc GROUP BY kind ORDER BY kind")
      .all() as { kind: string; c: number }[];
    const sources = db
      .prepare("SELECT source, COUNT(*) c FROM sessions GROUP BY source ORDER BY c DESC")
      .all() as { source: string; c: number }[];
    let sizeKB = 0;
    try {
      sizeKB = Math.round(statSync(dbPath).size / 1024);
    } catch {
      /* ignore */
    }
    return {
      dbPath,
      sizeKB,
      tables: [
        { name: "sessions", rows: count("SELECT COUNT(*) c FROM sessions"), detail: sources.map((s) => `${s.source}:${s.c}`).join(" ") },
        { name: "messages", rows: count("SELECT COUNT(*) c FROM messages") },
        { name: "doc", rows: count("SELECT COUNT(*) c FROM doc"), detail: docKinds.map((d) => `${d.kind}:${d.c}`).join(" ") },
        { name: "section", rows: count("SELECT COUNT(*) c FROM section") },
        { name: "changelog", rows: count("SELECT COUNT(*) c FROM changelog") },
        { name: "known_stores", rows: count("SELECT COUNT(*) c FROM known_stores") },
      ],
    };
  } finally {
    db.close();
  }
}

/** One row per machine the brain has ingested sessions from. */
export interface HostReport {
  host: string;
  sessions: number;
  messages: number;
  from: string | null;
  to: string | null;
}

export interface BrainSummary {
  dbPath: string;
  agents: AgentReport[];
  hosts: HostReport[];
  totals: { agents: number; hosts: number; sessions: number; messages: number; from: string | null; to: string | null };
}

/** Read current brain state WITHOUT scanning (for the UI's idle view). */
export function brainSummary(dbPath: string = BRAIN_DB): BrainSummary {
  const db = openBrain(dbPath);
  try {
    const agents = db
      .prepare(
        `SELECT source, COUNT(*) AS sessions, COALESCE(SUM(message_count),0) AS messages,
                MIN(started_at) AS "from", MAX(ended_at) AS "to"
         FROM sessions GROUP BY source ORDER BY sessions DESC`,
      )
      .all() as AgentReport[];
    const hosts = db
      .prepare(
        `SELECT COALESCE(host,'unknown') AS host, COUNT(*) AS sessions,
                COALESCE(SUM(message_count),0) AS messages,
                MIN(started_at) AS "from", MAX(ended_at) AS "to"
         FROM sessions GROUP BY COALESCE(host,'unknown') ORDER BY sessions DESC`,
      )
      .all() as HostReport[];
    const t = db
      .prepare(
        `SELECT COUNT(*) AS sessions, COALESCE(SUM(message_count),0) AS messages,
                COUNT(DISTINCT source) AS agents,
                COUNT(DISTINCT COALESCE(host,'unknown')) AS hosts,
                MIN(started_at) AS "from", MAX(ended_at) AS "to"
         FROM sessions`,
      )
      .get() as BrainSummary["totals"];
    return { dbPath, agents, hosts, totals: t };
  } finally {
    db.close();
  }
}

/** Tree rollup: PC → source(tool) → project, with session/message counts at
 *  each level. Drives the "Sessions by host" dashboard. */
export interface HostTreeNode {
  host: string;
  sessions: number;
  messages: number;
  sources: {
    source: string;
    sessions: number;
    messages: number;
    projects: { project: string; sessions: number; messages: number }[];
  }[];
}

export function brainHostTree(dbPath: string = BRAIN_DB): HostTreeNode[] {
  const db = openBrain(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT COALESCE(host,'unknown')         AS host,
                source,
                COALESCE(project_root,'(unknown)') AS project,
                COUNT(*)                          AS sessions,
                COALESCE(SUM(message_count),0)    AS messages
         FROM sessions
         GROUP BY COALESCE(host,'unknown'), source, COALESCE(project_root,'(unknown)')
         ORDER BY host, sessions DESC, source`,
      )
      .all() as { host: string; source: string; project: string; sessions: number; messages: number }[];

    const tree: HostTreeNode[] = [];
    const hostMap = new Map<string, HostTreeNode>();
    const sourceMap = new Map<string, HostTreeNode["sources"][number]>();
    for (const r of rows) {
      let h = hostMap.get(r.host);
      if (!h) {
        h = { host: r.host, sessions: 0, messages: 0, sources: [] };
        hostMap.set(r.host, h);
        tree.push(h);
      }
      h.sessions += r.sessions;
      h.messages += r.messages;

      const sKey = `${r.host} ${r.source}`;
      let s = sourceMap.get(sKey);
      if (!s) {
        s = { source: r.source, sessions: 0, messages: 0, projects: [] };
        sourceMap.set(sKey, s);
        h.sources.push(s);
      }
      s.sessions += r.sessions;
      s.messages += r.messages;
      s.projects.push({ project: r.project, sessions: r.sessions, messages: r.messages });
    }
    // Largest hosts/sources first for a stable, useful display order.
    tree.sort((a, b) => b.sessions - a.sessions || a.host.localeCompare(b.host));
    for (const h of tree) h.sources.sort((a, b) => b.sessions - a.sessions || a.source.localeCompare(b.source));
    return tree;
  } finally {
    db.close();
  }
}

interface FileResult {
  changed: boolean;
  sessions: SessionReport[];
}

interface PendingMsg {
  uuid: string | null;
  role: string;
  content: string;
  tool: string | null;
  ts: string | null;
}

interface WriteSessionArgs {
  sessionId: string;
  source: string;
  origin: string;
  cwd?: string;
  title?: string;
  msgs: PendingMsg[];
  wholeReplace: boolean;
}

/**
 * Upsert one session, (re)insert its messages, refresh counts, drop-if-empty.
 * Returns net new messages. Shared by the single- and multi-session ingest
 * paths. Content is redacted here so both paths are covered identically.
 */
function writeSession(db: BrainDB, a: WriteSessionArgs): number {
  db.prepare(
    `INSERT INTO sessions (id, source, origin, project_root, cwd, title, host)
     VALUES (@id, @source, @origin, @project, @cwd, @title, @host)
     ON CONFLICT(id) DO UPDATE SET
       origin       = excluded.origin,
       project_root = COALESCE(excluded.project_root, sessions.project_root),
       cwd          = COALESCE(excluded.cwd, sessions.cwd),
       title        = COALESCE(excluded.title, sessions.title),
       host         = excluded.host`,
  ).run({ id: a.sessionId, source: a.source, origin: a.origin, project: a.cwd ?? null, cwd: a.cwd ?? null, title: a.title ?? null, host: HOST });

  const before = a.wholeReplace
    ? (db.prepare("SELECT COUNT(*) c FROM messages WHERE session_id = ?").get(a.sessionId) as { c: number }).c
    : 0;
  if (a.wholeReplace) db.prepare("DELETE FROM messages WHERE session_id = ?").run(a.sessionId);

  const ins = db.prepare(
    `INSERT OR IGNORE INTO messages (session_id, uuid, role, content, tool_name, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  let inserted = 0;
  for (const m of a.msgs) inserted += ins.run(a.sessionId, m.uuid, m.role, redact(m.content), m.tool, m.ts).changes;

  db.prepare(
    `UPDATE sessions SET
       message_count = (SELECT COUNT(*) FROM messages WHERE session_id = @id),
       started_at    = (SELECT MIN(timestamp) FROM messages WHERE session_id = @id),
       ended_at      = (SELECT MAX(timestamp) FROM messages WHERE session_id = @id)
     WHERE id = @id`,
  ).run({ id: a.sessionId });

  db.prepare("DELETE FROM sessions WHERE id = @id AND message_count = 0").run({ id: a.sessionId });
  return a.wholeReplace ? Math.max(0, inserted - before) : inserted;
}

function ingestFile(db: BrainDB, adapter: Adapter, file: TranscriptFile): FileResult {
  const sessionId = adapter.sessionId(file.path);
  const prev = db
    .prepare("SELECT size, mtime_ms, last_line, parser_version FROM ingest_state WHERE file_path = ?")
    .get(file.path) as
    | { size: number; mtime_ms: number; last_line: number; parser_version: number }
    | undefined;

  // Unchanged since last scan → nothing to do (but still report the session).
  if (
    prev &&
    prev.parser_version >= PARSER_VERSION &&
    prev.size === file.size &&
    prev.mtime_ms === file.mtimeMs
  ) {
    return { changed: false, sessions: [] };
  }

  // WHOLE-MULTI: one file holds MANY conversations (e.g. a web-chat export).
  // Fan out to N sessions, each whole-replaced, keyed by its own sessionId.
  if (adapter.mode === "whole" && adapter.parseFileMulti) {
    const parsed = adapter.parseFileMulti(file.path);
    if (!parsed || !parsed.length) return { changed: false, sessions: [] };
    const origin = adapter.origin ?? "local";
    const reports: SessionReport[] = [];
    let total = 0;
    const tx = db.transaction(() => {
      for (const conv of parsed) {
        const pending: PendingMsg[] = conv.messages.map((m) => ({
          uuid: m.uuid, role: m.role, content: m.content, tool: m.toolName, ts: m.timestamp,
        }));
        const added = writeSession(db, {
          sessionId: conv.sessionId, source: file.source, origin,
          cwd: conv.cwd, title: conv.title, msgs: pending, wholeReplace: true,
        });
        total += added;
        const snap = sessionSnapshot(db, conv.sessionId);
        if (snap) {
          snap.newMessages = added;
          reports.push(snap);
        }
      }
      // One ingest_state row per FILE (drives the size/mtime short-circuit); the
      // session_id column is a sentinel since the file maps to many sessions.
      db.prepare(
        `INSERT INTO ingest_state (file_path, source, session_id, size, mtime_ms, last_line, updated_at, parser_version)
         VALUES (@path, @source, @sid, @size, @mtime, 0, @now, @pv)
         ON CONFLICT(file_path) DO UPDATE SET
           source = @source, session_id = @sid, size = @size, mtime_ms = @mtime,
           last_line = 0, updated_at = @now, parser_version = @pv`,
      ).run({ path: file.path, source: file.source, sid: `multi:${parsed.length}`, size: file.size, mtime: file.mtimeMs, now: new Date().toISOString(), pv: PARSER_VERSION });
    });
    tx();
    return { changed: total > 0, sessions: reports };
  }

  let cwd: string | undefined;
  let title: string | undefined;
  const msgs: PendingMsg[] = [];
  let nextLine = 0;
  let wholeReplace = false;

  if (adapter.mode === "append" && adapter.parseLine) {
    let text: string;
    let lines: string[];
    try {
      text = readFileSync(file.path, "utf8");
      lines = text.split("\n");
    } catch {
      return { changed: false, sessions: [] };
    }

    // Do not consume a partial trailing JSON record. A valid final record is
    // safe even without a newline; an invalid one is retried on the next scan.
    let completeLines = lines.length - (text.endsWith("\n") ? 1 : 0);
    if (!text.endsWith("\n") && lines.length > 0) {
      try {
        JSON.parse(lines[lines.length - 1]);
      } catch {
        completeLines--;
      }
    }
    completeLines = Math.max(0, completeLines);

    const needsRebuild = !prev || prev.parser_version < PARSER_VERSION || file.size < prev.size;
    // Parser v1 stored lines.length, including the trailing empty segment. A
    // one-time full replacement repairs every line it previously skipped.
    const start = needsRebuild ? 0 : Math.min(prev.last_line, completeLines);
    wholeReplace = Boolean(prev && needsRebuild);
    for (let i = start; i < completeLines; i++) {
      const p = adapter.parseLine(lines[i]);
      if (p.kind === "message") {
        msgs.push({ uuid: p.msg.uuid, role: p.msg.role, content: p.msg.content, tool: p.msg.toolName, ts: p.msg.timestamp });
      } else if (p.kind === "title") title = p.title;
      else if (p.kind === "meta" && p.cwd) cwd = p.cwd;
    }
    nextLine = completeLines;
  } else if (adapter.mode === "whole" && adapter.parseFile) {
    const parsed = adapter.parseFile(file.path);
    if (!parsed) return { changed: false, sessions: [] };
    cwd = parsed.cwd;
    title = parsed.title;
    for (const m of parsed.messages) {
      msgs.push({ uuid: m.uuid, role: m.role, content: m.content, tool: m.toolName, ts: m.timestamp });
    }
    wholeReplace = true; // file is rewritten wholesale → replace this session's rows
  } else {
    return { changed: false, sessions: [] };
  }

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO sessions (id, source, origin, project_root, cwd, title, host)
       VALUES (@id, @source, @origin, @project, @cwd, @title, @host)
       ON CONFLICT(id) DO UPDATE SET
         origin       = excluded.origin,
         project_root = COALESCE(excluded.project_root, sessions.project_root),
         cwd          = COALESCE(excluded.cwd, sessions.cwd),
         title        = COALESCE(excluded.title, sessions.title),
         host         = excluded.host`,
    ).run({ id: sessionId, source: file.source, origin: adapter.origin ?? "local", project: cwd ?? null, cwd: cwd ?? null, title: title ?? null, host: HOST });

    const before = wholeReplace
      ? (db.prepare("SELECT COUNT(*) c FROM messages WHERE session_id = ?").get(sessionId) as { c: number }).c
      : 0;
    if (wholeReplace) db.prepare("DELETE FROM messages WHERE session_id = ?").run(sessionId);

    const ins = db.prepare(
      `INSERT OR IGNORE INTO messages (session_id, uuid, role, content, tool_name, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    let inserted = 0;
    for (const m of msgs) inserted += ins.run(sessionId, m.uuid, m.role, redact(m.content), m.tool, m.ts).changes;

    db.prepare(
      `UPDATE sessions SET
         message_count = (SELECT COUNT(*) FROM messages WHERE session_id = @id),
         started_at    = (SELECT MIN(timestamp) FROM messages WHERE session_id = @id),
         ended_at      = (SELECT MAX(timestamp) FROM messages WHERE session_id = @id)
       WHERE id = @id`,
    ).run({ id: sessionId });

    // Zero chat lines = junk (failed/empty session) → don't keep the row.
    db.prepare("DELETE FROM sessions WHERE id = @id AND message_count = 0").run({ id: sessionId });

    db.prepare(
      `INSERT INTO ingest_state (file_path, source, session_id, size, mtime_ms, last_line, updated_at, parser_version)
       VALUES (@path, @source, @sid, @size, @mtime, @lastLine, @now, @parserVersion)
       ON CONFLICT(file_path) DO UPDATE SET
         source = @source, session_id = @sid, size = @size, mtime_ms = @mtime,
         last_line = @lastLine, updated_at = @now, parser_version = @parserVersion`,
    ).run({
      path: file.path,
      source: file.source,
      sid: sessionId,
      size: file.size,
      mtime: file.mtimeMs,
      lastLine: nextLine,
      now: new Date().toISOString(),
      parserVersion: PARSER_VERSION,
    });

    // For whole-replace, "new" = net growth; for append, = rows inserted.
    return wholeReplace ? Math.max(0, inserted - before) : inserted;
  });

  const added = tx();
  const snap = sessionSnapshot(db, sessionId);
  if (snap) snap.newMessages = added;
  return { changed: added > 0, sessions: snap ? [snap] : [] };
}

function sessionSnapshot(db: BrainDB, sessionId: string): SessionReport | null {
  const s = db
    .prepare(
      "SELECT id, source, project_root, started_at, ended_at, message_count FROM sessions WHERE id = ?",
    )
    .get(sessionId) as
    | { id: string; source: string; project_root: string | null; started_at: string | null; ended_at: string | null; message_count: number }
    | undefined;
  if (!s) return null;
  return {
    id: s.id,
    source: s.source,
    project: s.project_root ?? "(unknown)",
    from: s.started_at,
    to: s.ended_at,
    messages: s.message_count,
    newMessages: 0,
  };
}

function buildReport(
  db: BrainDB,
  dbPath: string,
  found: { files: TranscriptFile[]; stores: StoreRef[]; unknown: UnknownStore[]; roots: string[]; deep: boolean },
  changedFiles: number,
  sessions: SessionReport[],
): ScanReport {
  const newMessages = sessions.reduce((n, s) => n + s.newMessages, 0);

  const agents = db
    .prepare(
      `SELECT source,
              COUNT(*)                        AS sessions,
              COALESCE(SUM(message_count), 0) AS messages,
              MIN(started_at)                 AS "from",
              MAX(ended_at)                   AS "to"
       FROM sessions GROUP BY source ORDER BY sessions DESC`,
    )
    .all() as AgentReport[];

  const t = db
    .prepare(
      `SELECT COUNT(*)                        AS sessions,
              COALESCE(SUM(message_count), 0) AS messages,
              COUNT(DISTINCT source)          AS agents,
              MIN(started_at)                 AS "from",
              MAX(ended_at)                   AS "to"
       FROM sessions`,
    )
    .get() as { sessions: number; messages: number; agents: number; from: string | null; to: string | null };

  return {
    dbPath,
    deep: found.deep,
    roots: found.roots,
    stores: found.stores,
    scannedFiles: found.files.length,
    changedFiles,
    agents,
    sessions: sessions.sort((a, b) => (b.to ?? "").localeCompare(a.to ?? "")),
    unknown: found.unknown,
    totals: { ...t, newMessages },
  };
}

function minDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}
function maxDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}
