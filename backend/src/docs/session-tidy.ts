// `zemory tidy` (plan/36): what a session left behind, measured from the session's own transcript - the 12 rows of
// Skill_Harness_SessionClose step 3b. "Made by the session" is read from its tool calls, never guessed from a file name.
// `apply` removes only what is safe by construction: the session's scratch folder, approval flags, stale locks, and the
// litter the session itself made inside the repo. Everything else is reported.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { encodeProjectDir } from "../memory/adapters/claudemem.js";

export type TidyRow = { n: number; what: string; items: string[]; removed: string[]; note?: string };
export type TidyReport = { session: string | null; transcript: string | null; rows: TidyRow[] };

/** A lock older than this is a dead holder's (the same cap the sync lock uses); a younger one may belong to a job running
 *  in the container, whose pid the host cannot see. */
export const STALE_LOCK_MS = 15 * 60_000;
const LITTER = /(^|[\\/])(_scratch_[^\\/]*|\.tmp[^\\/]*|[^\\/]+\.(bak|orig|rej))$/i;
const ARCHIVE = /\.(tar|zip|7z|bak)$/i;
const SHELL_VERBS = /^(new-item|ni|mkdir|md|copy-item|cp|copy|move-item|mv|out-file|set-content|tar)$/i;

const low = (p: string): string => resolve(p).replace(/[\\/]+$/, "").toLowerCase();
const under = (p: string, dir: string): boolean => { const a = low(p), b = low(dir); return a === b || a.startsWith(b + "\\") || a.startsWith(b + "/"); };

/** The transcript of a session: the given id, or the newest .jsonl in the repo's Claude Code session folder. */
export function findTranscript(repo: string, session: string | null, claudeHome = join(homedir(), ".claude")): string | null {
  const projects = join(claudeHome, "projects");
  if (!existsSync(projects)) return null;
  const want = encodeProjectDir(resolve(repo)).toLowerCase();
  const dirs = readdirSync(projects).filter((d) => d.toLowerCase() === want).map((d) => join(projects, d));
  const files = dirs.flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".jsonl")).map((f) => join(d, f)));
  if (session) return files.find((f) => basename(f, ".jsonl") === session) ?? null;
  return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] ?? null;
}

/** Tokens of one shell statement: quoted strings whole, bare words split on blanks. */
function tokens(s: string): string[] {
  return [...s.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3]);
}
const looksLikePath = (t: string): boolean => !t.startsWith("-") && !t.includes("$") && /[\\/]|\.[A-Za-z0-9]{1,5}$/.test(t);

/** The paths one shell command creates or writes: verb targets and redirections. */
export function shellTargets(command: string): string[] {
  const out: string[] = [];
  for (const m of command.matchAll(/(?:^|[^>&\d])\*?>{1,2}\s*("([^"]+)"|'([^']+)'|([^\s;|&)]+))/g)) {
    const t = m[2] ?? m[3] ?? m[4];
    if (t && !/^(\$null|nul|\/dev\/null|&\d)$/i.test(t) && looksLikePath(t)) out.push(t);
  }
  for (const st of command.split(/[;\n|]|&&/)) {
    const tk = tokens(st.trim());
    if (!tk.length || !SHELL_VERBS.test(tk[0])) continue;
    const verb = tk[0].toLowerCase();
    const args = tk.slice(1);
    const named = (flag: RegExp): string | undefined => { const i = args.findIndex((a) => flag.test(a)); return i >= 0 ? args[i + 1] : undefined; };
    const paths = args.filter((a, i) => looksLikePath(a) && !(i > 0 && /^-(itemtype|type|encoding|value|filter|include|exclude)$/i.test(args[i - 1])));
    if (verb === "tar") {
      const f = args.findIndex((a) => /^-[a-z]*c[a-z]*f$/i.test(a) || /^-[a-z]*f[a-z]*c$/i.test(a));
      if (f >= 0 && args[f + 1]) out.push(args[f + 1]);
    } else if (/^(copy-item|cp|copy|move-item|mv)$/.test(verb)) {
      const dest = named(/^-destination$/i) ?? paths[paths.length - 1];
      if (dest && paths.length + (named(/^-destination$/i) ? 1 : 0) >= 2) out.push(dest);
    } else if (/^(out-file|set-content)$/.test(verb)) {
      const p = named(/^-(filepath|path|literalpath)$/i) ?? paths[0];
      if (p) out.push(p);
    } else {
      const p = named(/^-(path|literalpath)$/i);
      out.push(...(p ? [p] : paths));
    }
  }
  return out.filter((t) => looksLikePath(t));
}

