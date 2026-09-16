// Dead-path check (plan/21) — do the file paths written in docs/config still point at something?
//
// Why it exists: this machine's tree was moved three times and renamed many more, and every time
// the docs of every repo rotted silently — 22 broken paths in one repo, 10 in another, one inside
// an error message (measured 2026-09-09). `validate.ts` §1 only follows markdown links under docs/.
//
// Three rules keep this from becoming the gate everyone learns to ignore (the negative-filter draft
// produced 164 "dead" paths on this very repo with ~0 real ones):
//   1. POSITIVE filter — a path is judged only when it sits under a declared root that exists on
//      THIS machine. Everything else is listed as `unresolved` with a reason, never called dead.
//      (No remoteRoots / virtualRoots / noise patterns: exclusion lists rot exactly like the paths
//      they were meant to police.)
//   2. Only DELIMITED strings are judged (backticks · quotes · link targets · <…>). A bare
//      `C:\Program Files\x` has no right edge, so any regex cuts it at the space and then reports
//      `C:\Program` as missing — the largest false-positive class on Windows.
//   3. Three buckets, and only `dead` may turn `--gate` red. `history` (archive/ · attic/ ·
//      06_CHANGES · dated files · dated/superseded lines) is a record of a measurement; editing it
//      would destroy evidence. `unresolved` is "we do not know", said out loud with a count.
//
// Deterministic, read-only, 0 LLM (HP điều 6①). Never writes anything (điều 3). Fail-open (điều 9):
// a file that cannot be read becomes one `unresolved: io-error`, never an exception.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { Context } from "../core/types.js";
import { currentMemoryDir } from "../memory/db.js";
import { writeJsonAtomic } from "../util/fs-atomic.js";
import { standardNames } from "./structure-tree.js";

export interface PathHit {
  /** repo-relative (posix) path of the file that contains the string */
  file: string;
  line: number;
  /** the path string as written (trimmed of trailing punctuation) */
  text: string;
  /** only on `unresolved`: why no verdict was reached */
  reason?: UnresolvedReason;
}
export type UnresolvedReason =
  | "outside-roots"
  | "root-absent"
  | "undelimited"
  | "placeholder"
  | "escape"
  | "not-a-path"
  | "shape-ambiguous"
  | "dictionary"
  | "slot-name"
  | "excluded-target"
  | "io-error";

export interface PathsReport {
  root: string;
  roots: { declared: string[]; used: string[]; absent: string[] };
  scanned: { files: number; strings: number };
  dead: PathHit[];
  history: PathHit[];
  unresolved: PathHit[];
  /** true ⇔ dead.length === 0 — the only thing `--gate` looks at */
  ok: boolean;
  /** posix, root-relative paths of every listed file — the set `proposeFixes` searches (not printed by the CLI) */
  files?: string[];
}

/** Phase 1 file set: docs + config/runbook. Code strings are phase 2 (plan/21 §4.1). */
export const PHASE1_EXT = /\.(md|json|jsonc|ya?ml|toml|ini|ps1|sh|vbs|cmd|bat)$/i;
const BIN_EXT = /\.(png|jpe?g|gif|ico|webp|svg|pdf|zip|7z|rar|exe|dll|db|enc|onnx|wasm|woff2?|ttf|mp4|mp3)$/i;
export const DEFAULT_EXCLUDE = ["data/", "dist/", "attic/", "external/", "node_modules/", ".venv/", ".git/"];
const DEFAULT_MAX_KB = 512;
/** Lockfiles are config by extension but their "paths" are package keys (`node_modules/x`) — never pointers. */
const LOCKFILE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|poetry\.lock|composer\.lock)$/i;

/** Files whose ROLE is a dictionary of names, not a set of pointers: the standard docs shipped from the
 *  template (01–04), the templates themselves, and skill playbooks. Their relative paths name SLOTS
 *  (`backend/src/api/`) — the repo's own words: "INDEX = TỪ ĐIỂN TÊN, KHÔNG phải checklist phải tạo".
 *  Measured 2026-09-09 on zemory: 152 of 195 "dead" hits were exactly this. Relative strings in these
 *  files are `unresolved: dictionary`; ABSOLUTE strings are still judged (an absolute path inside a
 *  template is a real smell). 05_TODO / 06_CHANGES / docs/plan are NOT dictionaries — they point. */
