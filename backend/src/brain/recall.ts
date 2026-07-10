// A compact "continuity card" for a project — injected at SessionStart so a new
// session starts knowing what prior work exists, without re-explaining. Kept
// small (a few lines) to stay within a tight token budget. Returns "" when the
// project has no prior brain history (nothing to inject).

import { type BrainDB, currentBrainDb, openBrain } from "./db.js";

const norm = (p: string) => p.replace(/\//g, "\\").toLowerCase();
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

export function recallCard(project: string, dbPath: string = currentBrainDb()): string {
  const db: BrainDB = openBrain(dbPath);
  try {
    const want = norm(project);
    const rows = db
      .prepare(
        `SELECT title, started_at, ended_at, message_count, source, project_root
         FROM sessions WHERE project_root IS NOT NULL
         ORDER BY ended_at DESC LIMIT 400`,
      )
      .all() as {
      title: string | null;
      started_at: string | null;
      ended_at: string | null;
      message_count: number;
      source: string;
      project_root: string;
    }[];

    const mine = rows.filter((r) => norm(r.project_root) === want);
    if (!mine.length) return "";

    const totalMsgs = mine.reduce((n, r) => n + r.message_count, 0);
    const recent = mine.slice(0, 5);
    const lines = recent.map((r) => {
      const label = (r.title ?? "(untitled session)").replace(/\s+/g, " ").slice(0, 70);
      return ` · ${day(r.ended_at)} — "${label}" (${r.source}, ${r.message_count} msgs)`;
    });

    return [
      `[zemory brain] Prior context exists for this project: ${mine.length} session(s), ${totalMsgs} messages across agents. Recent:`,
      ...lines,
      `Use \`zemory brain search "<query>"\` to recall specifics (cross-project: add --all).`,
    ].join("\n");
  } finally {
    db.close();
  }
}
