// Local auto-commit when a session's work piles up (plan/27 §2e). "Commit locally freely" was a permission nothing
// enforced, so a long session could sit on thousands of uncommitted lines — one bad command away from losing them. At the
// end of a turn, when the uncommitted lines in the files THIS session wrote pass the limit, those files (and only those)
// are committed locally. The commit is reversible and local:
//   · never pushed — the hook runs `git commit`, nothing else;
//   · only the session's own files (from its transcript: Write / Edit / MultiEdit / NotebookEdit), and only inside the repo
//     the session runs in — another session's half-done edits in the same tree are not swept in;
//   · through the repo's own pre-commit hook (the secret latch): a blocked commit stays uncommitted and is reported.
// Cost: git is asked about the session's files only - never a whole-tree `git status`, which over the container's 9p mount
// re-hashes every file of a Windows-written index (measured 2026-11-09: 37-145 s on this repo, so the Stop hook missed its
// deadline every turn). The transcript is read from where the previous turn stopped (`sessionWrittenFilesAt`).
import { execFileSync } from "node:child_process";
import { closeSync, existsSync, fstatSync, openSync, readFileSync, readSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { toHostPath, toLocalPath } from "../util/hostpath.js";

export const AUTO_COMMIT_LINES = 300;

const EDIT_TOOLS = ["Write", "Edit", "MultiEdit", "NotebookEdit"];

/** Every file the session wrote, as the transcript records it (absolute paths as the tools received them). */
export function sessionWrittenFiles(transcriptText: string): string[] {
  const out = new Set<string>();
  for (const line of transcriptText.split("\n")) {
    if (!line.includes('"tool_use"')) continue;
    let j: { type?: string; message?: { content?: unknown } };
    try {
      j = JSON.parse(line);
    } catch {
      continue;
    }
    if (j.type !== "assistant" || !Array.isArray(j.message?.content)) continue;
    for (const c of j.message.content as Array<{ type?: string; name?: string; input?: Record<string, unknown> }>) {
      if (c?.type !== "tool_use" || !EDIT_TOOLS.includes(c.name ?? "")) continue;
      const f = String(c.input?.file_path ?? c.input?.notebook_path ?? "");
      if (f) out.add(f);
    }
  }
  return [...out];
}

/** What a transcript file has given so far: its size read, the unfinished last line, and the files written in it. */
interface Seen {
  size: number;
  carry: Buffer;
  files: Set<string>;
}
const seen = new Map<string, Seen>();
const SEEN_MAX = 64;

/**
 * `sessionWrittenFiles` over a transcript FILE, reading only what was appended since the last call (a transcript only grows;
 * a smaller file means a new one and it is read from the start). The cut is made at the last newline byte, so a line - and a
 * multi-byte letter - is never split. Kept per process; the first call of a session reads the whole file once.
 */
export function sessionWrittenFilesAt(path: string): string[] {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    let s = seen.get(path);
    if (!s || size < s.size) s = { size: 0, carry: Buffer.alloc(0), files: new Set() };
    if (size > s.size) {
      const fresh = Buffer.allocUnsafe(size - s.size);
      let got = 0;
      while (got < fresh.length) {
        const n = readSync(fd, fresh, got, fresh.length - got, s.size + got);
        if (n <= 0) break;
        got += n;
      }
      const buf = s.carry.length ? Buffer.concat([s.carry, fresh.subarray(0, got)]) : fresh.subarray(0, got);
      const cut = buf.lastIndexOf(0x0a) + 1;
      for (const file of sessionWrittenFiles(toolLines(buf, cut))) s.files.add(file);
      s = { size: s.size + got, carry: Buffer.from(buf.subarray(cut)), files: s.files };
    }
    seen.delete(path);
    seen.set(path, s);
    if (seen.size > SEEN_MAX) seen.delete(seen.keys().next().value as string);
    // the unfinished tail counts too when it already parses (a transcript whose last line has no newline yet)
    const tail = s.carry.length ? sessionWrittenFiles(s.carry.toString("utf8")) : [];
    return [...new Set([...s.files, ...tail])];
  } finally {
    closeSync(fd);
  }
}

const TOOL_USE = Buffer.from('"tool_use"');

/** Only the lines of `buf[0, end)` that carry a tool call, decoded - the rest of a long transcript is never turned into a
 *  string (the whole 18 MB decoded cost about a second on a cold Stop hook). */
function toolLines(buf: Buffer, end: number): string {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = buf.indexOf(TOOL_USE, from);
    if (at < 0 || at >= end) break;
    const start = buf.lastIndexOf(0x0a, at) + 1;
    let stop = buf.indexOf(0x0a, at);
    if (stop < 0 || stop > end) stop = end;
    out.push(buf.toString("utf8", start, stop));
    from = stop + 1;
  }
  return out.join("\n");
}

/** Forget what was read (tests). */
export function forgetSessionFiles(): void {
  seen.clear();
}

// literal pathspecs: a file named `a[1].ts` is that file, not a pattern
const git = (root: string, args: string[], input?: string): string =>
  String(
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
      windowsHide: true,
      timeout: 60_000,
      // check-ignore refuses the literal magic; it reads its paths from stdin, which are taken as they are anyway
      env: args.includes("check-ignore") ? process.env : { ...process.env, GIT_LITERAL_PATHSPECS: "1" },
      ...(input === undefined ? {} : { input }),
    }),
  ).trimEnd();