export function isDictionaryFile(relPath: string): boolean {
  const p = posix(relPath);
  return (
    // AGENTS.md is the template's router text: it names slots that exist LATER (`docs/agent/archive/`,
    // `attic/dead-plans/`). Measured 2026-09-09 on Dept_IC — hand-count 0, machine said 2, both from here.
    /^AGENTS\.md$/.test(p) ||
    /(^|\/)docs\/agent\/0[1-4]_[^/]+\.md$/.test(p) ||
    /(^|\/)docs_template\//.test(p) ||
    /(^|\/)\.claude\/skills\//.test(p) ||
    /(^|\/)skills\/[^/]+\/(SKILL\.md|reference\/)/.test(p)
  );
}

const posix = (p: string): string => p.replace(/\\/g, "/");
/** Case-insensitive on Windows (drive letters and folder names both); exact elsewhere. */
const canon = (p: string): string => (process.platform === "win32" ? resolve(p).toLowerCase() : resolve(p));
const under = (abs: string, root: string): boolean => {
  const a = canon(abs), r = canon(root);
  return a === r || a.startsWith(r.endsWith("/") || r.endsWith("\\") ? r : r + (process.platform === "win32" ? "\\" : "/"));
};

// ── history markers ───────────────────────────────────────────────────────────
/** By FILE: archive/ · attic/ · 06_CHANGES.md · a date in the file name. */
export function isHistoryFile(relPath: string): boolean {
  const p = posix(relPath);
  const name = p.split("/").pop() ?? "";
  return /(^|\/)docs\/agent\/archive\//.test(p) || /(^|\/)attic\//.test(p) || /(^|\/)06_CHANGES\.md$/.test(p) || /\d{4}-\d{2}-\d{2}/.test(name);
}
/** By LINE: an ISO date or a supersede marker. History also lives inside live files (a comment in
 *  config.ts still names the 2026-07 location) — the file rule alone mis-files those as dead.
 *  Deliberately NO Vietnamese word list ("cũ" · "từng"): "từng bước" and "code cũ" are everyday
 *  words in live instructions, and the ASCII `\b` of JS does not even delimit them correctly. */
export function isHistoryLine(line: string): boolean {
  return /\d{4}-\d{2}-\d{2}/.test(line) || /🔄|⤴|Supersede/u.test(line);
}

// ── extraction ────────────────────────────────────────────────────────────────
export interface Candidate {
  text: string;
  /** false ⇒ bare string: listed as `undelimited`, never judged */
  delimited: boolean;
}

const ABS_WIN = /^[A-Za-z]:[\\/]/;
const UNC = /^\\\\[^\\/]+[\\/]/;
const REL = /^\.{1,2}[\\/]/;

