// plan/30 §3f ⑥ — in the container HS is read from git, not walked over the Windows-drive mount.
//
// Every file operation on the mount is a round trip (9p): measured 2026-11-04, one walk of docs_template (5,205 files) took
// 25–105 s and a sync of one repo with nothing to do 977.9 s, ~7% CPU, all waiting. A committed tree is read in one go
// instead: `git archive` of HEAD:docs_template unpacks onto the container's own disk, kept by its tree hash, and a sync or a
// conform reads that. Only what is committed is read - the same rule as plan/29 §14e: a part nobody committed does not
// travel. Natively (no ZEMORY_HS_FROM_GIT) nothing here runs and HS is read where it is.
//
// The store module reads ZEMORY_STORE_ROOT when it loads, so `useHsSnapshot` runs before it is imported (cli.ts).
import { execFileSync } from "node:child_process";
import { closeSync, copyFileSync, cpSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

export interface HsSnapshot {
  /** the clone that holds HS (ZEMORY_SELF) */
  self: string;
  /** the tree hash of HEAD:docs_template */
  tree: string;
  /** the unpacked tree as git has it, never written */
  pristine: string;
  /** this process's copy: what the store module reads, and what a rebuild of the sets writes into first */
  work: string;
}

let active: HsSnapshot | null = null;
/** The snapshot this process reads HS from, or null (native, or the snapshot could not be made). */
export const hsSnapshot = (): HsSnapshot | null => active;

const KEEP_TREES = 3;
const WORK_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * The line endings the clone's files have on disk, so the snapshot holds the same bytes. A clone on a Windows drive was
 * checked out by Git for Windows (core.autocrlf=true: text files without an `eol` attribute are CRLF on disk, LF in git);
 * git in the container has no such setting and would unpack them LF - measured 2026-11-04: 38 files of docs_template, which
 * every repo would then receive changed. ZEMORY_HS_AUTOCRLF overrides; else a Windows host path of the clone in
 * ZEMORY_PATH_MAP means true; else git's own setting.
 */
export function cloneAutocrlf(self: string): string | null {
  const set = process.env.ZEMORY_HS_AUTOCRLF?.trim();
  if (set) return set;
  for (const pair of String(process.env.ZEMORY_PATH_MAP ?? "").split(";")) {
    const [host, inner] = pair.split("=>");
    if (inner?.trim().replace(/\/+$/, "") === self.replace(/\/+$/, "")) return /^[A-Za-z]:/.test(host?.trim() ?? "") ? "true" : "false";
  }
  return null;
}

function cacheRoot(): string {
  return process.env.ZEMORY_HS_CACHE?.trim() || join(homedir(), "zemory", "cache", "hs");
}

/** Old trees beyond the newest few, and work copies a killed process left: removed. */
function prune(cache: string, keep: string): void {
  let names: string[];
  try {
    names = readdirSync(cache);
  } catch {
    return;
  }
  const at = (n: string): number => {
    try {
      return statSync(join(cache, n)).mtimeMs;
    } catch {
      return 0;
    }
  };
  for (const n of names.filter((n) => n.startsWith("work-") && Date.now() - at(n) > WORK_MAX_AGE_MS)) rmSync(join(cache, n), { recursive: true, force: true });
  // the temp folder and tar of an unpack whose process died (killed mid-unpack, or a version before unpackOnce)
  for (const n of names) {
    const m = /\.tmp-(\d+)(\.tar)?$/.exec(n);
    if (m && (!pidAlive(Number(m[1])) || Date.now() - at(n) > UNPACK_STALE_MS)) rmSync(join(cache, n), { recursive: true, force: true });
  }
  const trees = names.filter((n) => /^[0-9a-f]{40,64}(-a[0-9a-f]+)?(-crlf-\w+)?$/.test(n) && n !== keep).sort((a, b) => at(b) - at(a));
  for (const n of trees.slice(KEEP_TREES - 1)) rmSync(join(cache, n), { recursive: true, force: true });
}

const UNPACK_STALE_MS = 15 * 60_000;
const UNPACK_WAIT_MS = 10 * 60_000;

const pidAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
};

/**
 * Unpack one tree into `pristine`, once across processes. Measured 2026-11-11: test processes starting together on a new
 * HEAD each unpacked the same tree; every one but the first failed its rename, returned null and so read the WORKING HS -
 * the very edits in progress the snapshot exists to keep out - and left its temp folder behind (45 of them in the cache).
 * Now one process holds `<pristine>.lock` (`wx`) and unpacks; the others wait for `.done`. Its temp files always go.
 */
function unpackOnce(cache: string, pristine: string, tree: string, archive: (tar: string) => void): void {
  const done = join(pristine, ".done");
  const lock = `${pristine}.lock`;
  const end = Date.now() + UNPACK_WAIT_MS;
  for (;;) {
    if (existsSync(done)) return;
    try {
      closeSync(openSync(lock, "wx"));
    } catch {
      const age = Date.now() - (statOr(lock)?.mtimeMs ?? 0);
      if (age > UNPACK_STALE_MS) rmSync(lock, { force: true }); // its holder died
      else if (Date.now() > end) throw new Error("waited too long for another process to unpack HS");
      else Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
      continue;
    }
    const tmp = `${pristine}.tmp-${process.pid}`;
    const tar = `${tmp}.tar`;
    try {
      if (existsSync(done)) return;
      rmSync(pristine, { recursive: true, force: true });
      rmSync(tmp, { recursive: true, force: true });
      mkdirSync(tmp, { recursive: true });
      archive(tar);
      // relative names from the cache folder: GNU tar (first on PATH under Git Bash) reads `C:\…` as host `C`, file `\…`
      execFileSync("tar", ["-xf", basename(tar), "-C", basename(tmp)], { cwd: cache, windowsHide: true, stdio: "ignore" });
      writeFileSync(join(tmp, ".done"), tree + "\n");
      renameSync(tmp, pristine);
      return;
    } finally {
      rmSync(tar, { force: true });
      rmSync(tmp, { recursive: true, force: true });
      rmSync(lock, { force: true });
    }
  }
}