/** One spelling per path: git prints the long form, a tool may hold an 8.3 short one (`HUY~1.NGU`) — compared raw, every
 *  file of the session would look outside the repo. A deleted file has no real path: its folder is resolved instead. */
function canon(p: string): string {
  try {
    return realpathSync.native(p);
  } catch {
    try {
      return join(realpathSync.native(dirname(p)), basename(p));
    } catch {
      return resolve(p);
    }
  }
}

/**
 * The line endings the host's git checked the clone out with. In the container git has no core.autocrlf, so on a Windows
 * drive every text file without an `eol` attribute (CRLF on disk, LF in git) reads as wholly changed - measured 2026-11-09:
 * LICENSE 199/199 - and a commit from there would store the CR bytes. A clone whose host path is a Windows drive is read
 * with core.autocrlf=true; natively, git's own setting stands.
 */
export function crlfArgs(top: string, platform: string = process.platform): string[] {
  if (platform === "win32") return [];
  return /^[A-Za-z]:/.test(toHostPath(top)) ? ["-c", "core.autocrlf=true"] : [];
}

const sameFile =(a: string, b: string): boolean => (process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b);

export interface AutoCommitResult {
  committed: boolean;
  lines: number;
  files: string[];
  /** why nothing was committed, or the commit's subject */
  note: string;
}

/**
 * Measure, and commit when over the limit. `root` is the repo the session runs in; null when there is nothing to do (no
 * git, nothing of this session uncommitted). Never throws.
 */
export function autoCommit(root: string, transcript: string | string[], limit = AUTO_COMMIT_LINES): AutoCommitResult | null {
  try {
    // the session may run in a subfolder; outside any git tree rev-parse throws ⇒ null below
    const top = canon(git(root, ["rev-parse", "--show-toplevel"]));
    const dirs = new Map<string, string>();
    const eol = crlfArgs(top);
    const rel = (hostFile: string): string | null => {
      // the transcript names host paths; in the container they sit under the mounts (identity on a native install)
      const f = toLocalPath(hostFile);
      const abs = isAbsolute(f) ? f : resolve(root, f);
      const dir = dirname(abs);
      let real = dirs.get(dir);
      if (real === undefined) dirs.set(dir, (real = canon(dir)));
      const r = relative(top, join(real, basename(abs))).replace(/\\/g, "/");
      return r && !r.startsWith("..") && !isAbsolute(r) ? r : null;
    };
    const listed = typeof transcript === "string" ? sessionWrittenFiles(transcript) : transcript;
    const written = [...new Set(listed.map(rel).filter((x): x is string => Boolean(x)))];
    if (!written.length) return null;
    // the index alone says which are tracked (no stat, no hashing); the rest that exist are untracked unless ignored
    const inIndex = git(top, [...eol, "ls-files", "-z", "--", ...written]).split("\0").filter(Boolean);
    const isTracked = (w: string) => inIndex.some((t) => sameFile(t, w));
    const isFile = (w: string) => {
      const p = join(top, w);
      return existsSync(p) && statSync(p).isFile();
    };
    const fresh = written.filter((w) => !isTracked(w) && isFile(w));
    let ignored: string[] = [];
    if (fresh.length) {
      try {
        ignored = git(top, [...eol, "check-ignore", "-z", "--stdin"], fresh.join("\0") + "\0").split("\0").filter(Boolean);
      } catch (e) {
        if ((e as { status?: number }).status !== 1) throw e; // 1 = none of them is ignored
      }
    }
    const untracked = fresh.filter((w) => !ignored.some((i) => sameFile(i, w)));
    // tracked, or gone from the disk (a deletion): what differs from HEAD, per file. -z keeps odd names unquoted.
    const others = written.filter((w) => !fresh.includes(w));
    const changed: string[] = [];
    let lines = 0;
    if (others.length) {
      const out = git(top, [...eol, "diff", "--numstat", "--no-renames", "-z", "HEAD", "--", ...others]);
      for (const rec of out.split("\0").filter(Boolean)) {
        const [a, d, path] = rec.split("\t");
        if (!path) continue;
        changed.push(path);
        lines += (Number(a) || 0) + (Number(d) || 0); // a binary file reads "-": counted as 0
      }
    }
    for (const w of untracked) lines += readFileSync(join(top, w), "utf8").split("\n").length;
    const files = [...changed, ...untracked];
    if (!files.length) return null;
    if (lines <= limit) return { committed: false, lines, files, note: `under the limit (${lines} ≤ ${limit})` };
    const subject = `Auto-commit: this session's uncommitted work passed ${limit} lines (${lines} lines, ${files.length} file(s))`;
    const body = files.slice(0, 30).map((f) => `- ${f}`).join("\n") + (files.length > 30 ? `\n- … ${files.length - 30} more` : "");
    try {
      git(top, [...eol, "add", "--", ...files]);
      // `--only` with pathspecs: exactly these files, whatever else sits in the index
      git(top, [...eol, "commit", "--only", "-m", subject, "-m", body, "--", ...files]);
    } catch (e) {
      const err = e as { stderr?: unknown; stdout?: unknown; message?: string };
      const why = (String(err.stderr ?? "") + String(err.stdout ?? "")).trim().split(/\r?\n/).slice(-3).join(" | ") || err.message || "git failed";
      return { committed: false, lines, files, note: `commit refused: ${why.slice(0, 300)}` };
    }
    return { committed: true, lines, files, note: subject };
  } catch {
    return null; // fail-open — a convenience must never break the end of a turn
  }
}