/** All path-shaped strings on one line, with whether each came out of a delimiter. */
export function extractCandidates(line: string, opts: { linkTargets: boolean }): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const push = (raw: string, delimited: boolean) => {
    const text = raw.trim().replace(/[.,;:]+$/, "");
    if (!text || seen.has(text)) return;
    if (!looksPathish(text)) return;
    seen.add(text);
    out.push({ text, delimited });
  };
  // Delimited: backticks · double/single quotes · <…> · markdown link targets.
  for (const m of line.matchAll(/`([^`]+)`/g)) push(m[1], true);
  for (const m of line.matchAll(/"([^"]+)"/g)) push(m[1], true);
  for (const m of line.matchAll(/'([^']+)'/g)) push(m[1], true);
  for (const m of line.matchAll(/<((?:[A-Za-z]:|\\\\|\.{1,2}[\\/])[^>]+)>/g)) push(m[1], true);
  if (opts.linkTargets) for (const m of line.matchAll(/\]\(([^)\s]+)\)/g)) push(m[1].split("#")[0], true);
  // Bare absolute / UNC strings: recorded so the report can count them, never judged.
  const stripped = line.replace(/`[^`]*`|"[^"]*"|'[^']*'/g, " ");
  for (const m of stripped.matchAll(/(?:^|[\s(=[])((?:[A-Za-z]:\\|\\\\[^\\/\s]+\\)[^\s"'`<>|)\]]+)/g)) push(m[1], false);
  return out;
}

/** Cheap shape test so prose in quotes ("hello world") is not treated as a path. */
function looksPathish(s: string): boolean {
  if (ABS_WIN.test(s) || UNC.test(s) || REL.test(s) || /^~[\\/]/.test(s)) return true;
  if (/^HK[A-Z]{2,4}:/i.test(s) || /^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return true; // caught later as not-a-path
  // Relative without ./: needs a separator, ≥2 segments, and either an extension or a trailing slash,
  // so `vi/en` or `a/b` in prose is not judged (→ shape-ambiguous only if it has a separator).
  if (!/[\\/]/.test(s) || /\s/.test(s)) return false;
  return true;
}

// ── classification ────────────────────────────────────────────────────────────
interface Judge {
  root: string;
  roots: { declared: string[]; present: string[] };
  /** posix, root-relative paths of EVERY listed file (before the extension filter) — for suffix matching */
  files?: string[];
  /** every NAME the standard declares (SLOT_ROLES + root roles + this repo's 03 §3 tree) — see `standardNames` */
  names?: Set<string>;
  /** the scan's own `exclude` list — pointers INTO those dirs are not judged either (see `excluded-target`) */
  exclude?: string[];
}

type Verdict = { kind: "ok" } | { kind: "dead" } | { kind: "unresolved"; reason: UnresolvedReason };

export function classify(c: Candidate, file: string, judge: Judge, opts: { dictionary?: boolean } = {}): Verdict {
  let s = c.text;
  if (!c.delimited) return { kind: "unresolved", reason: "undelimited" };
  if (/^HK[A-Z]{2,4}:/i.test(s) || /^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return { kind: "unresolved", reason: "not-a-path" };
  // `origin/master..HEAD` is a git RANGE, not a file: two dots INSIDE a segment (not the `..` parent segment).
  // Found by the first real sweep (DuAnA 05_TODO, 2026-09-09) — `.HEAD` looked like an extension.
  if (/[^.\\/]\.\.[^.\\/]/.test(s)) return { kind: "unresolved", reason: "not-a-path" };
  // `%APPDATA%`, `$HOME`, `${var}` are environment placeholders, not folders (plan/20 names the MSIX path that way).
  if (/[<>{}…*?]/.test(s) || /%[^%\\/]+%/.test(s) || /\$[A-Za-z_{]/.test(s) || /(^|[\\/])N{1,2}([\\/_]|$)/.test(s)) return { kind: "unresolved", reason: "placeholder" };
  if (/^[A-Za-z]:\\[nrt0abfv](?![\\/])/.test(s) && s.split(/[\\/]/).length < 3) return { kind: "unresolved", reason: "escape" };
  // `~` is a real convention (README, runbooks) — expand it, then treat as absolute.
  if (/^~[\\/]/.test(s)) s = join(homedir(), s.slice(2));
  const absolute = ABS_WIN.test(s) || UNC.test(s) || (isAbsolute(s) && !s.startsWith("."));
  // Dictionary files: relative strings name slots, not places. Absolute ones are still judged.
  if (opts.dictionary && !absolute) return { kind: "unresolved", reason: "dictionary" };

  let abs: string;
  if (absolute) {
    abs = s;
  } else if (REL.test(s) || /[\\/]/.test(s)) {
    // relative: ≥2 segments and (extension | trailing slash | explicit ./ ../) — else ambiguous prose
    const segs = s.split(/[\\/]/).filter(Boolean);
    const explicit = REL.test(s);
    const hasExt = /\.[A-Za-z0-9]{1,8}$/.test(segs[segs.length - 1] ?? "");
    const trailing = /[\\/]$/.test(s);
    if (!explicit && !(segs.length >= 2 && (hasExt || trailing))) return { kind: "unresolved", reason: "shape-ambiguous" };
    if (segs.every((g) => g.startsWith("."))) return { kind: "unresolved", reason: "shape-ambiguous" }; // `.go/.java/.sh` = an extension list
    const fromFile = resolve(dirname(file), s);
    const fromRoot = resolve(judge.root, s);
    if (existsSync(fromFile) || existsSync(fromRoot)) return { kind: "ok" };
    // The repo's docs abbreviate paths by dropping the top (`memory/x.ts` for `backend/src/memory/x.ts`).
    // Resolve that DETERMINISTICALLY against the listed files: a unique-suffix hit is `ok`. Same idea as
    // graph's tail-match (`plan/13 §0b`), and just as with graph it never invents a file — the suffix must
    // exist in the list. A moved file (`backend/src/settings.ts` → `config/settings.ts`) does NOT match
    // because the suffix `src/settings.ts` is gone — which is exactly the rot this check is for.
    if (!explicit && judge.files) {
      const suf = posix(s).replace(/^\.\//, "").replace(/\/+$/, "");
      if (judge.files.some((f) => f === suf || f.endsWith("/" + suf) || f.startsWith(suf + "/") || f.includes("/" + suf + "/"))) return { kind: "ok" };
    }
    // Pointers INTO an excluded dir (`dist/` · `data/` · `node_modules/`) are not judged: those trees are
    // build/runtime output whose presence depends on the machine, not on the docs — `dist\\App\\sync\\` in a
    // build script is right on the machine that built and "dead" on the one that did not (DuAnA, 2026-09-09).
    // Same contract as the scan set: what we do not walk, we do not judge.
    if (!explicit && judge.exclude && excluded(posix(s).replace(/^\.\//, ""), judge.exclude)) return { kind: "unresolved", reason: "excluded-target" };
    // Prose uses "/" as "or": `KHÔNG backend/frontend/` names two top-level folders, not a nested path.
    // If EVERY segment is itself an existing entry at the repo root, that is what it is — abstain.
    // (Checked only after real resolution failed, so a genuine `docs/agent/` still resolves as `ok`.)
    if (!explicit && segs.length >= 2 && segs.every((g) => existsSync(join(judge.root, g)))) return { kind: "unresolved", reason: "shape-ambiguous" };
    // Slot NAMES are dictionary words, not pointers — wherever they appear (plan/21 §4.3). `frontend/config/`
    // in a spec says where a concern WOULD live, not that this repo has that folder; 4 of zemory's 9
    // "legacy dead" were exactly this (2026-09-09). Deterministic and POSITIVE: the set is what the
    // standard itself declares (`standardNames`), no denylist. Only when EVERY segment is a name — a file
    // leaf (`docs/dictionary.md`) or a moved file (`backend/src/settings.ts`) is still judged, and
    // `frontend/zzz/` (one segment not a name) is still dead. Explicit `./` pointers are never exempt.
    // Runs AFTER the "/"-as-"or" rule: `backend/docs/` (both real root entries) keeps its more specific reason.
    if (!explicit && judge.names && segs.every((g) => judge.names!.has(g))) return { kind: "unresolved", reason: "slot-name" };
    // Neither resolved: judged as dead only if the resolution stays under a present root.
    abs = under(fromFile, judge.root) ? fromFile : fromRoot;
  } else {
    return { kind: "unresolved", reason: "shape-ambiguous" };
  }

  const declaredHit = judge.roots.declared.find((r) => under(abs, r));
  if (!declaredHit) return { kind: "unresolved", reason: "outside-roots" };
  if (!judge.roots.present.includes(declaredHit)) return { kind: "unresolved", reason: "root-absent" };
  return existsSync(abs) ? { kind: "ok" } : { kind: "dead" };
}

// ── file set ──────────────────────────────────────────────────────────────────
function tracked(root: string): string[] | null {
  try {
    const out = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] });
    return out.split("\0").filter(Boolean).map((f) => join(root, f));
  } catch {
    return null; // not a git repo (test fixtures, plain folders) → walk instead
  }
}

function excluded(rel: string, exclude: string[]): boolean {
  const r = posix(rel);
  return exclude.some((e0) => {
    const e = posix(e0).replace(/^\.\//, "").replace(/\/+$/, "");
    return e !== "" && (r === e || r.startsWith(e + "/") || r.includes("/" + e + "/"));
  });
}

function walk(root: string, exclude: string[], out: string[], depth = 12): void {
  if (depth < 0) return;
  let names: string[];
  try {
    names = readdirSync(root);
  } catch {
    return;
  }
  for (const n of names) {
    const p = join(root, n);
    if (excluded(relative(root, p) || n, exclude) || excluded(n, exclude)) continue;
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, exclude, out, depth - 1);
    else out.push(p);
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
export function pathsCheck(ctx: Context): PathsReport {
  const root = resolve(ctx.projectRoot);
  const cfg = ctx.config.pathCheck ?? {};
  const declared = (cfg.roots && cfg.roots.length ? cfg.roots : [root]).map((r) => (isAbsolute(r) ? resolve(r) : resolve(root, r)));
  const present = declared.filter((r) => existsSync(r));
  const absent = declared.filter((r) => !existsSync(r));
  const exclude = cfg.exclude ?? DEFAULT_EXCLUDE;
  const maxBytes = (cfg.maxFileKB ?? DEFAULT_MAX_KB) * 1024;

  // File set = tracked files of the repo (or a walk when there is no git) ∪ a walk of every other
  // present root. Both go through the same exclude/extension/size filter.
  const files = new Set<string>();
  const fromGit = tracked(root);
  // `git ls-files` lists the INDEX, not the disk: a file renamed or deleted on disk stays listed until
  // someone commits. Without this filter the suffix match "found" a file that no longer existed and the
  // real-world trial (rename a file a live spec points to) reported 0 newly dead — while the unit
  // fixtures, having no git, took the walk branch and passed. Measured 2026-09-09.
  // Braces on purpose: the first cut wrote `if (fromGit) for (...) if (existsSync(f)) add; else { walk }` and
  // the `else` bound to the INNER `if` — the walk branch (non-git repos, every unit fixture) never ran, 11 of
  // 17 tests went red, and neither tsc nor eslint said a word. The mutation table caught it: every mutation
  // "failed 11" (tests already red), only the one that removed the filter "failed 1".
  if (fromGit) {
    for (const f of fromGit) if (existsSync(f)) files.add(f);
  } else {
    const acc: string[] = [];
    walk(root, exclude, acc);
    for (const f of acc) files.add(f);
  }
  for (const r of present) {
    if (canon(r) === canon(root)) continue;
    const acc: string[] = [];
    walk(r, exclude, acc);
    for (const f of acc) files.add(f);
  }

  const report: PathsReport = {
    root,
    roots: { declared, used: present, absent },
    scanned: { files: 0, strings: 0 },
    dead: [],
    history: [],
    unresolved: [],
    ok: true,
  };
  const sorted = [...files].sort();
  const judge: Judge = { root, roots: { declared, present }, files: sorted.map((f) => posix(relative(root, f))), names: standardNames(root), exclude };
  report.files = judge.files;

  for (const abs of sorted) {
    const rel = posix(relative(root, abs));
    if (excluded(rel, exclude)) continue;
    if (!PHASE1_EXT.test(abs) || BIN_EXT.test(abs) || LOCKFILE.test(rel)) continue;
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (!st.isFile() || st.size > maxBytes) continue;
    let text: string;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      report.unresolved.push({ file: rel, line: 0, text: "", reason: "io-error" });
      continue;
    }
    report.scanned.files++;
    const histFile = isHistoryFile(rel);
    const dictionary = isDictionaryFile(rel);
    // Markdown link targets under docs/ are validate.ts §1's job already — do not report them twice.
    const linkTargets = !(/\.md$/i.test(abs) && /(^|\/)docs\//.test("/" + rel));
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const cands = extractCandidates(lines[i], { linkTargets });
      if (!cands.length) continue;
      report.scanned.strings += cands.length;
      for (const c of cands) {
        const v = classify(c, abs, judge, { dictionary });
        const hit: PathHit = { file: rel, line: i + 1, text: c.text };
        if (v.kind === "unresolved") report.unresolved.push({ ...hit, reason: v.reason });
        else if (v.kind === "dead") (histFile || isHistoryLine(lines[i]) ? report.history : report.dead).push(hit);
      }
    }
  }
  report.ok = report.dead.length === 0;
  return report;
}

/** One-line summary shared by `zemory validate` (as an info issue) and the CLI header. */
export function pathsSummary(r: PathsReport): string {
  const absent = r.roots.absent.length ? ` · roots absent on this machine: ${r.roots.absent.length}` : "";
  return `paths: ${r.dead.length} dead · ${r.history.length} historical · ${r.unresolved.length} unresolved (scanned ${r.scanned.files} files, ${r.scanned.strings} strings${absent})`;
}

// ── MONITOR: "newly dead" since a baseline (plan/21 §2.3) ─────────────────────
// Scanning and judging once is noisy by nature — prose that names a rejected design is "dead" every
// single run. What the user actually needs to know is the MOMENT rot happens: the folder was renamed
// 30 minutes ago and N docs now point at the old name. So the first run records a BASELINE (whatever is
// dead today is assumed legacy/prose), and from then on only paths that die AFTER the baseline count.
// ── repair proposals (plan/21 §5.6, user 2026-09-10) ─────────────────────────
export interface PathFixProposal {
  file: string;
  line: number;
  from: string;
  /** replacement (same separator style as `from`), or null when there is no UNIQUE candidate */
  to: string | null;
  reason: "unique-name" | "ambiguous" | "no-candidate" | "absolute";
  candidates?: string[];
}
/** posix relative path from a root-relative DIR to a root-relative target (no node:path — inputs are already posix). */
function relPosix(fromDir: string, to: string): string {
  const a = fromDir.split("/").filter(Boolean);
  const b = to.split("/").filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return [...Array<string>(a.length - i).fill(".."), ...b.slice(i)].join("/") || ".";
}
/** Deterministic repair proposals for DEAD hits: the last segment exists at exactly ONE tracked location outside the
 *  excluded dirs and `attic/` ⇒ propose it, keeping the pointer's style (`../` stays relative to its file, `\\` stays
 *  `\\`). Anything else — absolute, ambiguous, no candidate — is reported as such and left to a human. Measured on the
 *  five real cases of 2026-09-10: 2 proposable, 0 safe to apply blind — hence proposals, never silent rewrites. */
export function proposeFixes(hits: PathHit[], files: string[], exclude: string[] = DEFAULT_EXCLUDE): PathFixProposal[] {
  const live = files.filter((f) => !excluded(f, exclude) && !/(^|\/)attic\//.test(f));
  const dirs = new Set<string>();
  for (const f of live) {
    const segs = f.split("/");
    for (let i = 1; i < segs.length; i++) dirs.add(segs.slice(0, i).join("/"));
  }
  return hits.map((h): PathFixProposal => {
    const s = h.text;
    const base = { file: h.file, line: h.line, from: s };
    if (ABS_WIN.test(s) || UNC.test(s) || /^~[\\/]/.test(s) || (isAbsolute(s) && !s.startsWith("."))) return { ...base, to: null, reason: "absolute" };
    const win = s.includes("\\");
    const norm = posix(s).replace(/^\.\//, "");
    const trailing = /\/$/.test(norm);
    const core = norm.replace(/\/+$/, "");
    const name = core.split("/").pop() ?? "";
    if (!name) return { ...base, to: null, reason: "no-candidate" };
    const pool = trailing ? [...dirs] : live;
    const uniq = [...new Set(pool.filter((f) => f === name || f.endsWith("/" + name)))].filter((c) => c !== core);
    if (uniq.length !== 1) return { ...base, to: null, reason: uniq.length ? "ambiguous" : "no-candidate", candidates: uniq.slice(0, 5) };
    let to = uniq[0] + (trailing ? "/" : "");
    if (/^\.\.\//.test(norm)) to = relPosix(h.file.split("/").slice(0, -1).join("/"), to); // keep it relative to ITS file
    if (win) to = to.replace(/\//g, "\\");
    return { ...base, to, reason: "unique-name" };
  });
}
export interface PathFixResult {
  file: string;
  line: number;
  ok: boolean;
  error?: string;
}
/** Rewrite ONE string on ONE line. Reads and writes the file's own EOL (02_RULES §Luật khi VIẾT — EOL: read bytes, write
 *  the same kind back); replaces the FIRST occurrence on that line only; refuses if the string is no longer there
 *  (the proposal went stale) or the file is outside the root. `to` is inserted literally — no `// Sticky by construction: a newly-dead path stays counted until it resolves or is removed` expansion. */
export function applyFix(root: string, fix: { file: string; line: number; from: string; to: string }): PathFixResult {
  const abs = resolve(root, fix.file);
  const out = { file: fix.file, line: fix.line };
  if (!under(abs, resolve(root))) return { ...out, ok: false, error: "outside root" };
  let buf: string;
  try {
    buf = readFileSync(abs, "utf8");
  } catch {
    return { ...out, ok: false, error: "unreadable" };
  }
  const eol = buf.includes("\r\n") ? "\r\n" : "\n";
  const lines = buf.split(/\r?\n/);
  const i = fix.line - 1;
  if (i < 0 || i >= lines.length) return { ...out, ok: false, error: "line out of range" };
  if (!lines[i].includes(fix.from)) return { ...out, ok: false, error: "string not on that line any more" };
  lines[i] = lines[i].replace(fix.from, () => fix.to);
  try {
    writeFileSync(abs, lines.join(eol), "utf8");
  } catch {
    return { ...out, ok: false, error: "write failed" };
  }
  return { ...out, ok: true };
}

// Sticky by construction: a newly-dead path stays counted until it resolves or is removed — a flash
// that disappears on the next tick would be a warning nobody sees. The state is a DERIVED file under the
// zemory data dir (HP điều 3): delete it and the next run simply starts a new baseline.

export interface PathsProjectState {
  baselineAt: string;
  /** keys (lower-cased posix text) that were dead when the baseline was taken */
  baseline: string[];
  lastAt: string;
  lastDead: string[];
  /** key → ISO time first seen dead after the baseline */
  firstSeen: Record<string, string>;
  /**
   * key → NƠI gặp nó trong lượt quét gần nhất (`plan/21 §5.5b`, user chốt 2026-09-16).
   *
   * Đảo vế cũ *"state không giữ `file:line`"* — vế đó đúng khi người đọc duy nhất là chip/badge
   * (chỉ cần ĐẾM). Nay lớp trạng thái node của graph (`plan/13 §4c`) cần biết đường chết nằm ở
   * FILE NÀO để tô. Chọn lưu thay vì quét sống: `/code-graph` chạy mỗi lượt mở tab và mỗi lượt
   * poll, quét sống ở đó vừa tốn ~0,5 s/repo vừa đẻ NGUỒN THỨ HAI cho cùng một câu hỏi — chip
   * đọc state, graph đọc lượt quét riêng, và hai bên lệch nhau đúng lúc người dùng đối chiếu.
   *
   * CHỈ ghi cho MỚI CHẾT: di sản không đổi màu ở đâu (§2.3) nên lưu vị trí của nó là phình state
   * mà không ai đọc (đo 2026-09-16: 105 dead / 24 mới chết ở `_DataWarehouse_Central`).
   * Một khoá gặp ở nhiều file ⇒ giữ lần gặp ĐẦU trong lượt quét (tất định theo thứ tự duyệt).
   * Tuỳ chọn: state đời cũ không có trường này ⇒ mọi thứ chạy y như trước (điều 9).
   */
  where?: Record<string, { file: string; line: number }>;
}
export interface PathsState {
  version: 1;
  projects: Record<string, PathsProjectState>;
}
export interface PathsMonitor {
  /** dead now AND not in the baseline — the only thing allowed to change a colour */
  newlyDead: PathHit[];
  baselineAt: string | null;
  /** true on the run that (re)wrote the baseline */
  baselined: boolean;
}
export type MonitoredReport = PathsReport & { monitor: PathsMonitor };

export function pathsStateFile(): string {
  return join(currentMemoryDir(), "paths-state.json");
}
const hitKey = (h: PathHit): string => posix(h.text).toLowerCase();

export function loadPathsState(file: string): PathsState {
  try {
    const v = JSON.parse(readFileSync(file, "utf8")) as Partial<PathsState>;
    if (v && v.version === 1 && v.projects && typeof v.projects === "object") return v as PathsState;
  } catch {
    /* missing or unreadable → fresh state (fail-open, điều 9) */
  }
  return { version: 1, projects: {} };
}

export interface DeadPathsRepo {
  root: string;
  name: string;
  /** keys dead now and NOT in the baseline — the sticky set the colour follows */
  newlyDead: number;
  /** first few keys (lower-cased posix text) — enough to recognise the rot; exact lines via `paths check --root` */
  sample: string[];
  /** earliest first-seen time among them */
  since: string | null;
}
/** Per-repo NEWLY-dead counts read straight from the sweep's state — NO scan. Feeds the rail chip
 *  "Repos on standard", its dialog and the Projects cards (user chose to reuse that surface, 2026-09-10):
 *  the sweep watches every linked repo but the Features row only speaks for the daemon's project, so a
 *  genuinely new dead path elsewhere (Dept_OPS, first real sweep) was invisible on the UI. */
export function deadPathsSummary(state: PathsState, projects: Array<{ root: string; name: string }>): DeadPathsRepo[] {
  const out: DeadPathsRepo[] = [];
  for (const p of projects) {
    const e = state.projects[canon(p.root)];
    if (!e) continue;
    const keys = Object.keys(e.firstSeen ?? {});
    if (!keys.length) continue;
    const since = keys.map((k) => e.firstSeen[k]).filter(Boolean).sort()[0] ?? null;
    out.push({ root: p.root, name: p.name, newlyDead: keys.length, sample: keys.slice(0, 3), since });
  }
  return out.sort((a, b) => b.newlyDead - a.newlyDead || a.name.localeCompare(b.name));
}

export interface DeadPathAt {
  /** đường dẫn repo-relative của FILE chứa chuỗi đã chết */
  file: string;
  line: number;
  /** chính chuỗi đó (khoá hạ chữ thường — đủ để người đọc nhận ra, dòng chính xác vẫn ở CLI) */
  text: string;
}
/**
 * "File nào của repo này đang mang đường dẫn MỚI CHẾT" — đọc THẲNG state của sweep, **0 quét**.
 *
 * Người tiêu thụ: lớp trạng thái node của graph (`plan/13 §4c`). Dùng CÙNG tập `newlyDead` mà chip
 * rail và badge thẻ Dự án đang dùng, nên ba bề mặt không bao giờ nói ba số khác nhau.
 * State đời cũ (thiếu `where`) ⇒ trả rỗng: graph không tô gì, không ném (điều 9).
 */
export function deadPathsByFile(state: PathsState, root: string): Map<string, DeadPathAt[]> {
  const out = new Map<string, DeadPathAt[]>();
  const e = state.projects[canon(root)];
  if (!e || !e.where) return out;
  for (const [key, at] of Object.entries(e.where)) {
    if (!at || !at.file) continue;
    const list = out.get(at.file) ?? [];
    list.push({ file: at.file, line: at.line ?? 0, text: key });
    out.set(at.file, list);
  }
  return out;
}

/** Run the check and diff it against the stored baseline for this project. `stateFile` is injectable so
 *  tests never touch the real data dir. `resetBaseline` re-takes the baseline from today's dead set. */
export function monitorPaths(ctx: Context, opts: { stateFile?: string; resetBaseline?: boolean } = {}): MonitoredReport {
  const report = pathsCheck(ctx);
  const file = opts.stateFile ?? pathsStateFile();
  const state = loadPathsState(file);
  // Self-cleaning: a project whose root is gone from this disk (unlinked repo, a test fixture's temp dir)
  // must not linger in derived state forever — and `data/` is `protected`, so nobody should have to
  // delete the file by hand to tidy it.
  for (const k of Object.keys(state.projects)) if (!existsSync(k)) delete state.projects[k];
  const key = canon(report.root);
  const now = new Date().toISOString();
  const deadKeys = new Set(report.dead.map(hitKey));
  let entry = state.projects[key];
  let baselined = false;
  if (!entry || opts.resetBaseline) {
    entry = { baselineAt: now, baseline: [...deadKeys], lastAt: now, lastDead: [...deadKeys], firstSeen: {} };
    baselined = true;
  }
  const base = new Set(entry.baseline);
  const newlyDead = report.dead.filter((h) => !base.has(hitKey(h)));
  const firstSeen: Record<string, string> = {};
  const where: Record<string, { file: string; line: number }> = {};
  for (const h of newlyDead) {
    const k = hitKey(h);
    firstSeen[k] = entry.firstSeen[k] ?? now; // keep the first date; drop keys that resolved
    // Lần gặp ĐẦU trong lượt quét thắng (`report.dead` giữ thứ tự duyệt file ⇒ tất định).
    if (!where[k]) where[k] = { file: h.file, line: h.line };
  }
  entry.firstSeen = firstSeen;
  entry.where = where;
  entry.lastAt = now;
  entry.lastDead = [...deadKeys];
  state.projects[key] = entry;
  try {
    writeJsonAtomic(file, state);
  } catch {
    /* cannot persist → still return today's verdict; next run re-baselines (fail-open) */
  }
  return { ...report, monitor: { newlyDead, baselineAt: entry.baselineAt, baselined } };
}

/** Monitor + proposals in one go, for the dialog (newly dead only) and the CLI (`--all` = every dead hit). */
export function pathsFixProposals(ctx: Context, opts: { newlyOnly?: boolean; stateFile?: string } = {}): MonitoredReport & { proposals: PathFixProposal[] } {
  const rep = monitorPaths(ctx, { stateFile: opts.stateFile });
  const hits = opts.newlyOnly === false ? rep.dead : rep.monitor.newlyDead;
  return { ...rep, proposals: proposeFixes(hits, rep.files ?? [], ctx.config.pathCheck?.exclude ?? DEFAULT_EXCLUDE) };
}

export function monitorSummary(r: MonitoredReport): string {
  const since = r.monitor.baselineAt ? r.monitor.baselineAt.slice(0, 10) : "?";
  return r.monitor.baselined
    ? `baseline written today · ${r.dead.length} legacy dead · scanned ${r.scanned.files} files`
    : `${r.monitor.newlyDead.length} newly dead since ${since} · ${r.dead.length} dead total · scanned ${r.scanned.files} files`;
}
