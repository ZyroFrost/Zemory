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
  // `_<n>` after the date numbers the 2nd/3rd session of a day (user 2026-10-07: allowed — "Cho phép `_<số>` sau ngày").
  const m = new RegExp(`^${esc}_[A-Za-z][A-Za-z0-9.]*_(?:[A-Za-z0-9]+_)*([1-9]\\d?)-([1-9]\\d?)-(\\d{4})(?:_[1-9]\\d*)?$`).exec(title);
  return Boolean(m && Number(m[1]) <= 31 && Number(m[2]) <= 12);
}

/** How far a title date may sit from the session's first timestamp (user 2026-10-07: a session started late one day runs
 * into the next, or is titled one day back — "chênh lệch thường 1-2 ngày là cao nhất"). */
export const MAX_TITLE_DRIFT_MS = 2 * 86_400_000;

/**
 * Why a title breaks the rule, or null. The title date may sit up to TWO days off the start day (`MAX_TITLE_DRIFT_MS`
 * — measured: `_DB_DataWarehouse_Claude_5-10-2026` whose first line is 6/10); further off is a wrong date — measured:
 * `SasinFlow_Claude_FixApp_10-5-2026` started 5/10 (day and month swapped), `Dept_FA_Claude_2-9-2026` started 7/9.
 */
export function titleProblem(title: string | null, repo: string, startDay: number | null): string | null {
  if (!title) return null; // untitled = unused — a different case, reported as such
  if (!standardTitle(title, repo)) return `not ${repo}_<Model>_<d-m-yyyy>`;
  const t = titleDate(title);
  if (t !== null && startDay !== null && Math.abs(t - startDay) > MAX_TITLE_DRIFT_MS) {
    const d = new Date(startDay);
    return `date ≠ start day (${d.getUTCDate()}-${d.getUTCMonth() + 1}-${d.getUTCFullYear()})`;
  }
  return null;
}

type TitleCache = Record<
  string,
  { size: number; mtime: number; offset: number; title: string | null; started?: number | null; cwd?: string | null }
>;

/** Local calendar day of the first `timestamp` in a jsonl, and its `cwd` (read once from the head, cached). */
function startDayOf(file: string, cache: TitleCache): number | null {
  const hit = cache[file];
  if (hit && hit.started !== undefined && hit.cwd !== undefined) return hit.started;
  let day: number | null = null;
  let cwd: string | null = null;
  const fd = openSync(file, "r");
  try {
    const buf = Buffer.alloc(256 * 1024);
    const n = readSync(fd, buf, 0, buf.length, 0);
    const text = buf.subarray(0, n).toString("utf8");
    const m = /"timestamp":"([^"]+)"/.exec(text);
    const ms = m ? Date.parse(m[1]) : NaN;
    if (!Number.isNaN(ms)) {
      const d = new Date(ms);
      day = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    }
    const c = /"cwd":("(?:[^"\\]|\\.)*")/.exec(text);
    if (c) {
      try {
        cwd = JSON.parse(c[1]) as string;
      } catch {
        cwd = null;
      }
    }
  } finally {
    closeSync(fd);
  }
  if (hit) {
    hit.started = day;
    hit.cwd = cwd;
  }
  return day;
}

/**
 * The title the rule asks for, built from what the user wrote — or null when it cannot be derived safely.
 * Keeps the user's topic words; fills the model (`Claude`: every session under ~/.claude is a Claude Code session);
 * fixes the repo's case; drops zero padding; swaps day/month ONLY when the swap lands on the session's start day.
 */
