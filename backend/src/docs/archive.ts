// Changelog retention — FILE-BASED (the .md is the source, FILE WINS). When
// 06_CHANGES.md grows past the threshold, the OLDEST entries are moved verbatim
// into docs/agent/archive/06_CHANGES.md (cold storage, OUTSIDE the per-session
// read), keeping the newest in place. The search index is then reseeded from the
// trimmed source. No DB→md render, no second source of truth.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFileAtomic } from "../util/fs-atomic.js";
import { dirname, join } from "node:path";
import { currentMemoryDb } from "../memory/db.js";
import type { Context } from "../core/types.js";
import { importChangelog } from "./changelog.js";
import { importDoc } from "./plan.js";

export interface ArchiveResult {
  moved: number;
  activeLines: number;
  archivePath: string | null;
}

const FENCE = /^[ \t]*(```|~~~)/;
const DATED_HEAD = /^## \[[^\]]+\]/;

const ARCHIVE_INTRO =
  "<!-- Changelog ARCHIVE — entry cũ cắt khỏi 06_CHANGES.md. NGOÀI bộ đọc mỗi phiên; tra khi cần (vẫn trong git). -->\n# Change Log — Archive\n\n";

/** Line indices where dated changelog entries begin (fence-aware; file order = newest first). */
function entryHeads(lines: string[]): number[] {
  const heads: number[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && DATED_HEAD.test(lines[i])) heads.push(i);
  }
  return heads;
}

const TODO_INTRO =
  "<!-- TODO ARCHIVE — mục ĐÃ XONG cắt khỏi 05_TODO.md. NGOÀI bộ đọc mỗi phiên; tra khi cần (vẫn trong git). -->\n# TODO — Archive\n\n";

const ITEM = /^(\s*)-\s*\[([x ~])\]/;

/** One backlog item = its `- [x]` line plus every following line that belongs to
 *  it (deeper indent, continuation prose). Stops at the next item of the same or
 *  shallower level, a `##` heading, or a `>` block — those start new structure. */
function itemBlocks(lines: string[]): Array<{ state: string; start: number; end: number }> {
  const out: Array<{ state: string; start: number; end: number }> = [];
  let inFence = false;
  for (let i = 0; i < lines.length; ) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence;
      i++;
      continue;
    }
    const m = inFence ? null : ITEM.exec(lines[i]);
    if (!m) {
      i++;
      continue;
    }
    const indent = m[1].length;
    let j = i + 1;
    for (; j < lines.length; j++) {
      const n = lines[j];
      if (/^## /.test(n) || /^>/.test(n)) break;
      const m2 = ITEM.exec(n);
      if (m2 && m2[1].length <= indent) break;
    }
    out.push({ state: m[2], start: i, end: j });
    i = j;
  }
  return out;
}

/** Move every CLOSED item (`[x]`) — with its continuation lines — out of 05_TODO.md
 *  into docs/agent/archive/05_TODO.md, keeping open (`[ ]`) and in-progress (`[~]`)
 *  items plus all headings and narrative in place. Unconditional: no threshold.
 *
 *  Why unconditional: the backlog's own header has always read "xong → ghi sang
 *  06_CHANGES.md và xoá khỏi đây", so a closed item is misplaced the moment it closes.
 *  Nothing enforced that, and by 2026-07-29 the count had reached 107 items = 46% of
 *  the file, re-read into context every session. A size threshold is the wrong gate for
 *  a correctness rule — the give-away was the byte threshold firing with nothing to move.
 *
 *  Why per ITEM and not per section (measured 2026-07-28): only 3 of 19 sections were
 *  fully closed = 18/442 lines (4%), because real sections mix done and open work.
 *
 *  Both tiers are reindexed here, so a moved item is searchable immediately rather than
 *  whenever someone next remembers to run `reindex`. */
