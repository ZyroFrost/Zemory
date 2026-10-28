// Local auto-commit when a session's work piles up (plan/27 §2e). "Commit locally freely" was a permission nothing
// enforced, so a long session could sit on thousands of uncommitted lines — one bad command away from losing them. At the
// end of a turn, when the uncommitted lines in the files THIS session wrote pass the limit, those files (and only those)
// are committed locally. The commit is reversible and local:
//   · never pushed — the hook runs `git commit`, nothing else;
//   · only the session's own files (from its transcript: Write / Edit / MultiEdit / NotebookEdit), and only inside the repo
//     the session runs in — another session's half-done edits in the same tree are not swept in;
//   · through the repo's own pre-commit hook (the secret latch): a blocked commit stays uncommitted and is reported.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { parsePorcelain } from "../update/local-changes.js";
import { toLocalPath } from "../util/hostpath.js";

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

const git = (root: string, args: string[]): string =>
  String(execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe", windowsHide: true, timeout: 60_000 })).trimEnd();

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
export function autoCommit(root: string, transcriptText: string, limit = AUTO_COMMIT_LINES): AutoCommitResult | null {
  try {
    // the session may run in a subfolder; outside any git tree rev-parse throws ⇒ null below
    const top = canon(git(root, ["rev-parse", "--show-toplevel"]));
    const rel = (hostFile: string): string | null => {
      // the transcript names host paths; in the container they sit under the mounts (identity on a native install)
      const f = toLocalPath(hostFile);
      const r = relative(top, canon(isAbsolute(f) ? f : resolve(root, f))).replace(/\\/g, "/");
      return r && !r.startsWith("..") && !isAbsolute(r) ? r : null;
    };
    const written = sessionWrittenFiles(transcriptText).map(rel).filter((x): x is string => Boolean(x));
    if (!written.length) return null;
    const dirty = parsePorcelain(git(top, ["status", "--porcelain", "--untracked-files=all"]));
    const mine = dirty.filter((d) => written.some((w) => sameFile(w, d.path)));
    if (!mine.length) return null;
    let lines = 0;
    const tracked = mine.filter((d) => d.code !== "??").map((d) => d.path);
    if (tracked.length) {
      for (const l of git(top, ["diff", "--numstat", "HEAD", "--", ...tracked]).split(/\r?\n/)) {
        const [a, d] = l.split("\t");
        lines += (Number(a) || 0) + (Number(d) || 0); // a binary file reads "-": counted as 0
      }
    }
    for (const d of mine.filter((m) => m.code === "??")) {
      const p = join(top, d.path);
      if (existsSync(p) && statSync(p).isFile()) lines += readFileSync(p, "utf8").split("\n").length;
    }
    const files = mine.map((d) => d.path);
    if (lines <= limit) return { committed: false, lines, files, note: `under the limit (${lines} ≤ ${limit})` };
    const subject = `Auto-commit: this session's uncommitted work passed ${limit} lines (${lines} lines, ${files.length} file(s))`;
    const body = files.slice(0, 30).map((f) => `- ${f}`).join("\n") + (files.length > 30 ? `\n- … ${files.length - 30} more` : "");
    try {
      git(top, ["add", "--", ...files]);
      // `--only` with pathspecs: exactly these files, whatever else sits in the index
      git(top, ["commit", "--only", "-m", subject, "-m", body, "--", ...files]);
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