export function suggestTitle(title: string | null, repo: string, startDay: number | null): string | null {
  if (!title || !repo) return null;
  const dates = [...title.matchAll(/(\d{1,2})-(\d{1,2})-(\d{4})/g)];
  const last = dates[dates.length - 1];
  if (!last) return null;
  let d = Number(last[1]);
  let m = Number(last[2]);
  const y = Number(last[3]);
  if (startDay !== null) {
    const near = (dd: number, mm: number): boolean => Math.abs(Date.UTC(y, mm - 1, dd) - startDay) <= MAX_TITLE_DRIFT_MS;
    if (!near(d, m) && m >= 1 && m <= 31 && d <= 12 && near(m, d)) [d, m] = [m, d];
    if (!near(d, m)) return null; // a date we cannot reconcile with the start day — leave it to the user
  }
  if (d < 1 || d > 31 || m < 1 || m > 12) return null;
  // a `_<n>` day counter right after the date is kept as the counter, not read as a topic word
  const after = title.slice((last.index ?? 0) + last[0].length);
  const counter = /^_([1-9]\d*)$/.exec(after)?.[1];
  // the words around the date, minus the repo name and a model word
  const rest = (title.slice(0, last.index) + (counter ? "" : after)).split(/[_\-\s]+/).filter(Boolean);
  const repoWords = repo.split(/[_\-\s]+/).filter(Boolean).map((w) => w.toLowerCase());
  let i = 0;
  while (i < repoWords.length && rest[i] && rest[i].toLowerCase() === repoWords[i]) i++;
  const words = i === repoWords.length ? rest.slice(i) : rest;
  const MODELS = /^(claude|codex|gpt\d*|gemini|cursor|copilot)$/i;
  const model = words[0] && MODELS.test(words[0]) ? words.shift()! : "Claude";
  const topic = words.filter((w) => /^[A-Za-z0-9]+$/.test(w));
  if (topic.length !== words.length) return null; // words we would have to drop — not ours to decide
  const next = [repo, model[0].toUpperCase() + model.slice(1), ...topic, `${d}-${m}-${y}`, ...(counter ? [counter] : [])].join("_");
  return standardTitle(next, repo) ? next : null;
}

export interface StoredSession {
  sessionId: string;
  file: string;
  cwd: string | null;
  repo: string;
  title: string | null;
  problem: string | null;
  startDay: number | null;
  lastActive: number;
}

/** Claude Code's project-folder name for a path: every `:` `\` `/` `_` `.` and space becomes `-`. */
export const projectDirName = (p: string): string => p.replace(/[\\/]+$/, "").replace(/[:\\/_. ]/g, "-").toLowerCase();

/**
 * EVERY session on disk (closed ones too — the session list shows them all), with its title and the rule verdict.
 *
 * The repo is the folder the session list groups it under — its PROJECT FOLDER, which Claude Code moves along when a
 * repo is renamed — NOT the `cwd` written in the old jsonl. Measured 2026-10-07: 38 sessions of `_DB_DataWarehouse`
 * still carry `cwd` `_DataWarehouse_Central` (the old name); judged by `cwd`, every correct `_DB_DataWarehouse_…`
 * title read as wrong. `roots` = the known repo folders; a project folder no root matches falls back to `cwd`.
 */
export function listStoredSessions(roots: string[] = []): StoredSession[] {
  const home = claudeHome();
  const pdir = join(home, "projects");
  if (!existsSync(pdir)) return [];
  const byDir = new Map(roots.map((r) => [projectDirName(r), basename(r.replace(/[\\/]+$/, ""))] as const));
  const cache = readCache();
  const out: StoredSession[] = [];
  for (const d of readdirSync(pdir)) {
    let files: string[];
    try {
      files = readdirSync(join(pdir, d)).filter((x) => x.endsWith(".jsonl"));
    } catch {
      continue;
    }
    for (const f of files) {
      const file = join(pdir, d, f);
      const title = lastTitle(file, cache);
      const startDay = startDayOf(file, cache);
      const cwd = cache[file]?.cwd ?? null;
      // No root and no cwd ⇒ the repo is UNKNOWN (""). Never fall back to the encoded folder name: a retitle built on it
      // wrote `D--w-Dept_FA_Claude_Dept_FA_1-9-2026` in the first test run — suggestTitle refuses an empty repo.
      const repo = byDir.get(d.toLowerCase()) ?? (cwd ? basename(cwd.replace(/[\\/]+$/, "")) : "");
      out.push({
        sessionId: basename(f, ".jsonl"),
        file,
        cwd,
        repo,
        title,
        problem: titleProblem(title, repo, startDay),
        startDay,
        lastActive: statSync(file).mtimeMs,
      });
    }
  }
  try {
    mkdirSync(dirname(cacheFile()), { recursive: true });
    writeFileSync(cacheFile(), JSON.stringify(cache));
  } catch {
    // a cache that cannot be written only costs speed
  }
  return out.sort((a, b) => a.repo.localeCompare(b.repo) || b.lastActive - a.lastActive);
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
    cwd: hit?.cwd,
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
