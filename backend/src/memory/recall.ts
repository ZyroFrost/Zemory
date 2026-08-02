// A compact "continuity card" for a project — injected at SessionStart so a new
// session starts knowing what prior work exists, without re-explaining. Kept
// small (a few lines) to stay within a tight token budget. Returns "" when the
// project has no prior memory history (nothing to inject).

import { type MemoryDB, currentMemoryDb, openMemory } from "./db.js";

const norm = (p: string) => p.replace(/\//g, "\\").toLowerCase();
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
    const cols = `id, title, started_at, ended_at, message_count, source, project_root, pinned`;
    const rows = db
      .prepare(
        `SELECT ${cols} FROM sessions WHERE project_root IS NOT NULL
         ORDER BY ended_at DESC LIMIT 400`,
      )
      .all() as Row[];
    // Phiên GHIM lấy bằng truy vấn RIÊNG, không dựa vào cửa sổ 400 dòng ở trên: ghim để
    // nhớ lâu, mà thứ đáng ghim thường là phiên CŨ — đúng loại rơi ra khỏi cửa sổ trước
    // tiên. Ghim mà vẫn tuột khỏi thẻ thì cái ghim thành vô nghĩa.
    const pinned = db
      .prepare(`SELECT ${cols} FROM sessions WHERE project_root IS NOT NULL AND pinned = 1 ORDER BY ended_at DESC`)
      .all() as Row[];

    const mine = rows.filter((r) => norm(r.project_root) === want);
    const pinnedMine = pinned.filter((r) => norm(r.project_root) === want);
    if (!mine.length && !pinnedMine.length) return "";

    const seen = new Set(mine.map((r) => r.id));
    const all = [...pinnedMine.filter((r) => !seen.has(r.id)), ...mine];
    const totalMsgs = all.reduce((n, r) => n + r.message_count, 0);
    // Ghim lên đầu, phần còn lại theo thời gian — và ĐÁNH DẤU 📌 để agent biết vì sao nó
    // đứng đó (một dòng nổi lên không lý do trông như lỗi sắp xếp).
    const recent = [...pinnedMine, ...all.filter((r) => !r.pinned)].slice(0, 5);
    const lines = recent.map((r) => {
      const label = (r.title ?? "(untitled session)").replace(/\s+/g, " ").slice(0, 70);
      return ` ·${r.pinned ? " 📌" : ""} ${day(r.ended_at)} — "${label}" (${r.source}, ${r.message_count} msgs)`;
    });

    return [
      `[zemory memory] Prior context exists for this project: ${mine.length} session(s), ${totalMsgs} messages across agents. Recent:`,
      ...lines,
      `Use \`zemory memory search "<query>"\` to recall specifics (cross-project: add --all).`,
    ].join("\n");
  } finally {
    db.close();
  }
}
