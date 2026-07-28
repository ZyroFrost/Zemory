// Scan engine: for every known agent adapter, discover its transcripts and
// ingest new messages into the global memory, returning a detailed report.
// Incremental + idempotent: append-mode files resume from a line offset;
// whole-mode files re-parse only when changed. Local-only: no network anywhere.

import { closeSync, fstatSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir, hostname } from "node:os";
import { type MemoryDB, MEMORY_DB, openMemory } from "./db.js";
import { type Adapter, allAdapters } from "./adapters/index.js";
import type { ParsedAttachment, TranscriptFile } from "./adapters/types.js";
import { type StoreRef, type UnknownStore, discover } from "./discovery.js";
import { buildDigest } from "./digest.js";
import { redact } from "./redact.js";
import { pruneOrphanVectors } from "./vectors.js";
import { pruneOrphanAttachments } from "./attachments.js";

// v4 (2026-07-26): GỠ `clip()` 4.000 ký tự khỏi mọi adapter (lớp `messages` phải ĐẦY theo
// `plan/06 §6`; đang mất 16,8% khối lượng) + nạp `attachment.type="file"` (file người dùng
// kéo vào chat). Bump ⇒ `needsRebuild` bật ⇒ scan kế tiếp đọc lại từ dòng 0 và
// whole-replace, nên phiên CŨ cũng đầy lại. Transcript gốc còn ⇒ dựng lại được (điều 3).
// v5: nhánh `image` mới có trong adapters/claude.ts — 1.245 block ảnh (93 MB) trước
// đây bị bỏ im lặng ở khâu nạp. Bump để mọi transcript nạp lại và ảnh vào bảng attachment.
const PARSER_VERSION = 6;

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

/** Run a full scan over every known agent and ingest into the memory. */
export function scan(opts: ScanOptions = {}): ScanReport {
  const dbPath = opts.dbPath ?? MEMORY_DB;
  const home = opts.home ?? homedir();
  const adapters = opts.adapters ?? allAdapters();
  const bySource = new Map(adapters.map((a) => [a.source, a]));
  const db = openMemory(dbPath);
  try {
    // Re-use store locations a previous deep scan discovered, so a normal scan
    // never has to walk the disk again.
    const knownStores = db
      .prepare("SELECT store_root AS root, source FROM known_stores")
      .all() as { root: string; source: string }[];

    // Kho import suy TỪ CHÍNH dbPath đang quét (không phải biến toàn cục) — nếu không,
    // một lần scan trên DB tạm sẽ hút dữ liệu từ kho thật vào.
    const importsRoot = join(dirname(dbPath), "imports");
    const found = discover(adapters, { home, deep: opts.deep, roots: opts.roots, knownStores, importsRoot });

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

    // Dọn vector MỒ CÔI sau scan. Khi một file bị whole-replace (bump PARSER_VERSION),
    // `writeSession` DELETE rồi INSERT lại messages ⇒ message.id MỚI, còn vector cũ vẫn
    // trỏ id đã mất. Đo sau re-ingest v4: **504 vector mồ côi**. `pruneOrphanVectors` vốn
    // đã có nhưng CHỈ được gọi trong `share.ts` (lúc export) — nên rác nằm lại trong DB
    // sống. Fail-open: module vector hỏng/thiếu thì scan vẫn phải thành công (điều 9).
    try {
      pruneOrphanVectors(dbPath);
    } catch {
      /* vector là lớp dẫn xuất — dọn không được cũng không được làm hỏng ingest */
    }
    // Cùng lý do, cho lớp đính kèm: whole-replace đổi message id nên LIÊN KẾT cũ trỏ hụt.
    // CHỈ dọn liên kết chết, KHÔNG đụng nội dung (xem ghi chú ở pruneOrphanAttachments —
    // tiêu chí "message_id trỏ tin đã chết" sẽ xoá nhầm ảnh còn sống).
    try {
      pruneOrphanAttachments(dbPath);
    } catch {
      /* fail-open: dọn rác không được thì cũng không được làm hỏng ingest (điều 9) */
    }

    return buildReport(db, dbPath, found, changedFiles, live);
  } finally {
    db.close();
  }
}

/** Per-table snapshot of the memory DB — a terminal window into the store. */
/**
 * Refresh session TITLES from the tail of each transcript — cheap, metadata only.
 *
 * Renaming a session (Claude Code `/title`) APPENDS a `{"type":"custom-title"}` record at
 * the very end of the .jsonl. Full ingest does pick it up, but only on the next `scan`, so
 * the UI kept showing the old name until then (user reported twice, 2026-07-26). Measured:
 * `ingest_state.size` was exactly ~115 bytes behind the file — one un-ingested line, which
 * was the new title.
 *
 * Why not just run `scan`: a scan re-parses and writes messages (heavy, seconds). A rename
 * only changes one metadata field, so this reads just the LAST few KB of the files whose
 * size moved, and updates `sessions.title`. It deliberately does NOT touch `messages` or
 * `ingest_state` — `scan` still owns those, so nothing here can make ingest skip content.
 *
 * Only `custom-title` (user-set) is applied. An `ai-title` found in the tail is IGNORED on
 * purpose: proving "this file has no custom-title anywhere" would need the whole file, and
 * guessing would let an ai-title overwrite a name the user chose (the `titleLocked` rule).
 */
