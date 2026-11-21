// A compact "continuity card" for a project — injected at SessionStart so a new
// session starts knowing what prior work exists, without re-explaining. Kept
// small (a few lines) to stay within a tight token budget. Returns "" when the
// project has no prior memory history (nothing to inject).

import { type MemoryDB, currentMemoryDb, openMemory } from "./db.js";
import { projectKey } from "../core/config.js";
import { Q } from "./store/queries.js";
import { useProjectKey } from "./retitle.js";

// MỘT bản so-path cho cả hệ (F4, 2026-08-02) — bản cũ ở đây không cắt gạch cuối nên
// `D:\X\` trượt trong khi các chỗ khác khớp.
const norm = projectKey;
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

interface Row {
  id: string;
  title: string | null;
  started_at: string | null;
  ended_at: string | null;
  message_count: number;
  source: string;
  project_root: string;
  pinned: number;
}

/** Ghim/bỏ ghim MỘT phiên. Trả false khi không có phiên đó — im lặng "thành công" trên một
 *  id gõ sai là cách chắc chắn nhất để user tưởng đã ghim mà thật ra chưa. */
export function pinSession(sessionId: string, pinned: boolean, dbPath: string = currentMemoryDb()): boolean {
  const db = openMemory(dbPath);
  try {
    return (db.prepare("UPDATE sessions SET pinned = ? WHERE id = ?").run(pinned ? 1 : 0, sessionId).changes ?? 0) > 0;
  } finally {
    db.close();
  }
}

/** Các phiên đang ghim (mọi project, hoặc một project). */
export function listPinned(project?: string, dbPath: string = currentMemoryDb()): Row[] {
  const db = openMemory(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT id, title, started_at, ended_at, message_count, source, project_root, pinned
         FROM sessions WHERE pinned = 1 ORDER BY ended_at DESC`,
      )
      .all() as Row[];
    return project ? rows.filter((r) => r.project_root && norm(r.project_root) === norm(project)) : rows;
  } finally {
    db.close();
  }
}

export function recallCard(project: string, dbPath: string = currentMemoryDb()): string {
  const db: MemoryDB = openMemory(dbPath);
  try {
    const want = norm(project);
    // Filter by project IN SQL, through the same projectKey every other path uses. The old code took the newest 400
    // sessions of the WHOLE store and filtered afterwards, so a project whose sessions were all older than that window
    // got an empty card (PC 2026-11-22: 117 merged tarot sessions, newest 27/08, a store of 4,154 - nothing at session
    // start) and a busy project's count was capped at what fell inside the window.
    useProjectKey(db);
    const totals = db.prepare(Q.recallProjectTotals).get(want) as { n: number; m: number };
    if (!totals.n) return "";
    // Pinned first, then by time, each pinned one MARKED 📌 so the agent knows why it stands there (a line floating up
    // for no reason looks like a sorting bug). Pinned ones sort ahead of the time order: what is worth pinning is
    // usually OLD.
    const recent = db.prepare(Q.recallProjectRecent).all(want) as Row[];
    const lines = recent.map((r) => {
      const label = (r.title ?? "(untitled session)").replace(/\s+/g, " ").slice(0, 70);
      return ` ·${r.pinned ? " 📌" : ""} ${day(r.ended_at)} — "${label}" (${r.source}, ${r.message_count} msgs)`;
    });

    return [
      `[zemory memory] Prior context exists for this project: ${totals.n} session(s), ${totals.m} messages across agents. Recent:`,
      ...lines,
      `Use \`zemory memory search "<query>"\` to recall specifics (cross-project: add --all).`,
    ].join("\n");
  } finally {
    db.close();
  }
}
