/**
 * Attachment bytes (plan/25, HP 18): the bytes of every attachment live IN the GM db (`attachment.blob`), the one file
 * the GM folder holds. They travel to another machine inside a bundle like every other layer of the RAG.
 *
 * The db holds index and bytes together: `name` · `mime` · `bytes` · `sha256` · `attachment_link` · `blob`. A file a
 * person wants to open is written out on demand into this machine's data folder (`openCopy`) - a derived copy that can
 * be thrown away at any time, never a second store.
 *
 * Until 2026-10-23 the bytes were moved OUT into a `files/` folder beside the db (plan/25 §2). `inlineFiles` moves what
 * is still there back in, once, then the folder goes.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { currentMemoryDir, currentStoreRoot, openMemory, type MemoryDB } from "./db.js";
import { attachmentsOfMessagesSql, listFilesSql } from "./store/files.js";
import { Q } from "./store/queries.js";

/** One attachment as recall sees it: enough to OPEN it, without its bytes. */
export interface RecallAttachment {
  sha: string;
  name: string | null;
  mime: string | null;
  bytes: number | null;
  /** Absolute path of the open copy on disk; `null` while there are no bytes to open. */
  path: string | null;
  /** `in-db` the bytes are in the db (openable) · `not-fetched` never downloaded · `text` it is text. */
  state: "not-fetched" | "in-db" | "text";
}

/** The folder the bytes were kept in before HP 18 - read once by `inlineFiles`, never written. */
export function legacyFilesDir(storeRoot: string = currentStoreRoot()): string {
  return join(storeRoot, "files");
}

/**
 * Category, from `mime` and NOT from the name's extension: names are set by someone else (a chat site, a sender), so the
 * extension may be wrong or missing, while `mime` is what the adapter itself read. Five fixed categories, matching the
 * filter chips of the Files screen (plan/25 §5).
 */
export function categoryOf(mime: string | null): string {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "images";
  if (m.startsWith("video/") || m.startsWith("audio/")) return "media";
  if (/zip|compress|tar|rar|7z/.test(m)) return "archives";
  if (
    m.startsWith("text/") ||
    /pdf|word|excel|powerpoint|spreadsheet|presentation|document|officedocument|json|xml|csv/.test(m)
  ) {
    return "documents";
  }
  return "other";
}

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/json": "json",
  "text/csv": "csv",
  "application/zip": "zip",
};

/** Extension: the original name first (whoever named it knows best), then the `mime` table, last `bin`. */
function extensionFor(name: string | null, mime: string | null): string {
  const fromName = /\.([A-Za-z0-9]{1,8})$/.exec(name ?? "")?.[1];
  if (fromName) return fromName.toLowerCase();
  const m = (mime ?? "").toLowerCase().split(";")[0].trim();
  if (EXT_BY_MIME[m]) return EXT_BY_MIME[m];
  const tail = m.split("/")[1];
  return tail && /^[a-z0-9]{1,8}$/.test(tail) ? tail : "bin";
}

/** Characters a file system forbids. Walked by CODE, not written as a control range in a regex class - that once put a
 *  real 0x00 byte into the source (the same lesson as `attachments.ts`). */
const FORBIDDEN = new Set([...String.raw`<>:"/\|?*`]);

/** Drop every forbidden character and cut the length. The ORIGINAL name stays whole in `attachment.name`. */
function safeStem(name: string | null): string {
  const stem = (name ?? "").replace(/\.[A-Za-z0-9]{1,8}$/, "");
  let cleaned = "";
  for (const ch of stem) {
    const code = ch.codePointAt(0) ?? 0;
    cleaned += code < 32 || code === 127 || FORBIDDEN.has(ch) ? "-" : ch;
  }
  cleaned = cleaned.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  return cleaned.slice(0, 60);
}

const sha256Hex = (b: Buffer): string => createHash("sha256").update(b).digest("hex");

/**
 * A file a person (or the agent) can open: the attachment's bytes written out under this machine's data folder, named
 * `<8 chars of sha>_<name>.<ext>`. Written once and reused while it is intact; `null` when the db holds no bytes for it.
 * The copy is derived - deleting the folder loses nothing.
 */