export function refreshSessionTitles(dbPath: string = MEMORY_DB, limit = 150): {
  checked: number;
  updated: { sessionId: string; title: string }[];
} {
  // Đuôi 16 KB là quá đủ: record rename luôn là DÒNG CUỐI file.
  const TAIL_BYTES = 16 * 1024;
  const db = openMemory(dbPath);
  try {
    // Chỉ N phiên MỚI NHẤT của máy này — vừa khớp đúng những phiên UI đang liệt kê, vừa chặn
    // trần IO. CỐ Ý không lọc "file đã mọc thêm" (size > ingested): sau một lần `scan` thì mọi
    // size đã khớp, lọc như vậy khiến hàm không soi cái nào ⇒ tên sai không bao giờ tự lành
    // (đã bị chính bug này khi test lần đầu).
    const rows = db
      .prepare(
        `SELECT i.file_path AS path, i.session_id AS sid, s.title AS title
           FROM ingest_state i JOIN sessions s ON s.id = i.session_id
          WHERE i.session_id IS NOT NULL AND i.session_id <> '' AND s.host = ?
          ORDER BY COALESCE(s.ended_at, s.started_at) DESC
          LIMIT ?`,
      )
      .all(HOST, Math.max(1, Math.min(400, limit))) as { path: string; sid: string; title: string | null }[];

    const updated: { sessionId: string; title: string }[] = [];
    let checked = 0;
    const set = db.prepare("UPDATE sessions SET title = ? WHERE id = ?");

    for (const r of rows) {
      const st = safeStatFile(r.path);
      if (!st) continue; // file của máy khác / đã bị xoá → bỏ qua (fail-open)
      checked++;
      const tail = readTail(r.path, Math.min(TAIL_BYTES, st.size));
      if (!tail) continue;
      // Bỏ mảnh đầu (có thể bị cắt giữa dòng do đọc từ giữa file), quét từ CUỐI lên.
      const lines = tail.split("\n").slice(1);
      let found: string | null = null;
      for (let i = lines.length - 1; i >= 0 && found === null; i--) {
        const ln = lines[i].trim();
        if (!ln || ln.indexOf('"custom-title"') < 0) continue;
        try {
          const o = JSON.parse(ln);
          if (o && o.type === "custom-title" && typeof o.customTitle === "string" && o.customTitle.trim()) {
            found = o.customTitle.trim();
          }
        } catch {
          /* dòng lỗi/bị cắt → bỏ, lần sau scan sẽ lo */
        }
      }
      if (found !== null && found !== r.title) {
        set.run(found, r.sid);
        updated.push({ sessionId: r.sid, title: found });
      }
    }
    return { checked, updated };
  } finally {
    db.close();
  }
}

function safeStatFile(p: string) {
  try {
    const s = statSync(p);
    return s.isFile() ? s : undefined;
  } catch {
    return undefined;
  }
}

/** Read the last `n` bytes of a file as UTF-8 (no whole-file load — these are MBs). */
function readTail(p: string, n: number): string | null {
  let fd: number | undefined;
  try {
    fd = openSync(p, "r");
    const size = fstatSync(fd).size;
    const len = Math.min(n, size);
    const buf = Buffer.allocUnsafe(len);
    readSync(fd, buf, 0, len, size - len);
    return buf.toString("utf8");
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        /* ignore */
      }
    }
  }
}

export function memoryInfo(dbPath: string = MEMORY_DB): {
  dbPath: string;
  sizeKB: number;
  tables: { name: string; rows: number; detail?: string }[];
} {
  const db = openMemory(dbPath);
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
        { name: "session_digest", rows: count("SELECT COUNT(*) c FROM session_digest") },
        { name: "changelog", rows: count("SELECT COUNT(*) c FROM changelog") },
        { name: "known_stores", rows: count("SELECT COUNT(*) c FROM known_stores") },
      ],
    };
  } finally {
    db.close();
  }
}

/** One row per machine the memory has ingested sessions from. */
export interface HostReport {
  host: string;
  sessions: number;
  messages: number;
  from: string | null;
  to: string | null;
}

export interface MemorySummary {
  dbPath: string;
  agents: AgentReport[];
  hosts: HostReport[];
  totals: { agents: number; hosts: number; sessions: number; messages: number; from: string | null; to: string | null };
}