function statOr(p: string): { mtimeMs: number } | null {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

/**
 * Make (or reuse) the snapshot of the committed HS and point the store module at a copy of it. Returns null - and HS is
 * read from the clone as before - when not asked for, outside a git clone, or when git or tar fails (fail-open).
 */
export function useHsSnapshot(): HsSnapshot | null {
  if (active) return active;
  if (process.env.ZEMORY_HS_FROM_GIT !== "1") return null;
  const self = process.env.ZEMORY_SELF?.trim();
  if (!self || !existsSync(join(self, ".git"))) return null;
  const git = (args: string[]): string =>
    execFileSync("git", ["-C", self, ...args], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 20 }).trim();
  try {
    const tree = git(["rev-parse", "HEAD:docs_template"]);
    // the root .gitattributes says which files keep LF; archived from the subtree alone git would not see it (measured: every
    // .md of HS came out CRLF)
    let attrs = "";
    try {
      attrs = git(["rev-parse", "HEAD:.gitattributes"]).slice(0, 12);
    } catch {
      /* no attributes file */
    }
    const crlf = cloneAutocrlf(self);
    const cache = cacheRoot();
    // the bytes depend on the tree, the attributes and the line endings they were unpacked with
    const pristine = join(cache, `${tree}${attrs ? `-a${attrs}` : ""}${crlf ? `-crlf-${crlf}` : ""}`);
    mkdirSync(cache, { recursive: true });
    if (!existsSync(join(pristine, ".done"))) unpackOnce(cache, pristine, tree, (tar) => void git([...(crlf ? ["-c", `core.autocrlf=${crlf}`] : []), "archive", "--format=tar", "-o", tar, "HEAD", "docs_template"]));
    prune(cache, basename(pristine));
    const work = join(cache, `work-${process.pid}-${Date.now()}`);
    cpSync(pristine, work, { recursive: true });
    // read-only git in a part folder (`baseFiles`: the version a repo copy was made from) reads the clone's history
    writeFileSync(join(work, ".git"), `gitdir: ${join(self, ".git")}\n`);
    // the private-names list sits beside the clone, out of git (privateNameHits reads it from there)
    const names = join(self, "data", "private-names.txt");
    if (existsSync(names)) {
      mkdirSync(join(work, "data"), { recursive: true });
      copyFileSync(names, join(work, "data", "private-names.txt"));
    }
    process.env.ZEMORY_STORE_ROOT = work;
    process.on("exit", () => rmSync(work, { recursive: true, force: true }));
    active = { self, tree, pristine, work };
    return active;
  } catch {
    return null;
  }
}

/** Every file under a folder, as slash-separated paths relative to it. */
function filesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string, rel: string): void => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(join(d, e.name), r);
      else out.push(r);
    }
  };
  walk(dir, "");
  return out;
}

const readOr = (p: string): Buffer | null => {
  try {
    return readFileSync(p);
  } catch {
    return null;
  }
};
// Compared as git compares them under core.autocrlf: a CRLF and an LF copy of one text are the same file. Measured
// 2026-11-04 on the real clone: 50 of 5,153 committed files differ from the snapshot only so (tools wrote them LF, the
// checkout would write CRLF) - git calls them unchanged, and so must the write-back, or it keeps every such file back.
const lf = (b: Buffer): Buffer => (b.includes(13) ? Buffer.from(b.toString("latin1").replace(/\r\n/g, "\n"), "latin1") : b);
const same = (a: Buffer | null, b: Buffer | null): boolean => (a === null ? b === null : b !== null && (a.equals(b) || lf(a).equals(lf(b))));

/**
 * A set rebuilt in the work copy, written back to the clone: only the files that differ from the committed set, and
 * never over a file of the clone that someone changed and did not commit (it is kept and named). Compared on the
 * container's own disk; only the changed files cross the mount.
 */
export function writeBackSet(name: string): { written: string[]; removed: string[]; kept: string[] } {
  const s = active;
  const res = { written: [] as string[], removed: [] as string[], kept: [] as string[] };
  if (!s) return res;
  const base = join(s.pristine, "docs_template", name);
  const work = join(s.work, "docs_template", name);
  const real = join(s.self, "docs_template", name);
  const rels = new Set([...filesUnder(base), ...filesUnder(work)]);
  for (const rel of [...rels].sort()) {
    const parts = rel.split("/");
    const was = readOr(join(base, ...parts));
    const now = readOr(join(work, ...parts));
    if (same(was, now)) continue;
    const target = join(real, ...parts);
    if (!same(readOr(target), was)) {
      res.kept.push(`${name}/${rel}`);
      continue;
    }
    if (now === null) {
      unlinkSync(target);
      res.removed.push(`${name}/${rel}`);
    } else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, now);
      res.written.push(`${name}/${rel}`);
    }
  }
  return res;
}

/** The clone-side folder of HS state (locks): shared by every process, unlike the work copy. */
export function realStateDir(): string | null {
  return active ? join(active.self, "docs_template", ".harness-state") : null;
}
