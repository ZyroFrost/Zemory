// Changelog retention — FILE-BASED (the .md is the source, FILE WINS). When
// 06_CHANGES.md grows past the threshold, the OLDEST entries are moved verbatim
// into docs/agent/archive/06_CHANGES.md (cold storage, OUTSIDE the per-session
// read), keeping the newest in place. The search index is then reseeded from the
// trimmed source. No DB→md render, no second source of truth.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { currentBrainDb } from "./brain/db.js";
import type { Context } from "./core/types.js";
import { importChangelog } from "./docs/changelog.js";

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

/** Trim 06_CHANGES.md when it grows past the threshold: move the OLDEST entries
 *  to docs/agent/archive/06_CHANGES.md verbatim, keep the newest in place. */
export function archiveChanges(ctx: Context, dbPath: string = currentBrainDb()): ArchiveResult {
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
  writeFileSync(archivePath, ARCHIVE_INTRO + movedText + (prevBody.trim() ? "\n" + prevBody : ""));
  writeFileSync(mainPath, keptText);

  // Reseed the search index from the trimmed source file (FILE WINS).
  importChangelog(mainPath, ctx.projectRoot, dbPath, { replace: true });
  return { moved, activeLines: keptText.split(/\r?\n/).length, archivePath };
}