/** Read current memory state WITHOUT scanning (for the UI's idle view). */
export function memorySummary(dbPath: string = MEMORY_DB): MemorySummary {
  const db = openMemory(dbPath);
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
      .get() as MemorySummary["totals"];
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

export function memoryHostTree(dbPath: string = MEMORY_DB): HostTreeNode[] {
  const db = openMemory(dbPath);
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

      const sKey = `${r.host}\u0000${r.source}`;
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

/**
 * Ghi đính kèm của một message + liên kết. Dedup theo sha256: một ảnh lặp 20 lần = 1
 * hàng nội dung + 20 liên kết.
 *
 * CÓ HAI đường ghi message (whole-replace và append-mode jsonl) — hàm này để cả hai
 * cùng gọi. Bản đầu tôi chỉ vá một đường và attachment im lặng không vào: nhãn
 * `[image:…]` đã hiện trong content mà bảng vẫn rỗng.
 */
function writeAttachments(
  db: MemoryDB,
  sessionId: string,
  msgs: PendingMsg[],
): void {
  if (!msgs.some((m) => m.atts?.length)) return;
  const insAtt = db.prepare(
    "INSERT OR IGNORE INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, content, blob, src_path, created_at)" +
      " VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  );
  const findAtt = db.prepare("SELECT id FROM attachment WHERE sha256 = ?");
  const linkAtt = db.prepare("INSERT OR IGNORE INTO attachment_link (message_id, attachment_id, name) VALUES (?,?,?)");
  const findMsg = db.prepare("SELECT id FROM messages WHERE session_id = ? AND uuid IS ? ORDER BY id DESC LIMIT 1");
  const now = new Date().toISOString();
  for (const m of msgs) {
    if (!m.atts?.length) continue;
    const row = findMsg.get(sessionId, m.uuid) as { id: number } | undefined;
    if (!row) continue; // không định vị được message ⇒ bỏ, KHÔNG dựng liên kết mồ côi
    for (const at of m.atts) {
      insAtt.run(row.id, sessionId, at.name ?? null, at.mime ?? null, at.bytes, at.sha256, at.kind,
        at.content ?? null, at.blob ?? null, at.srcPath ?? null, now);
      const found = findAtt.get(at.sha256) as { id: number } | undefined;
      if (found) linkAtt.run(row.id, found.id, at.name ?? null);
    }
  }
}

interface PendingMsg {
  uuid: string | null;
  role: string;
  content: string;
  tool: string | null;
  ts: string | null;
  atts?: ParsedAttachment[];
}

interface WriteSessionArgs {
  sessionId: string;
  source: string;
  origin: string;
  cwd?: string;
  /** Grouping folder → project_root (falls back to cwd when absent). */
  project?: string;
  title?: string;
  msgs: PendingMsg[];
  wholeReplace: boolean;
}

/**
 * Upsert one session, (re)insert its messages, refresh counts, drop-if-empty.
 * Returns net new messages. Shared by the single- and multi-session ingest
 * paths. Content is redacted here so both paths are covered identically.
 */
function writeSession(db: MemoryDB, a: WriteSessionArgs): number {
  db.prepare(
    `INSERT INTO sessions (id, source, origin, project_root, cwd, title, host)
     VALUES (@id, @source, @origin, @project, @cwd, @title, @host)
     ON CONFLICT(id) DO UPDATE SET
       origin       = excluded.origin,
       -- a user-merged (pinned) project_root is kept; otherwise track the transcript's cwd
       project_root = CASE WHEN sessions.project_pinned = 1 THEN sessions.project_root
                          ELSE COALESCE(excluded.project_root, sessions.project_root) END,
       cwd          = COALESCE(excluded.cwd, sessions.cwd),
       title        = COALESCE(excluded.title, sessions.title),
       host         = excluded.host`,
  ).run({ id: a.sessionId, source: a.source, origin: a.origin, project: a.project ?? a.cwd ?? null, cwd: a.cwd ?? null, title: a.title ?? null, host: HOST });

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
  writeAttachments(db, a.sessionId, a.msgs);

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

function ingestFile(db: MemoryDB, adapter: Adapter, file: TranscriptFile): FileResult {
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
          uuid: m.uuid, role: m.role, content: m.content, tool: m.toolName, ts: m.timestamp, atts: m.attachments,
        }));
        const added = writeSession(db, {
          sessionId: conv.sessionId, source: file.source, origin,
          cwd: conv.cwd, project: conv.project, title: conv.title, msgs: pending, wholeReplace: true,
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
  let titleLocked = false;
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
        msgs.push({ uuid: p.msg.uuid, role: p.msg.role, content: p.msg.content, tool: p.msg.toolName, ts: p.msg.timestamp, atts: p.msg.attachments });
      } else if (p.kind === "title") {
        // A user's custom title wins and locks; an AI title only fills if no
        // custom title has been seen (order in the file is not guaranteed).
        if (p.custom) { title = p.title; titleLocked = true; }
        else if (!titleLocked) title = p.title;
      } else if (p.kind === "meta" && p.cwd) cwd = p.cwd;
    }
    nextLine = completeLines;
  } else if (adapter.mode === "whole" && adapter.parseFile) {
    const parsed = adapter.parseFile(file.path);
    if (!parsed) return { changed: false, sessions: [] };
    cwd = parsed.cwd;
    title = parsed.title;
    for (const m of parsed.messages) {
      msgs.push({ uuid: m.uuid, role: m.role, content: m.content, tool: m.toolName, ts: m.timestamp, atts: m.attachments });
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
    writeAttachments(db, sessionId, msgs);

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

function sessionSnapshot(db: MemoryDB, sessionId: string): SessionReport | null {
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
  db: MemoryDB,
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