/** paths: what the session created or wrote whole · touched: every file it wrote or edited (finds the repos it was in) */
export type SessionTrace = { paths: string[]; touched: string[]; background: string[]; cwds: string[] };

/** What the transcript says the session wrote or created, and the background tasks it started that never reported an end
 *  (a task-notification with a final status, or a TaskStop of its id). */
export function traceSession(jsonl: string): SessionTrace {
  const paths = new Set<string>();
  const touched = new Set<string>();
  const cwds = new Set<string>();
  const started = new Map<string, string>(); // tool_use id -> what it runs
  const taskOf = new Map<string, string>(); // tool_use id -> background task id
  const ended = new Set<string>();
  for (const raw of jsonl.split("\n")) {
    if (!raw.includes("tool_use") && !raw.includes("tool_result") && !raw.includes("task-id")) continue;
    for (const m of raw.matchAll(/<task-id>([\w-]+)<\/task-id>[\s\S]*?<status>(completed|failed|killed|stopped)<\/status>/g)) ended.add(m[1]);
    for (const m of raw.matchAll(/Successfully stopped task: ([\w-]+)/g)) ended.add(m[1]);
    let j: { cwd?: string; message?: { content?: unknown } };
    try { j = JSON.parse(raw); } catch { continue; }
    const cwd = typeof j.cwd === "string" ? j.cwd : process.cwd();
    cwds.add(cwd);
    const content = Array.isArray(j.message?.content) ? (j.message!.content as Array<Record<string, unknown>>) : [];
    for (const c of content) {
      if (c.type === "tool_result" && typeof c.tool_use_id === "string" && started.has(c.tool_use_id)) {
        const text = typeof c.content === "string" ? c.content : JSON.stringify(c.content ?? "");
        const id = /background with ID: ([\w-]+)/.exec(text)?.[1];
        if (id) taskOf.set(c.tool_use_id, id);
        continue;
      }
      if (c.type !== "tool_use") continue;
      const input = (c.input ?? {}) as Record<string, unknown>;
      const name = String(c.name ?? "");
      if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(name) && typeof input.file_path === "string") touched.add(resolve(cwd, input.file_path));
      if (/^(Write|NotebookEdit)$/.test(name) && typeof input.file_path === "string") paths.add(resolve(cwd, input.file_path));
      if (/^(Bash|PowerShell)$/.test(name) && typeof input.command === "string") {
        for (const t of shellTargets(input.command)) paths.add(isAbsolute(t) ? resolve(t) : resolve(cwd, t));
        if (input.run_in_background === true && typeof c.id === "string") started.set(c.id, String(input.description ?? input.command).slice(0, 100));
      }
    }
  }
  const background = [...started].filter(([use]) => { const id = taskOf.get(use); return !id || !ended.has(id); }).map(([use, what]) => `${taskOf.get(use) ?? "?"} ${what}`);
  for (const p of paths) touched.add(p);
  return { paths: [...paths], touched: [...touched], background, cwds: [...cwds] };
}