export function openCopy(
  a: { sha256: string; name: string | null; mime: string | null },
  opts: { db?: MemoryDB; dbPath?: string; dir?: string } = {},
): string | null {
  const dir = opts.dir ?? join(currentMemoryDir(), "attachments-open");
  const stem = safeStem(a.name);
  const file = join(dir, `${a.sha256.slice(0, 8)}${stem ? "_" + stem : ""}.${extensionFor(a.name, a.mime)}`);
  try {
    if (existsSync(file) && sha256Hex(readFileSync(file)) === a.sha256) return file;
  } catch {
    /* unreadable copy ⇒ write it again */
  }
  const db = opts.db ?? openMemory(opts.dbPath);
  try {
    const row = db.prepare(Q.attachmentBlobBySha).get(a.sha256) as { blob: Buffer } | undefined;
    if (!row?.blob || sha256Hex(row.blob) !== a.sha256) return null;
    mkdirSync(dir, { recursive: true });
    const tmp = `${file}.part-${process.pid}`;
    writeFileSync(tmp, row.blob);
    renameSync(tmp, file);
    return file;
  } finally {
    if (!opts.db) db.close();
  }
}

export interface InlineResult {
  /** Rows whose bytes came back into the db. */
  moved: number;
  bytes: number;
  /** Rows that could not come back, with why - said, not swallowed. */
  failed: Array<{ id: number; reason: string }>;
  dryRun: boolean;
}

/**
 * Move the bytes still in the legacy `files/` folder back into the db (HP 18). For each `blob` row with no bytes and a
 * path there: read the file, check `sha256`, write `blob`, clear `src_path`. Idempotent: a second run finds nothing to do.
 * The folder itself is not deleted here - the caller removes it once nothing is left to move.
 */
export function inlineFiles(opts: { db?: MemoryDB; dbPath?: string; root?: string; dryRun?: boolean } = {}): InlineResult {
  const db = opts.db ?? openMemory(opts.dbPath);
  const root = opts.root ?? legacyFilesDir();
  const out: InlineResult = { moved: 0, bytes: 0, failed: [], dryRun: Boolean(opts.dryRun) };
  const rows = db.prepare(Q.attachmentsOnLegacyDisk).all() as Array<{ id: number; sha256: string; src_path: string }>;
  const set = db.prepare(Q.attachmentSetBlob);
  for (const r of rows) {
    // a `ref`-style source URL is not a path in the folder (`sediment://…`, `https://…`)
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(r.src_path)) continue;
    try {
      const bytes = readFileSync(join(root, ...r.src_path.split("/")));
      if (sha256Hex(bytes) !== r.sha256) {
        out.failed.push({ id: r.id, reason: "sha mismatch" });
        continue;
      }
      if (!opts.dryRun) set.run(bytes, r.id);
      out.moved++;
      out.bytes += bytes.length;
    } catch (error) {
      out.failed.push({ id: r.id, reason: error instanceof Error ? error.message.slice(0, 160) : "unknown error" });
    }
  }
  if (!opts.db) db.close();
  return out;
}

export interface FileListItem {
  id: number;
  sha256: string;
  name: string | null;
  mime: string | null;
  bytes: number;
  kind: string;
  /** Whether there are bytes to show (`blob` in the db, or `text`). A `ref` never downloaded has none. */
  fetched: boolean;
  /** Time of the EARLIEST message carrying this file - the time that means something to the user, not ingest time. */
  at: string | null;
  category: string;
  /** The message to jump to; `null` ⇒ the file came from no conversation (the `picked` lane). */
  messageId: number | null;
  sessionId: string | null;
  source: string | null;
  projectRoot: string | null;
}

