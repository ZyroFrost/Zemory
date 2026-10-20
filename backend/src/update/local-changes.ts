// Local edits in the tool's own tree before a self-update (plan/27 §2f): ask, never overwrite, never stop for nothing.
//
// `git pull --ff-only` refuses only when an incoming commit touches a file that is edited here. An edit the update does
// not touch stays as it is through the pull. So only the CLASHES need an answer, one per file: keep the local version
// (the default) or take the new one. Either way the local version is copied aside first, so no answer loses work:
//   data/selfupdate-keep/<stamp>/<path>       the local version of every clashing file
//   data/selfupdate-keep/<stamp>/manifest.json { keep: [...], take: [...] }
// Before the pull each clash is reset to HEAD (untracked: moved aside), so the pull goes through; after it the files
// marked `keep` are copied back on top of the new version and stay uncommitted. The updater that runs outside the
// daemon (backend/scripts/selfupdate-run.mjs) does that copy itself from the manifest, because dist/ is rebuilt under it.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface LocalChange {
  path: string;
  /** `git status --porcelain` code, e.g. ` M` · `??` */
  code: string;
}

export interface LocalChangePlan {
  ok: boolean;
  error?: string;
  /** every uncommitted change */
  dirty: LocalChange[];
  /** the ones an incoming commit also changes: they need an answer */
  clash: LocalChange[];
}

// trimEnd, never trim: porcelain lines start with a status column that may be a space (` M a.txt`) — trimming the whole
// output shifts the first path by one character, and that clash is never asked about.
const git = (root: string, args: string[]): string =>
  String(execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe", windowsHide: true, timeout: 5 * 60_000 })).trimEnd();

/** Parse `git status --porcelain` (v1): two status letters, a space, the path; a rename keeps the new path. */
export function parsePorcelain(out: string): LocalChange[] {
  return out
    .split(/\r?\n/)
    .filter((l) => l.length > 3)
    .map((l) => {
      let path = l.slice(3);
      const arrow = path.indexOf(" -> ");
      if (arrow >= 0) path = path.slice(arrow + 4);
      return { code: l.slice(0, 2), path: path.replace(/^"(.*)"$/, "$1") };
    });
}

/** Fetch, then say which local edits the update would also change. Read-only on the working tree. */
export function localChangePlan(root: string): LocalChangePlan {
  try {
    const dirty = parsePorcelain(git(root, ["status", "--porcelain", "--untracked-files=all"]));
    if (!dirty.length) return { ok: true, dirty, clash: [] };
    git(root, ["fetch", "--quiet"]);
    const incoming = new Set(git(root, ["diff", "--name-only", "HEAD", "@{u}"]).split(/\r?\n/).filter(Boolean));
    return { ok: true, dirty, clash: dirty.filter((d) => incoming.has(d.path)) };
  } catch (e) {
    const err = e as { stderr?: unknown; message?: string };
    return { ok: false, error: (String(err.stderr ?? "").trim() || err.message || "git failed").slice(0, 300), dirty: [], clash: [] };
  }
}

/**
 * Copy every clash aside, record the answers, and clear the clashes from the tree so the pull goes through. Returns the
 * folder holding the copies (the updater reads its manifest after the pull). `keep` lists the paths whose local version
 * wins; every other clash takes the new version — its local copy stays in the folder.
 */
export function setAsideClashes(root: string, clash: LocalChange[], keep: string[], stamp = new Date().toISOString().replace(/[:.]/g, "-")): string {
  const dir = join(root, "data", "selfupdate-keep", stamp);
  mkdirSync(dir, { recursive: true });
  const keepSet = new Set(keep);
  for (const c of clash) {
    const src = join(root, c.path);
    const dst = join(dir, c.path);
    mkdirSync(dirname(dst), { recursive: true });
    if (c.code === "??") {
      if (existsSync(src)) renameSync(src, dst); // untracked: moving it aside is what lets the pull add its own
    } else {
      if (existsSync(src)) copyFileSync(src, dst);
      git(root, ["checkout", "HEAD", "--", c.path]);
    }
  }
  const manifest = { keep: clash.filter((c) => keepSet.has(c.path)).map((c) => c.path), take: clash.filter((c) => !keepSet.has(c.path)).map((c) => c.path) };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return dir;
}

/**
 * After the pull: the kept local versions go back on top of the new one. `all` (the pull failed): every clash goes back,
 * so a failed update leaves the tree as it found it. A local deletion has no copy to bring back: the file stays.
 * Returns the paths restored.
 */
export function restoreKept(root: string, dir: string, all = false): string[] {
  const m = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as { keep: string[]; take: string[] };
  const out: string[] = [];
  for (const p of all ? [...m.keep, ...m.take] : m.keep) {
    const src = join(dir, p);
    if (!existsSync(src)) continue;
    mkdirSync(dirname(join(root, p)), { recursive: true });
    copyFileSync(src, join(root, p));
    out.push(p);
  }
  return out;
}
