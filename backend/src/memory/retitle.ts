// Display titles for stored sessions (PC 2026-11-22: 117 ChatGPT sessions merged into a Tarot_Study repo kept their web
// titles, and the session-title rule 02-48 asks for `<Repo>_<Brand>_<Topic>_<d-m-yyyy>`).
//
// `sessions.title` is what the source said and is never edited (constitution article 3) - a re-scan writes it back
// anyway, and the channel merges sessions with INSERT OR IGNORE. A title the user gives lives in `session_title`; readers
// show COALESCE(session_title.title, sessions.title). `memory retitle` plans titles for a project from the rule (dry run
// by default) and writes them with --apply; the table rides every bundle and the newer `set_at` wins on the other machine.
//
// `zemory peers --fix` is a different job: it appends a custom-title line to a Claude Code transcript so the host's own
// session list shows it. Web chats have no transcript of ours to write to - this layer is the only way to title them.
import type { MemoryDB } from "./db.js";
import { projectKey } from "../core/config.js";
import { folderName, standardTitle } from "./send-guard.js";
import { Q } from "./store/queries.js";

/** The brand a session source runs on (02-48: the BRAND, never the model name). null = no agent brand (mail threads). */
export const BRAND_BY_SOURCE: Record<string, string | null> = {
  "chatgpt-web": "ChatGPT",
  "claude-code": "Claude",
  "claude-code-memory": "Claude",
  "claude-cowork": "Claude",
  "claude-web": "Claude",
  codex: "Codex",
  continue: "Continue",
  "copilot-chat": "Copilot",
  "m365copilot-web": "Copilot",
  "gemini-web": "Gemini",
  lmstudio: "LMStudio",
  "zemory-mail": null,
};

export const DEFAULT_PATTERN = "{repo}_{brand}_{topic}_{date}";
const TOPIC_MAX = 48;

/** Register projectKey as `zemory_pkey()` on a connection, so a project filter runs in SQL (recall card, retitle). */
export function useProjectKey(db: MemoryDB): void {
  db.function("zemory_pkey", { deterministic: true }, (p: unknown) => (typeof p === "string" ? projectKey(p) : null));
}

/** A free-text title as one rule-safe topic word: accents dropped (the stroked d too), words joined in CamelCase, cut on a word. */
export function topicWord(title: string | null): string {
  if (!title) return "";
  const plain = title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  let out = "";
  for (const w of plain.split(/[^A-Za-z0-9]+/).filter(Boolean)) {
    const word = w[0].toUpperCase() + w.slice(1);
    if (out.length + word.length > TOPIC_MAX) break;
    out += word;
  }
  return out;
}

/** The day a session started in Vietnam time (02-48: the day the session opened), `d-m-yyyy` without zero padding. */
export function vnDay(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "numeric", year: "numeric" })
    .formatToParts(new Date(t));
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
  return `${Number(get("day"))}-${Number(get("month"))}-${get("year")}`;
}

interface SessionRow {
  id: string;
  source: string;
  raw: string | null;
  shown: string | null;
  started_at: string | null;
  ended_at: string | null;
  project_root: string | null;
}

export interface RetitleRow {
  id: string;
  source: string;
  /** what the source said (sessions.title) */
  raw: string | null;
  /** what is shown now */
  current: string | null;
  /** the planned title, or null when none can be built */
  next: string | null;
  /** why `next` is null, or why the row is left as it is */
  why?: string;
}

function build(pattern: string, s: SessionRow, repo: string): { title: string | null; why?: string } {
  const brand = BRAND_BY_SOURCE[s.source];
  if (brand === undefined) return { title: null, why: `no brand known for source ${s.source}` };
  if (brand === null) return { title: null, why: `${s.source} sessions carry no agent brand` };
  const date = vnDay(s.started_at ?? s.ended_at);
  if (!date) return { title: null, why: "no start date" };
  const title = pattern
    .replace("{repo}", repo)
    .replace("{brand}", brand)
    .replace("{topic}", topicWord(s.raw))
    .replace("{date}", date)
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "");
  return { title };
}

/**
 * The titles a project's sessions would get. Built from the SOURCE title (never from a title set earlier), so a second run
 * plans the same thing. Two sessions landing on one title: the later one gets `_2`, `_3` … after the date (02-48).
 * A planned title the rule check (`standardTitle`) rejects is not offered.
 */
export function planRetitle(db: MemoryDB, project: string, pattern = DEFAULT_PATTERN): RetitleRow[] {
  useProjectKey(db);
  const rows = db.prepare(Q.retitleProjectSessions).all(projectKey(project)) as SessionRow[];
  // the repo name as STORED (exact case, 02-48), not as typed: a lower-case --project still titles Tarot_Study
  const repo = folderName(rows[0]?.project_root ?? project);
  const seen = new Map<string, number>();
  return rows.map((s) => {
    const base: RetitleRow = { id: s.id, source: s.source, raw: s.raw, current: s.shown ?? s.raw, next: null };
    const b = build(pattern, s, repo);
    if (!b.title) return { ...base, why: b.why };
    const n = (seen.get(b.title) ?? 0) + 1;
    seen.set(b.title, n);
    const title = n === 1 ? b.title : `${b.title}_${n}`;
    if (!standardTitle(title, repo)) return { ...base, why: `"${title}" breaks the rule <Repo>_<Brand>_<Topic>_<d-m-yyyy>` };
    return title === base.current ? { ...base, next: title, why: "already titled" } : { ...base, next: title };
  });
}

/** Write the planned titles that change something; returns how many were written. One transaction. */
export function applyRetitle(db: MemoryDB, plan: RetitleRow[], now = new Date().toISOString()): number {
  const put = db.prepare(Q.sessionTitleUpsert);
  let n = 0;
  db.transaction(() => {
    for (const r of plan) {
      if (!r.next || r.next === r.current) continue;
      put.run(r.id, r.next, now);
      n++;
    }
  })();
  return n;
}

/** Set (or with null, clear) one session's display title. false = no such session. */
export function setSessionTitle(db: MemoryDB, sessionId: string, title: string | null, now = new Date().toISOString()): boolean {
  if (!db.prepare(Q.retitleOneSession).get(sessionId)) return false;
  db.prepare(Q.sessionTitleUpsert).run(sessionId, title && title.trim() ? title.trim() : null, now);
  return true;
}

/** The title to show for one session: the user's, else the source's. */
export function displayTitle(db: MemoryDB, sessionId: string, raw: string | null): string | null {
  const t = db.prepare(Q.sessionTitleOf).get(sessionId) as { title: string } | undefined;
  return t?.title ?? raw;
}

/** Every display title (a small table): for lists built by dynamic SQL, overlaid after the read. */
export function displayTitles(db: MemoryDB): Map<string, string> {
  return new Map((db.prepare(Q.sessionTitleAll).all() as { id: string; title: string }[]).map((r) => [r.id, r.title]));
}

/** Channel, export side: every display title into the bundle. */
export function shipTitles(db: MemoryDB): number {
  if (!db.prepare(Q.srcTableExists).get("session_title")) return 0;
  db.exec(Q.sessionTitleShipDdl);
  return db.prepare(Q.sessionTitleShip).run().changes;
}

/** Channel, merge side: the bundle's titles, the newer `set_at` winning. */
export function mergeTitles(db: MemoryDB): number {
  if (!db.prepare(Q.srcTableExists).get("session_title")) return 0;
  return db.prepare(Q.sessionTitleMerge).run().changes;
}
