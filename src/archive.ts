// DB-backed changelog retention. The database remains the only source of
// truth: old rows are marked archived and stay searchable; the markdown mirror
// is regenerated with active rows only. No second archive file is created.

import { join } from "node:path";
import { BRAIN_DB, openBrain } from "./brain/db.js";
import type { Context } from "./core/types.js";
import { renderChangelog } from "./docs/changelog.js";

export interface ArchiveResult {
  moved: number;
  activeLines: number;
  archivePath: null;
}

interface ActiveEntry {
  id: number;
  date: string | null;
  title: string;
  body: string;
}

const HEADER_LINES = 7;

function entryLines(entry: ActiveEntry): number {
  const heading = entry.date ? `## [${entry.date}] - ${entry.title}` : `## ${entry.title}`;
  return `${heading}\n\n${entry.body}\n`.split(/\r?\n/).length;
}

function totalLines(entries: ActiveEntry[]): number {
  return HEADER_LINES + entries.reduce((sum, entry) => sum + entryLines(entry) + 1, 0);
}

/** Mark oldest active changelog rows archived until the mirror is under keep. */
export function archiveChanges(ctx: Context, dbPath: string = BRAIN_DB): ArchiveResult {
  const threshold = ctx.config.thresholds?.changes_lines ?? 400;
  const keep = ctx.config.thresholds?.changes_keep ?? Math.round(threshold * 0.6);
  const db = openBrain(dbPath);
  let active: ActiveEntry[];
  let moved: number;
  try {
    active = db
      .prepare(
        `SELECT id, date, title, body FROM changelog
         WHERE project_root=? AND archived=0 ORDER BY date DESC, id DESC`,
      )
      .all(ctx.projectRoot) as ActiveEntry[];
    if (totalLines(active) <= threshold || active.length <= 1) {
      return { moved: 0, activeLines: totalLines(active), archivePath: null };
    }

    const archivedIds: number[] = [];
    while (active.length > 1 && totalLines(active) > keep) {
      archivedIds.push(active.pop()!.id);
    }
    const mark = db.prepare("UPDATE changelog SET archived=1 WHERE id=? AND project_root=?");
    db.transaction(() => {
      for (const id of archivedIds) mark.run(id, ctx.projectRoot);
    })();
    moved = archivedIds.length;
  } finally {
    db.close();
  }

  renderChangelog(ctx.projectRoot, join(ctx.docsDir, "03_CHANGES.md"), dbPath);
  return {
    moved,
    activeLines: totalLines(active),
    archivePath: null,
  };
}
