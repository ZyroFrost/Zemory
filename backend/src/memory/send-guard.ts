// PreToolUse latch for cross-session messaging (`SendMessage`) — user rulings 2026-10-07:
//   "phải gọi vào session đang hoạt động, ko dc gọi mấy cái session Untitle mặc định nữa"
//   "khi t ko đặt tên mới theo chuẩn tức là session đó là session chưa dc xài, ko dc chat vào đó"
//   ⇒ message the session whose TITLE follows `<Repo>_<Model>_<d-m-yyyy>` with the NEWEST date for that repo.
//
// 🔴 TWO NAMES PER SESSION (measured 2026-10-07, reported by the data-warehouse session):
//   · the MESSAGING name — what `SendMessage` addresses and `ListAgents` prints (`dept-biz-b2`). Auto-derived from the
//     folder unless the user runs `/rename` (then `nameSource: "user"`).
//   · the TITLE the user gives a session in the session list — a `{"type":"custom-title"}` line in that session's jsonl.
//     Setting it does NOT change the messaging name. 9 of 10 live sessions had a derived messaging name.
// The first build of this latch judged the SHAPE of the messaging name (`<folder>-<2 hex>`), so it blocked exactly the
// sessions the user HAD titled, and an agent could never learn which address carries the right title. Now the latch
// reads both sides and maps title → address.
//
// Sources (all local, read-only):
//   ~/.claude/sessions/<pid>.json        — live sessions: pid · sessionId · cwd · name · nameSource · status
//   ~/.claude/projects/<dir>/<sid>.jsonl — the LAST `custom-title` line is the title. No jsonl = never used ("Untitled").
// jsonl files reach hundreds of MB, so titles are cached per file (size+mtime) and read incrementally from the last offset.
//
// Choice per repo (cwd): only live sessions WITH a dated title count; the newest DATE IN THE TITLE wins (the user's
// words: "ngày mới nhất"), a tie goes to the most recent activity (jsonl mtime).

import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

export interface PeerSession {
  pid: number;
  sessionId: string;
  cwd: string;
  repo: string;
  /** messaging name — the address SendMessage takes */
  name: string;
  nameSource: string;
  status: string;
  /** the user's session title, or null when the session never got one (unused / "Untitled") */
  title: string | null;
  /** date parsed from the title (ms), or null */
  titleDate: number | null;
  /** the title follows the session-title rule exactly (`standardTitle`) and its date matches the session's start */
  standard: boolean;
  /** why the title breaks the rule, or null */
  problem: string | null;
  /** local calendar day the session really started (first `timestamp` of its jsonl, as UTC midnight ms), or null */
  startDay: number | null;
  lastActive: number;
  /** the session a message for this repo should go to */
  chosen: boolean;
}

const claudeHome = (): string => process.env.ZEMORY_CLAUDE_HOME || join(homedir(), ".claude");
const cacheFile = (): string =>
  process.env.ZEMORY_PEER_TITLE_CACHE || join(homedir(), ".zemory", "cache", "peer-titles.json");

/** `Dept_BIZ_Claude_6-10-2026` · `Dept_FA-6-10-2026` · `SasinFlow_Claude_FixApp_10-5-2026` → the LAST d-m-yyyy date. */
export function titleDate(title: string | null): number | null {
  if (!title) return null;
  const all = [...title.matchAll(/(\d{1,2})-(\d{1,2})-(\d{4})/g)];
  const m = all[all.length - 1];
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return Date.UTC(Number(m[3]), mo - 1, d);
}

/**
 * The session-title rule (user ruling 2026-10-07, "tên session cũng nên có luật"):
 * `<Repo>_<Model>_<d-m-yyyy>`, or `<Repo>_<Model>_<Topic>_<d-m-yyyy>` — `<Repo>` is the repo folder name with its exact
 * case, `<Model>` the model the session runs (`Claude`, `Codex`, … — "Claude là Model, vì nhiều khi t đổi model khác"),
 * the date has no zero padding (`7-10-2026`). An off-pattern title that still carries a date is accepted by the send
 * guard (it can still pick the newest), but `zemory peers` flags it so the user can fix it.
 */