export function archiveTodo(ctx: Context, dbPath: string): ArchiveResult {
  // dbPath is REQUIRED, deliberately — it used to default to currentMemoryDb(), and on
  // 2026-07-29 a .mjs test that forgot the argument wrote 20 doc + 48 section rows for
  // temp-dir project roots straight into the live database. TypeScript cannot protect a
  // JS caller (a missing arg arrives as undefined), so the check is at runtime: loud
  // failure beats silently writing to production.
  if (!dbPath) throw new Error("archiveTodo: dbPath is required (pass currentMemoryDb() explicitly)");
  const mainPath = join(ctx.docsDir, "05_TODO.md");
  if (!existsSync(mainPath)) return { moved: 0, activeLines: 0, archivePath: null };

  const text = readFileSync(mainPath, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);

  // NO threshold. The backlog's own header has always said "xong → ghi sang
  // 06_CHANGES.md và xoá khỏi đây", so a closed item is out of place the moment it is
  // closed — file size has nothing to do with it. Gating on a threshold is what let
  // 107 of them pile up to 46% of the file; and the byte threshold was firing anyway
  // with nothing to move, which is the tell that it was measuring the wrong thing.
  const closed = itemBlocks(lines).filter((b) => b.state === "x");
  if (closed.length === 0) return { moved: 0, activeLines: lines.length, archivePath: null };

  const drop = new Set<number>();
  for (const b of closed) for (let i = b.start; i < b.end; i++) drop.add(i);
  const keptText = lines.filter((_, i) => !drop.has(i)).join(eol).replace(/\s+$/, "") + eol;
  const movedText = closed.map((b) => lines.slice(b.start, b.end).join(eol)).join(eol).replace(/\s+$/, "") + "\n";

  const archivePath = join(ctx.docsDir, "archive", "05_TODO.md");
  mkdirSync(dirname(archivePath), { recursive: true });
  const prev = existsSync(archivePath) ? readFileSync(archivePath, "utf8") : "";
  const prevBody = prev.startsWith(TODO_INTRO) ? prev.slice(TODO_INTRO.length) : prev;
  writeFileAtomic(archivePath, TODO_INTRO + movedText + (prevBody.trim() ? "\n" + prevBody : ""));
  // Truncating the SOURCE backlog is destructive — keep a .bak so it can be undone.
  writeFileAtomic(mainPath, keptText, { backup: true });

  // Reindex BOTH tiers immediately, same as archiveChanges. Without this the moved
  // items are only searchable after someone remembers to run `reindex` — and "someone
  // remembers" is exactly the failure mode this whole thread has been unpicking.
  const docsRel = join("docs", "agent");
  importDoc(mainPath, join(docsRel, "05_TODO.md"), ctx.projectRoot, "agent", dbPath);
  importDoc(archivePath, join(docsRel, "archive", "05_TODO.md"), ctx.projectRoot, "agent-archive", dbPath);
  return { moved: closed.length, activeLines: keptText.split(/\r?\n/).length, archivePath };
}

/** Trim 06_CHANGES.md when it grows past the threshold: move the OLDEST entries
 *  to docs/agent/archive/06_CHANGES.md verbatim, keep the newest in place. */
export function archiveChanges(ctx: Context, dbPath: string = currentMemoryDb()): ArchiveResult {
  const mainPath = join(ctx.docsDir, "06_CHANGES.md");
  if (!existsSync(mainPath)) return { moved: 0, activeLines: 0, archivePath: null };
  const threshold = ctx.config.thresholds?.changes_lines ?? 400;
  const keep = ctx.config.thresholds?.changes_keep ?? Math.round(threshold * 0.6);

  const text = readFileSync(mainPath, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const heads = entryHeads(lines);
  if (lines.length <= threshold || heads.length <= 1) {
    return { moved: 0, activeLines: lines.length, archivePath: null };
  }

  // Kept region for the k newest entries spans lines [0, heads[k]). Keep the most
  // entries whose region stays <= keep lines (always keep at least 1).
  let k = 1;
  for (let i = heads.length - 1; i >= 1; i--) {
    if (heads[i] <= keep) {
      k = i;
      break;
    }
  }
  const splitLine = heads[k];
  const keptText = lines.slice(0, splitLine).join(eol).replace(/\s+$/, "") + eol;
  const movedText = lines.slice(splitLine).join(eol).replace(/\s+$/, "") + "\n";
  const moved = heads.length - k;

  // Prepend the moved block (newest-of-moved on top) to the archive file.
  const archivePath = join(ctx.docsDir, "archive", "06_CHANGES.md");
  mkdirSync(dirname(archivePath), { recursive: true });
  const prev = existsSync(archivePath) ? readFileSync(archivePath, "utf8") : "";
  const prevBody = prev.startsWith(ARCHIVE_INTRO) ? prev.slice(ARCHIVE_INTRO.length) : prev;
  writeFileAtomic(archivePath, ARCHIVE_INTRO + movedText + (prevBody.trim() ? "\n" + prevBody : ""));
  // backup: đây là thao tác PHÁ HUỶ (cắt ngắn NGUỒN changelog) — giữ .bak để lùi được.
  writeFileAtomic(mainPath, keptText, { backup: true });

  // Reseed BOTH tiers from their source files (FILE WINS): the trimmed active file,
  // and the archive that just grew. Without the second call the moved entries fall
  // out of the index entirely — they stop being searchable the moment they are
  // archived, which defeats the point of keeping them.
  importChangelog(mainPath, ctx.projectRoot, dbPath, { replace: true });
  importChangelog(archivePath, ctx.projectRoot, dbPath, { replace: true, archived: true });
  return { moved, activeLines: keptText.split(/\r?\n/).length, archivePath };
}