/** The git root above a path, or null. */
function gitRoot(p: string): string | null {
  let d = existsSync(p) && statSync(p).isDirectory() ? p : dirname(p);
  for (let i = 0; i < 30; i++) {
    if (existsSync(join(d, ".git"))) return d;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
  return null;
}
const git = (cwd: string, ...a: string[]): string => {
  try { return execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8", windowsHide: true, maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }); } catch { return ""; }
};
function sizeOf(dir: string, cap = 400_000): number {
  let total = 0, seen = 0;
  const walk = (d: string): void => {
    let names: string[];
    try { names = readdirSync(d); } catch { return; }
    for (const n of names) {
      if (++seen > cap) return;
      const p = join(d, n);
      try { const s = statSync(p); if (s.isDirectory()) walk(p); else total += s.size; } catch { /* unreadable */ }
    }
  };
  walk(dir);
  return total;
}

export type TidyOptions = {
  repo: string;
  session?: string | null;
  apply?: boolean;
  claudeHome?: string;
  tempDir?: string;
  configFile?: string;
  dataCapBytes?: number;
  now?: number;
};

export function tidySession(o: TidyOptions): TidyReport {
  const repo = resolve(o.repo);
  const claudeHome = o.claudeHome ?? join(homedir(), ".claude");
  const transcript = findTranscript(repo, o.session ?? null, claudeHome);
  const session = transcript ? basename(transcript, ".jsonl") : o.session ?? null;
  const trace: SessionTrace = transcript ? traceSession(readFileSync(transcript, "utf8")) : { paths: [], touched: [], background: [], cwds: [] };
  // a file git tracks is the product being edited (row ⑦ shows it), never litter the session made
  const trackedIn = new Map<string, Set<string>>();
  const tracked = (p: string): boolean => {
    const r = gitRoot(p);
    if (!r) return false;
    if (!trackedIn.has(r)) trackedIn.set(r, new Set(git(r, "ls-files").split("\n").filter(Boolean).map((f) => low(join(r, f)))));
    return trackedIn.get(r)!.has(low(p));
  };
  const made = trace.paths.filter((p) => existsSync(p) && !tracked(p));
  const scratch = session ? join(o.tempDir ?? tmpdir(), "claude", encodeProjectDir(repo), session, "scratchpad") : null;
  const now = o.now ?? Date.now();
  const rm = (p: string): boolean => { try { rmSync(p, { recursive: true, force: true }); return !existsSync(p); } catch { return false; } };
  const row = (what: string, items: string[], removed: string[] = [], note?: string): TidyRow => ({ n: items.length - removed.length, what, items, removed, note });
  const rows: TidyRow[] = [];

  // ① litter in the repo: untracked files, scratch / temp / backup names
  const untracked = git(repo, "ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean).map((f) => join(repo, f));
  const litter = [...new Set([...untracked, ...made.filter((p) => under(p, repo) && LITTER.test(p))])];
  // removable = the session made it AND it is named as litter; a new source file the session wrote is work, not litter
  const mine1 = litter.filter((p) => LITTER.test(p) && made.some((m) => low(m) === low(p)));
  rows.push(row("stray files in the repo", litter, o.apply ? mine1.filter(rm) : [], mine1.length ? `${mine1.length} litter made by this session` : undefined));

  // ② the session's scratch folder
  const scratchFiles = scratch && existsSync(scratch) ? readdirSync(scratch).map((f) => join(scratch, f)) : [];
  rows.push(row("the session's scratch folder", scratchFiles, o.apply ? scratchFiles.filter(rm) : [], scratch ?? "no session found"));

  // ③ ④ what the session made outside the repo, and its backups
  const exempt = [claudeHome, ...(scratch ? [scratch] : [])];
  const outside = made.filter((p) => !under(p, repo) && !exempt.some((e) => under(p, e)));
  rows.push(row("made outside the repo, still there", outside.filter((p) => !ARCHIVE.test(p))));
  rows.push(row("backups the session took", made.filter((p) => ARCHIVE.test(p) && !exempt.some((e) => under(p, e)))));

  // ⑤ approval flags in this repo and every repo the session wrote into
  const repos = [...new Set([repo, ...trace.touched.filter((p) => existsSync(p)).map(gitRoot).filter((r): r is string => Boolean(r))].map((r) => resolve(r)))];
  const flags = repos.flatMap((r) => ["docs/hooks", "docs/.harness-state"].flatMap((d) => {
    const dir = join(r, d);
    return existsSync(dir) ? readdirSync(dir).filter((f) => f.startsWith(".allow-")).map((f) => join(dir, f)) : [];
  }));
  // only this repo's flags are removed: a flag in another repo may be a pending approval of that repo's own session
  rows.push(row("approval flags left", flags, o.apply ? flags.filter((f) => under(f, repo)).filter(rm) : [],
    flags.some((f) => !under(f, repo)) ? "flags in other repos are only reported" : undefined));

  // ⑥ background tasks the session started
  rows.push(row("background tasks started (check each ended)", trace.background, [], "only the transcript can name them; stop the ones still running"));

  // ⑦ ⑧ other repos the session wrote into: uncommitted edits, stashes, extra worktrees
  const others = repos.filter((r) => low(r) !== low(repo));
  rows.push(row("uncommitted edits in other repos", others.flatMap((r) => git(r, "status", "--short").split("\n").filter(Boolean).map((l) => `${r}: ${l.trim()}`))));
  rows.push(row("stashes and extra worktrees", repos.flatMap((r) => [
    ...git(r, "stash", "list").split("\n").filter(Boolean).map((l) => `${r}: ${l}`),
    ...git(r, "worktree", "list").split("\n").filter(Boolean).slice(1).map((l) => `${r}: worktree ${l}`),
  ])));

  // ⑨ stale locks
  const lockDirs = repos.map((r) => join(r, "docs", ".harness-state"));
  const locks = lockDirs.flatMap((d) => existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".lock")).map((f) => join(d, f)) : []);
  const stale = locks.filter((f) => {
    try { const h = JSON.parse(readFileSync(f, "utf8")) as { at?: number }; return !Number.isFinite(h.at) || now - (h.at as number) > STALE_LOCK_MS; } catch { return true; }
  });
  rows.push(row("stale locks", stale, o.apply ? stale.filter(rm) : []));

  // ⑩ writes on a forbidden drive (the machine declares them)
  let forbidden: string[] | null = null;
  try {
    const c = JSON.parse(readFileSync(o.configFile ?? join(homedir(), ".zemory", "config.json"), "utf8")) as { forbiddenDrives?: unknown };
    if (Array.isArray(c.forbiddenDrives)) forbidden = c.forbiddenDrives.map((d) => String(d).replace(/[:\\/]+$/, "").toUpperCase());
  } catch { /* none declared */ }
  const onForbidden = forbidden ? made.filter((p) => /^[A-Za-z]:/.test(p) && forbidden!.includes(p[0].toUpperCase()) && !exempt.some((e) => under(p, e))) : [];
  rows.push(row("written on a forbidden drive", onForbidden, [], forbidden ? undefined : "no forbiddenDrives declared in ~/.zemory/config.json"));

  // ⑪ gitignored folders at the repo root past the cap
  const cap = o.dataCapBytes ?? 2 * 1024 ** 3;
  const ignoredDirs = readdirSync(repo).filter((n) => n !== ".git" && statSync(join(repo, n)).isDirectory() && git(repo, "check-ignore", n).trim() !== "");
  const big = ignoredDirs.map((n) => ({ n, s: sizeOf(join(repo, n)) })).filter((x) => x.s > cap)
    .map((x) => `${x.n} ${(x.s / 1024 ** 3).toFixed(1)} GB`);
  rows.push(row("gitignored folders past the size cap", big));

  // ⑫ executables at the repo root
  rows.push(row("executables at the repo root", readdirSync(repo).filter((n) => /\.(cmd|sh|bat)$/i.test(n) && statSync(join(repo, n)).isFile())));

  return { session, transcript, rows };
}