export function standardTitle(title: string | null, repo: string): boolean {
  if (!title || !repo) return false;
  const esc = repo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^${esc}_[A-Za-z][A-Za-z0-9.]*_(?:[A-Za-z0-9]+_)*([1-9]\\d?)-([1-9]\\d?)-(\\d{4})$`).exec(title);
  return Boolean(m && Number(m[1]) <= 31 && Number(m[2]) <= 12);
}

/**
 * Why a title breaks the rule, or null. The title date may sit ONE day off the start day (a session opened near
 * midnight, or titled the next morning — measured: `_DB_DataWarehouse_Claude_5-10-2026` whose first line is 6/10);
 * further off is a wrong date — measured: `SasinFlow_Claude_FixApp_10-5-2026` started 5/10, i.e. day and month swapped.
 */
export function titleProblem(title: string | null, repo: string, startDay: number | null): string | null {
  if (!title) return null; // untitled = unused — a different case, reported as such
  if (!standardTitle(title, repo)) return `not ${repo}_<Model>_<d-m-yyyy>`;
  const t = titleDate(title);
  if (t !== null && startDay !== null && Math.abs(t - startDay) > 86_400_000) {
    const d = new Date(startDay);
    return `date ≠ start day (${d.getUTCDate()}-${d.getUTCMonth() + 1}-${d.getUTCFullYear()})`;
  }
  return null;
}

type TitleCache = Record<
  string,
  { size: number; mtime: number; offset: number; title: string | null; started?: number | null }
>;

/** Local calendar day of the first `timestamp` in a jsonl (read once, cached). */
function startDayOf(file: string, cache: TitleCache): number | null {
  const hit = cache[file];
  if (hit && hit.started !== undefined) return hit.started;
  let day: number | null = null;
  const fd = openSync(file, "r");
  try {
    const buf = Buffer.alloc(256 * 1024);
    const n = readSync(fd, buf, 0, buf.length, 0);
    const m = /"timestamp":"([^"]+)"/.exec(buf.subarray(0, n).toString("utf8"));
    const ms = m ? Date.parse(m[1]) : NaN;
    if (!Number.isNaN(ms)) {
      const d = new Date(ms);
      day = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    }
  } finally {
    closeSync(fd);
  }
  if (hit) hit.started = day;
  return day;
}

function readCache(): TitleCache {
  try {
    return JSON.parse(readFileSync(cacheFile(), "utf8")) as TitleCache;
  } catch {
    return {};
  }
}

/** Last `custom-title` of a jsonl, reading only the bytes added since the cached offset. */
function lastTitle(file: string, cache: TitleCache): string | null {
  const st = statSync(file);
  const hit = cache[file];
  if (hit && hit.size === st.size && hit.mtime === st.mtimeMs) return hit.title;
  const resume = Boolean(hit && st.size >= hit.offset);
  let title = resume ? hit!.title : null;
  let from = resume ? hit!.offset : 0;
  const fd = openSync(file, "r");
  let carry = "";
  try {
    const CHUNK = 4 * 1024 * 1024;
    while (from < st.size) {
      const buf = Buffer.alloc(Math.min(CHUNK, st.size - from));
      const n = readSync(fd, buf, 0, buf.length, from);
      if (n <= 0) break;
      from += n;
      const lines = (carry + buf.subarray(0, n).toString("utf8")).split("\n");
      carry = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.includes('"custom-title"')) continue;
        try {
          const j = JSON.parse(line) as { type?: string; customTitle?: unknown };
          if (j.type === "custom-title" && typeof j.customTitle === "string") title = j.customTitle;
        } catch {
          // a torn line is skipped; the next rename writes a fresh one
        }
      }
    }
  } finally {
    closeSync(fd);
  }
  // the unfinished last line is re-read whole next time
  cache[file] = {
    size: st.size,
    mtime: st.mtimeMs,
    offset: from - Buffer.byteLength(carry, "utf8"),
    title,
    started: hit?.started,
  };
  return title;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Live local sessions with their titles, and the chosen one per repo. */
export function listPeers(): PeerSession[] {
  const home = claudeHome();
  const sdir = join(home, "sessions");
  if (!existsSync(sdir)) return [];
  const projects = existsSync(join(home, "projects")) ? readdirSync(join(home, "projects")) : [];
  const cache = readCache();
  const out: PeerSession[] = [];
  for (const f of readdirSync(sdir).filter((x) => x.endsWith(".json"))) {
    let j: Record<string, unknown>;
    try {
      j = JSON.parse(readFileSync(join(sdir, f), "utf8")) as Record<string, unknown>;
    } catch {
      continue;
    }
    const pid = Number(j.pid ?? basename(f, ".json"));
    if (!pid || !alive(pid)) continue;
    const sessionId = String(j.sessionId ?? "");
    const name = String(j.name ?? "");
    const nameSource = String(j.nameSource ?? "");
    let title: string | null = null;
    let startDay: number | null = null;
    let lastActive = Date.parse(String(j.updatedAt ?? "")) || 0;
    for (const d of projects) {
      const jl = join(home, "projects", d, sessionId + ".jsonl");
      if (!sessionId || !existsSync(jl)) continue;
      title = lastTitle(jl, cache);
      startDay = startDayOf(jl, cache);
      lastActive = Math.max(lastActive, statSync(jl).mtimeMs);
      break;
    }
    // `/rename` sets the messaging name itself — that IS the user's title.
    if (!title && nameSource === "user" && name) title = name;
    const cwd = String(j.cwd ?? "");
    const repo = basename(cwd.replace(/[\\/]+$/, ""));
    out.push({
      pid,
      sessionId,
      cwd,
      repo,
      name,
      nameSource,
      status: String(j.status ?? ""),
      title,
      titleDate: titleDate(title),
      standard: Boolean(title) && titleProblem(title, repo, startDay) === null,
      problem: titleProblem(title, repo, startDay),
      startDay,
      lastActive,
      chosen: false,
    });
  }
  try {
    mkdirSync(dirname(cacheFile()), { recursive: true });
    writeFileSync(cacheFile(), JSON.stringify(cache));
  } catch {
    // a cache that cannot be written only costs speed
  }
  const byRepo = new Map<string, PeerSession[]>();
  for (const p of out) {
    const k = p.cwd.toLowerCase().replace(/[\\/]+$/, "");
    byRepo.set(k, [...(byRepo.get(k) ?? []), p]);
  }
  for (const group of byRepo.values()) {
    const dated = group.filter((p) => p.titleDate !== null);
    dated.sort((a, b) => b.titleDate! - a.titleDate! || b.lastActive - a.lastActive);
    if (dated[0]) dated[0].chosen = true;
  }
  return out.sort((a, b) => a.repo.localeCompare(b.repo) || Number(b.chosen) - Number(a.chosen));
}

/** null = let through; otherwise the reason to block. */
export function judgeSendTarget(to: unknown, peers: PeerSession[] = listPeers()): string | null {
  const raw = typeof to === "string" ? to.trim() : "";
  // A `uds:` address is the `from` of a message just received — it spoke, so it is alive.
  if (!raw || /^uds:/i.test(raw)) return null;
  const name = raw.replace(/\s*\[[0-9a-f]+\]$/i, "");
  const target = peers.find((p) => p.name === name);
  // Not a local session (a subagent id, `main`, a teammate, a remote session): not this latch's business.
  if (!target || target.chosen) return null;
  const right = peers.find((p) => p.chosen && p.cwd.toLowerCase() === target.cwd.toLowerCase());
  const why = !target.title
    ? `\`${name}\` has NO session title — an unused session ("Untitled": opened by Claude Code, never worked in)`
    : target.titleDate === null
      ? `\`${name}\` is titled "${target.title}", not a standard title (\`<Repo>_<Model>_<d-m-yyyy>\`)`
      : `\`${name}\` ("${target.title}") is not the newest titled session of ${target.repo}`;
  return (
    `BLOCKED (send guard): ${why} (02_RULES §Phạm vi project, user ruling 2026-10-07).\n` +
    (right
      ? `Send to \`${right.name}\` instead — that is "${right.title}", the newest titled session of ${right.repo}.`
      : `${target.repo} has NO session with a standard title ⇒ do NOT send; ask the user to title the session at work (\`<Repo>_<Model>_<d-m-yyyy>\`).`) +
    "\nEvery repo's sessions: `zemory peers`. Replying to a message you received? Use its `from` address (`uds:…`) — that always passes."
  );
}