export interface FileListResult {
  items: FileListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * The attachments of a SET of messages, for recall - so the agent can OPEN the picture, not search by it.
 *
 * Why: recall returned only TEXT; it could filter "messages with an image" but never said where the image was, so for
 * "look at the screenshot again" the agent reached the right message with nothing to look at. What was missing was the
 * POINTER: the bytes are in the db, `openCopy` writes out a copy that opens.
 *
 * Step ② of HP 6: the machine points the way deterministically, the LINKED agent looks at the image with the running
 * session's tokens. No OCR, no model in the core (plan/23 §7).
 *
 * `path=null` with a `state` that says WHY, instead of a path that does not exist ("do not claim what is not verified").
 */
export function attachmentsForMessages(
  ids: number[],
  opts: { db?: MemoryDB; dbPath?: string; openDir?: string } = {},
): Map<number, RecallAttachment[]> {
  const out = new Map<number, RecallAttachment[]>();
  if (!ids.length) return out;
  const db = opts.db ?? openMemory(opts.dbPath);
  // One query for the WHOLE list: asking per message is N+1 on recall's hot path.
  const rows = db.prepare(attachmentsOfMessagesSql(ids.length)).all(...ids) as Array<{
    mid: number;
    sha256: string;
    name: string | null;
    mime: string | null;
    bytes: number | null;
    kind: string;
    hasBlob: number;
  }>;
  for (const r of rows) {
    // The SAME classification as `listFiles` - two surfaces saying different things about one file is a bug already paid for.
    const state: RecallAttachment["state"] = r.kind === "text" ? "text" : r.kind === "blob" && r.hasBlob ? "in-db" : "not-fetched";
    const list = out.get(r.mid) ?? [];
    list.push({
      sha: r.sha256,
      name: r.name,
      mime: r.mime,
      bytes: r.bytes,
      path: state === "in-db" ? openCopy({ sha256: r.sha256, name: r.name, mime: r.mime }, { db, ...(opts.openDir ? { dir: opts.openDir } : {}) }) : null,
      state,
    });
    out.set(r.mid, list);
  }
  // Close what we open: `openMemory` makes a NEW connection each call; forgetting to close leaks a handle per recall, and
  // on Windows it holds a file lock that makes the test temp-dir cleanup throw EPERM (the `mcp` gate caught exactly that).
  if (!opts.db) db.close();
  return out;
}

/**
 * The file list for the surfaces - ONE query for both the overview screen and the per-session panel (plan/25 §5: one
 * source, two lenses). Goes through `attachment_link → messages → sessions`, NOT `attachment.session_id`: that column
 * holds only the FIRST message carrying the content (dedup by sha256); using it loses ~22% of the messages.
 */
export function listFiles(
  opts: {
    db?: MemoryDB;
    dbPath?: string;
    session?: string;
    project?: string;
    category?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  } = {},
): FileListResult {
  const db = opts.db ?? openMemory(opts.dbPath);
  try {
    const where: Array<"session" | "project" | "name"> = [];
    const args: unknown[] = [];
    if (opts.session) {
      where.push("session");
      args.push(opts.session);
    }
    if (opts.project) {
      where.push("project");
      args.push(opts.project);
    }
    if (opts.query) {
      where.push("name");
      args.push(`%${opts.query.toLowerCase()}%`);
    }
    // A file linked to several messages (dedup) folds into ONE row, the earliest message.
    const rows = db.prepare(listFilesSql(where)).all(...args) as Array<Omit<FileListItem, "fetched" | "category"> & { hasBlob: number }>;
    const enriched: FileListItem[] = rows.map(({ hasBlob, ...r }) => ({
      ...r,
      fetched: r.kind === "text" || (r.kind === "blob" && Boolean(hasBlob)),
      category: categoryOf(r.mime),
    }));
    const filtered = opts.category && opts.category !== "all"
      ? enriched.filter((r) => r.category === opts.category)
      : enriched;
    // Newest first, as a photo album; a file with no time goes last instead of being dropped.
    filtered.sort((x, y) => String(y.at ?? "").localeCompare(String(x.at ?? "")));
    const pageSize = Math.min(500, Math.max(1, opts.pageSize ?? 60));
    const page = Math.max(1, opts.page ?? 1);
    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  } finally {
    if (!opts.db) db.close();
  }
}

/** Extension → `mime`: the reverse of `EXT_BY_MIME` plus a few source extensions common in the `created` lane. */
const MIME_BY_EXT: Record<string, string> = {
  md: "text/markdown",
  txt: "text/plain",
  json: "application/json",
  csv: "text/csv",
  sql: "application/sql",
  py: "text/x-python",
  ts: "text/x-typescript",
  js: "text/javascript",
  mjs: "text/javascript",
  cjs: "text/javascript",
  ps1: "text/x-powershell",
  sh: "text/x-shellscript",
  html: "text/html",
  css: "text/css",
  yml: "text/yaml",
  yaml: "text/yaml",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
};

/**
 * Places NOT taken in: the line between an *asset* and the disk's *activity log*. Agents write many probe/scratch/
 * regenerable files, and taking them all in empties the files of meaning. Measured 2026-09-15 on the real store: of
 * 6,050 paths found, **4,044 fell here**.
 */
const NOT_AN_ASSET = new RegExp(
  String.raw`[\\/](data|dist|node_modules|\.venv|\.git|scratchpad|AppData|Temp|attic|coverage)[\\/]`,
  "i",
);

/** The file path in a `Write` tool call - that call's own `file_path` argument. */
const WRITE_PATH = new RegExp(String.raw`"file_path"\s*:\s*"((?:[^"\\]|\\.)*)"`);

/**
 * Is this a scratch path (⇒ NOT taken in)? A separate function so the gate tests it directly: the trap hit while writing
 * it was a regex that lost one level of `\` into `[/]` - on Windows the filter missed everything and 4,048 scratch files
 * poured in, silently, with no fixture-only check to notice.
 */
export function isScratchPath(p: string): boolean {
  return NOT_AN_ASSET.test(p);
}

export interface CollectResult {
  /** `Write` calls looked at. */
  calls: number;
  /** File paths found (deduplicated). */
  paths: number;
  /** Left out as scratch. */
  excluded: number;
  /** No longer on disk (deleted / renamed). */
  gone: number;
  /** Taken in this time. */
  added: number;
  /** Already in the db (dedup by sha256). */
  already: number;
  bytes: number;
  dryRun: boolean;
}

/**
 * The `created` lane (plan/25 §1b): take FILES THE AGENT CREATED into the db. The content comes from the **file on
 * disk**, not from the text in the transcript: the asset is the file as it is NOW, the content at write time is only a
 * draft (a file is often `Write`n then `Edit`ed many times). So the condition is that **the file still exists**.
 * No new capture: the path sits in the `Write` call's own argument, so this is a deterministic rebuild, 0 tokens (HP 6①).
 */
export function collectCreated(
  opts: {
    db?: MemoryDB;
    dbPath?: string;
    limit?: number;
    dryRun?: boolean;
    /** The scratch filter. Injectable because the system temp folder sits inside the excluded zone (`AppData/Temp`),
     *  so a fixture could not build a positive case with the real rule. */
    isScratch?: (p: string) => boolean;
  } = {},
): CollectResult {
  const db = opts.db ?? openMemory(opts.dbPath);
  const out: CollectResult = {
    calls: 0, paths: 0, excluded: 0, gone: 0, added: 0, already: 0, bytes: 0, dryRun: Boolean(opts.dryRun),
  };
  const rows = db
    .prepare("SELECT id, session_id, content, timestamp FROM messages WHERE tool_name = 'Write' ORDER BY id")
    .all() as Array<{ id: number; session_id: string; content: string | null; timestamp: string | null }>;
  out.calls = rows.length;

  // A file written many times ⇒ the LAST call (newest message) is the link.
  const latest = new Map<string, { mid: number; at: string | null }>();
  for (const r of rows) {
    const m = WRITE_PATH.exec(r.content ?? "");
    if (!m) continue;
    let p: string;
    try {
      p = JSON.parse('"' + m[1] + '"');
    } catch {
      continue; // a string that does not decode ⇒ skipped, NOT guessed
    }
    latest.set(p, { mid: r.id, at: r.timestamp });
  }
  out.paths = latest.size;

  const findSha = db.prepare(Q.attachmentIdBySha);
  const insAtt = db.prepare(Q.insertAttachmentForMessage);
  const insLink = db.prepare(Q.insertAttachmentLink);

  let done = 0;
  for (const [p, info] of latest) {
    if (opts.limit && done >= opts.limit) break;
    if ((opts.isScratch ?? isScratchPath)(p)) {
      out.excluded++;
      continue;
    }
    let bytes: Buffer;
    try {
      if (!statSync(p).isFile()) continue;
      bytes = readFileSync(p);
    } catch {
      out.gone++;
      continue;
    }
    const digest = sha256Hex(bytes);
    // Node's `basename` rather than a hand-made regex cut: the hand-made one lost a level of backslash and returned the
    // WHOLE path as the file name on Windows (caught in a test).
    const name = basename(p) || "file";
    const ext = (/\.([A-Za-z0-9]{1,8})$/.exec(name)?.[1] ?? "").toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
    const existing = findSha.get(digest) as { id: number } | undefined;
    if (existing) {
      // The same content is already in the db ⇒ only link it, do NOT store it again.
      if (!opts.dryRun) insLink.run(info.mid, existing.id);
      out.already++;
      done++;
      continue;
    }
    if (!opts.dryRun) {
      const id = Number(insAtt.run(info.mid, info.mid, name, mime, bytes.length, digest, bytes, info.at).lastInsertRowid);
      insLink.run(info.mid, id);
    }
    out.added++;
    out.bytes += bytes.length;
    done++;
  }
  if (!opts.db) db.close();
  return out;
}

/**
 * The `picked` lane's LABEL in the `session_id` column. A label and not `NULL`: the schema declares `message_id` and
 * `session_id` **NOT NULL** (`db.ts` v19), and changing that in SQLite means rebuilding the table - a migration for a
 * feature that does not need it. `message_id = 0` points at no message (the key starts at 1), so a user's file never
 * attaches to someone's message.
 *
 * The label is **load-bearing**: the orphan sweep defines "not in `attachment_link`" as orphan, and by design the `picked`
 * lane has no link - without the label one `dropUnlinked` wipes the files the user added. See `pruneOrphanAttachments`,
 * and the 2026-07 lesson: a reasonable-sounding orphan rule once nearly deleted 87 live images.
 */
export const PICKED_SESSION = "(picked)";

export interface PickedResult {
  /** Files taken in this time. */
  added: number;
  /** Already there (dedup by `sha256`) - not stored twice. */
  already: number;
  bytes: number;
  /** Not taken, with why - said, not swallowed. */
  failed: Array<{ path: string; reason: string }>;
  /** `sha256` of the ones just taken in. */
  shas: string[];
}

export interface PickedInput {
  /** Display name; missing ⇒ the path's `basename`. */
  name?: string;
  /** Path on disk - the bytes are read from here. Empty when `bytes` is given. */
  path?: string;
  /** Bytes at hand (the browser's drag-and-drop sends the content straight up). */
  bytes?: Buffer;
}

/**
 * The `picked` lane (plan/25 §1b) - files the USER chose to add. It differs from the other two lanes in the one point that
 * shapes the data: the file **comes from no conversation**, so its row has `message_id` 0 and NO `attachment_link`. The
 * read side (`listFiles`) already `LEFT JOIN`s, so it shows at once; plan/25 §5 hides the *jump to message* button for it.
 * **One click = one permission**: no folder scan, no hidden batch mode - exactly the list it is given.
 */
export function addPickedFiles(
  items: PickedInput[],
  opts: { db?: MemoryDB; dbPath?: string; maxBytes?: number } = {},
): PickedResult {
  const db = opts.db ?? openMemory(opts.dbPath);
  const out: PickedResult = { added: 0, already: 0, bytes: 0, failed: [], shas: [] };
  const findSha = db.prepare(Q.attachmentIdBySha);
  const insAtt = db.prepare(Q.insertPickedAttachment);

  for (const it of items) {
    const label = it.path ?? it.name ?? "(no name)";
    try {
      let bytes: Buffer;
      if (it.bytes) {
        bytes = it.bytes;
      } else if (it.path) {
        if (!statSync(it.path).isFile()) {
          out.failed.push({ path: label, reason: "not a file" });
          continue;
        }
        bytes = readFileSync(it.path);
      } else {
        out.failed.push({ path: label, reason: "neither a path nor content" });
        continue;
      }
      if (!bytes.length) {
        out.failed.push({ path: label, reason: "empty file" });
        continue;
      }
      if (opts.maxBytes && bytes.length > opts.maxBytes) {
        out.failed.push({ path: label, reason: `${(bytes.length / 1048576).toFixed(1)} MB - over the cap` });
        continue;
      }
      const digest = sha256Hex(bytes);
      const existing = findSha.get(digest) as { id: number } | undefined;
      if (existing) {
        // Already in the db ⇒ neither stored twice nor a second row. No message to link to (this is `picked`): count it.
        out.already++;
        continue;
      }
      const name = it.name ?? (it.path ? basename(it.path) : null) ?? "file";
      const ext = (/\.([A-Za-z0-9]{1,8})$/.exec(name)?.[1] ?? "").toLowerCase();
      const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
      insAtt.run(PICKED_SESSION, name, mime, bytes.length, digest, bytes, new Date().toISOString());
      out.added++;
      out.bytes += bytes.length;
      out.shas.push(digest);
    } catch (error) {
      out.failed.push({ path: label, reason: error instanceof Error ? error.message.slice(0, 160) : "unknown error" });
    }
  }
  if (!opts.db) db.close();
  return out;
}
