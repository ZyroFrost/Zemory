// plan/28 §0 — the parts store (`docs_template/_Store/`) and the folder harness it assembles.
//
// One part = one folder on a numbered shelf: a rule (`02_RULES/02-25_sql-one-way/` with RULE.md, gate.json, hook.cjs), a
// constitution article (`01_CONSTITUTION/01-N_…/`), a structure slot (`03_STRUCTURE/03-N_…/` with SLOT.md) or a skill
// (`04_SKILLS/<name>/` with SKILL.md). A repo receives copies at the same numbered place under its harness folder (skills go
// to `.claude/skills/<name>/`, where the host loads them), and every copy carries one `from:` line saying which part, which
// version and which content hash it was assembled from. That line is what lets an update tell "untouched since assembly"
// (replace) from "edited here" (three-way merge per file) without guessing.
//
// A part never carries the `<PROJECT>` placeholder: the copy in a repo is byte-identical to the part, so "untouched" is a hash
// comparison and needs no history. The project name lives only in a kit's own files (AGENTS.md …).
//
// Reading never writes; `applyAssembly` is the only writer and takes a plan made by `planAssembly`.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { merge3 } from "./standard.js";
import { LEGACY_SHELF, citationKey, enforcementOf, keyOf, legacyKey, parsePartName, slotArea } from "./harness-names.js";
import { viName } from "./vi-name-judge.js";

// Same place as adopt.ts TEMPLATE_DIR, computed here: guard-gen imports this module and adopt imports guard-gen, so taking
// the constant from adopt would read it before adopt has run.
export const STORE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs_template", "_Store");
export const SHELVES = ["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS"] as const;
export type Shelf = (typeof SHELVES)[number];

/** The file of a part that carries its header (id · name · version · from). */
export const MAIN_FILE: Record<Shelf, string> = {
  "01_CONSTITUTION": "RULE.md",
  "02_RULES": "RULE.md",
  "03_STRUCTURE": "SLOT.md",
  "04_SKILLS": "SKILL.md",
};

export interface Part {
  shelf: Shelf;
  /** Folder name, e.g. `02-25_sql-one-way` (a skill: its name). */
  folder: string;
  dir: string;
  id: string;
  /**
   * Stable identity (plan/28 §0o): code + number (`Rule_25`), or the folder for an unnumbered part. Assembly finds a repo
   * copy by key, not by folder, so a part that changes enforcement group or name is renamed in place, never duplicated.
   */
  key: string;
  name: string;
  version: number;
  kind?: string;
  applies: string[];
  meta: Record<string, string | string[]>;
  /** The `from:` line of a repo copy (absent in the store). */
  from?: FromRef;
}

export interface FromRef {
  shelf: Shelf;
  folder: string;
  version: number;
  hash: string;
}

// ── header ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Flat `key: value` front matter between two `---` lines. `[a, b]` becomes a list; ` # comment` is dropped. */
export function frontMatter(text: string): { meta: Record<string, string | string[]>; start: number; end: number } | null {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end < 0) return null;
  const meta: Record<string, string | string[]> = {};
  for (const l of lines.slice(1, end)) {
    const m = /^([A-Za-z][\w-]*):\s*(.*?)\s*$/.exec(l);
    if (!m) continue;
    let v = m[2].replace(/\s+#\s.*$/, "").trim();
    if (/^\[.*\]$/.test(v)) {
      meta[m[1]] = v.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
      continue;
    }
    v = v.replace(/^["'](.*)["']$/, "$1");
    meta[m[1]] = v;
  }
  return { meta, start: 0, end };
}

/** The body after the front matter. */
export function bodyOf(text: string): string {
  const fm = frontMatter(text);
  if (!fm) return text;
  return text.split(/\r?\n/).slice(fm.end + 1).join("\n").replace(/^\s*\n/, "");
}

const FROM_RE = /^from:\s*_Store\/(\d{2}_[A-Z_]+)\/([^\s@]+)\s+@v(\d+)\s+#([0-9a-f]{8,})\s*$/;
// A `from:` line written before the shelves were renumbered names a legacy shelf; it still parses (the hash is what counts).
const knownShelf = (s: string): boolean => (SHELVES as readonly string[]).includes(s) || s in LEGACY_SHELF;

export function fromLine(p: Pick<Part, "shelf" | "folder" | "version">, hash: string): string {
  return `from: _Store/${p.shelf}/${p.folder} @v${p.version} #${hash}`;
}

export function parseFrom(value: string): FromRef | null {
  const m = FROM_RE.exec(`from: ${value}`.replace(/^from:\s*from:/, "from:"));
  if (!m || !knownShelf(m[1])) return null;
  return { shelf: m[1] as Shelf, folder: m[2], version: Number(m[3]), hash: m[4] };
}

/** Put (or replace) the `from:` line as the last header line. A file without a header gets one. */
export function stampFrom(text: string, line: string): string {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const fm = frontMatter(text);
  if (!fm) return ["---", line, "---", ...lines].join(eol);
  const head = lines.slice(1, fm.end).filter((l) => !/^from:/.test(l));
  return ["---", ...head, line, ...lines.slice(fm.end)].join(eol);
}

/** The same text with the `from:` header line removed — what a hash is taken over. */
function withoutFrom(text: string): string {
  const fm = frontMatter(text);
  if (!fm) return text;
  const lines = text.split(/\r?\n/);
  return [...lines.slice(0, fm.end).filter((l) => !/^from:/.test(l)), ...lines.slice(fm.end)].join("\n");
}

// ── files and hash ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Every file under a part folder, relative and slash-separated, sorted. */
export function partFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(relative(dir, p).replace(/\\/g, "/"));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out.sort();
}

/** Content hash of a part from a file map: names + contents, EOL-normalised, `from:` removed. First 12 hex digits. */
export function hashFiles(files: Map<string, string>, main: string): string {
  const h = createHash("sha256");
  for (const name of [...files.keys()].sort()) {
    let t = files.get(name) ?? "";
    if (name === main) t = withoutFrom(t);
    h.update(name + "\0" + t.replace(/\r\n/g, "\n") + "\0");
  }
  return h.digest("hex").slice(0, 12);
}

/** A part's files, minus the ones its header lists as `generated:` (written by a zemory command in the repo copy — the
 *  guard and its policy in `02-55` — so they never count as a local edit and are never merged). */
export function readPartFiles(dir: string, main?: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of partFiles(dir)) m.set(f, readFileSync(join(dir, f), "utf8"));
  const head = main ? frontMatter(m.get(main) ?? "")?.meta.generated : undefined;
  for (const g of Array.isArray(head) ? head : typeof head === "string" && head ? [head] : []) m.delete(g);
  return m;
}

export function partHash(dir: string, shelf: Shelf): string {
  return hashFiles(readPartFiles(dir, MAIN_FILE[shelf]), MAIN_FILE[shelf]);
}

// ── reading parts ────────────────────────────────────────────────────────────────────────────────────────────────────

export function readPart(dir: string, shelf: Shelf): Part | null {
  const main = join(dir, MAIN_FILE[shelf]);
  if (!existsSync(main)) return null;
  const text = readFileSync(main, "utf8");
  const meta = frontMatter(text)?.meta ?? {};
  const folder = dir.replace(/\\/g, "/").split("/").pop() ?? "";
  const str = (k: string): string => (typeof meta[k] === "string" ? (meta[k] as string) : "");
  const list = (k: string): string[] => (Array.isArray(meta[k]) ? (meta[k] as string[]) : str(k) ? [str(k)] : []);
  const from = str("from") ? parseFrom(str("from")) ?? undefined : undefined;
  const id = str("id") || folder.split("_")[0];
  return {
    shelf,
    folder,
    dir,
    id,
    key: partKey(id, folder),
    name: str("name") || folder.replace(/^\d{2}-\d+_/, ""),
    version: Number(str("version") || from?.version || 1),
    kind: str("kind") || undefined,
    applies: list("applies"),
    meta,
    from,
  };
}

/** Identity from the header id (`Rule_14` · legacy `02-14`), else from the folder name; an unnumbered part is its folder. */
export function partKey(id: string, folder: string): string {
  const fromId = citationKey(id) ?? legacyKey(id);
  if (fromId) return fromId;
  const parsed = parsePartName(folder);
  if (parsed) return keyOf(parsed);
  return legacyKey(folder.split("_")[0]) ?? folder;
}

/** The shelf folder under `root` that holds `shelf` — its current name, or the legacy one a repo not yet renamed has. */
export function shelfDir(root: string, shelf: string): string {
  const now = join(root, shelf);
  if (existsSync(now)) return now;
  for (const [old, cur] of Object.entries(LEGACY_SHELF)) {
    if (cur === shelf && existsSync(join(root, old))) return join(root, old);
    if (old === shelf && existsSync(join(root, cur))) return join(root, cur);
  }
  return now;
}

/** Every part on one shelf under `root` (the store, or a repo's harness folder). Skills read from `skillsRoot`. */
export function listParts(root: string, shelf: Shelf): Part[] {
  const dir = shelfDir(root, shelf);
  if (!existsSync(dir)) return [];
  const out: Part[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = readPart(join(dir, e.name), shelf);
    if (p) out.push(p);
  }
  return out.sort(byId);
}

/** Skills of a repo live where the host loads them, not on a numbered shelf. */
export function listRepoSkills(skillsRoot: string): Part[] {
  if (!existsSync(skillsRoot)) return [];
  const out: Part[] = [];
  for (const e of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = readPart(join(skillsRoot, e.name), "04_SKILLS");
    if (p) out.push(p);
  }
  return out.sort(byId);
}

function byId(a: Part, b: Part): number {
  const n = (s: string): number[] => (s.match(/\d+/g) ?? []).map(Number);
  const [x, y] = [n(a.id), n(b.id)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? -1) !== (y[i] ?? -1)) return (x[i] ?? -1) - (y[i] ?? -1);
  return a.id.localeCompare(b.id);
}

// ── kits ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface Kit {
  no: string;
  name: string;
  status: "built" | "reserved" | "retired";
  host: string;
  structure: string;
  tier: "Basic" | "Memory";
  requires: string[];
  constitution: string[];
  rules: string[];
  slots: string[];
  skills: string[];
  tools: string[];
  /** Folder under `_Store/Own/` holding the kit's own files (AGENTS.md · PURPOSE.md · INDEX.md · 04/05/06 …): copied once
   *  into a new repo, never overwritten — from then on they are the repo's. */
  own: string;
}

export function readKits(storeDir = STORE_DIR): Kit[] {
  const p = join(storeDir, "kits.json");
  if (!existsSync(p)) return [];
  const raw = JSON.parse(readFileSync(p, "utf8")) as Record<string, Partial<Kit>>;
  return Object.entries(raw)
    .filter(([k]) => /^\d{2}$/.test(k))
    .map(([no, k]) => ({
      no,
      name: k.name ?? no,
      status: k.status ?? "reserved",
      host: k.host ?? "",
      structure: k.structure ?? "",
      tier: k.tier ?? "Memory",
      requires: k.requires ?? [],
      constitution: k.constitution ?? [],
      rules: k.rules ?? [],
      slots: k.slots ?? [],
      skills: k.skills ?? [],
      tools: k.tools ?? [],
      own: k.own ?? "",
    }));
}

/** Copy a kit's own files into a repo — only the ones the repo does not have yet. `<PROJECT>` becomes the folder name. */
export function copyOwnFiles(kit: Kit, repoRoot: string, projectName: string, storeDir = STORE_DIR): string[] {
  if (!kit.own) return [];
  const src = join(storeDir, "Own", kit.own);
  const source = readSource(storeDir);
  const added: string[] = [];
  for (const rel of partFiles(src)) {
    const dst = join(repoRoot, rel);
    if (existsSync(dst)) continue;
    mkdirSync(dirname(dst), { recursive: true });
    const text = readFileSync(join(src, rel), "utf8")
      .replace(/<PROJECT>/g, projectName)
      .replace(/<ZEMORY_RAW>/g, source.raw)
      .replace(/<ZEMORY_REPO>/g, source.repo);
    writeFileSync(dst, text);
    added.push(rel);
  }
  return added;
}

/** The tool's own source address — the ONE place it lives (plan/28 §0f); kit files carry placeholders. */
export function readSource(storeDir = STORE_DIR): { repo: string; raw: string } {
  try {
    const j = JSON.parse(readFileSync(join(storeDir, "source.json"), "utf8")) as { repo?: string; raw?: string };
    return { repo: j.repo ?? "<ZEMORY_REPO>", raw: j.raw ?? "<ZEMORY_RAW>" };
  } catch {
    return { repo: "<ZEMORY_REPO>", raw: "<ZEMORY_RAW>" };
  }
}

/** A rule a repo declined: `retired: true` in its header. It keeps its folder and number (02-10) but no gate or core
 *  counts it any more. */
export function isRetired(p: Part): boolean {
  return p.meta.retired === "true";
}

/** A kit by number (`06`) or full name (`06_IDE_App_Memory`). */
export function findKit(ref: string, storeDir = STORE_DIR): Kit | null {
  const kits = readKits(storeDir);
  return kits.find((k) => k.name === ref || k.no === ref || k.no === ref.slice(0, 2)) ?? null;
}

/** `02-*` · `02-25` · a skill name — `*` is the only wildcard. */
function pick(parts: Part[], patterns: string[], by: (p: Part) => string): Part[] {
  const res = patterns.map((s) => new RegExp("^" + s.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"));
  return parts.filter((p) => res.some((r) => r.test(by(p))));
}

/** The store parts a kit lists, shelf by shelf, filtered by `applies` (empty = every structure). */
export function kitParts(kit: Kit, storeDir = STORE_DIR): Part[] {
  const fits = (p: Part): boolean => p.applies.length === 0 || p.applies.includes(kit.structure);
  return [
    ...pick(listParts(storeDir, "01_CONSTITUTION"), kit.constitution, (p) => p.id),
    ...pick(listParts(storeDir, "02_RULES"), kit.rules, (p) => p.id),
    ...pick(listParts(storeDir, "03_STRUCTURE"), kit.slots, (p) => p.id),
    ...pick(listParts(storeDir, "04_SKILLS"), kit.skills, (p) => p.folder),
  ].filter(fits);
}

// ── assembly ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface AssemblyTarget {
  /** The repo harness folder (`docs/agent`). */
  agentDir: string;
  /** Where the host loads skills (`.claude/skills`). */
  skillsDir: string;
}

export function targetDir(t: AssemblyTarget, p: Pick<Part, "shelf" | "folder">): string {
  return p.shelf === "04_SKILLS" ? join(t.skillsDir, p.folder) : join(t.agentDir, p.shelf, p.folder);
}

/**
 * The repo copy of a part, found by KEY (plan/28 §0o) — at its own folder name, or at an older name (the part moved from
 * Core to Keys, was renamed, or sits on a legacy shelf). Null when the repo has no copy.
 */
export function findCopy(t: AssemblyTarget, part: Part): string | null {
  const exact = targetDir(t, part);
  if (existsSync(join(exact, MAIN_FILE[part.shelf]))) return exact;
  const pool = part.shelf === "04_SKILLS" ? listRepoSkills(t.skillsDir) : listParts(t.agentDir, part.shelf);
  return pool.find((p) => p.key === part.key)?.dir ?? null;
}

export type StepVerdict =
  /** the repo has no copy — add it */
  | "absent"
  /** the copy already equals the store part */
  | "current"
  /** the copy is untouched since assembly — replace with the newer part */
  | "clean"
  /** the copy was edited here and every file merges — write the merge */
  | "merged"
  /** the copy was edited here and a file does not merge, or its base cannot be recovered — report, never write */
  | "conflict"
  /** a folder at that place that was not assembled (no `from:`) — the repo's own, never touched */
  | "own";

export interface AssemblyStep {
  part: Part;
  target: string;
  verdict: StepVerdict;
  /** Files to write (relative to the target) — only for absent · clean · merged. */
  write?: Map<string, string>;
  /** Files of the old copy no longer in the part (clean only). */
  remove?: string[];
  /** The copy sits at an older folder (same key): move it to `target` before writing. */
  renameFrom?: string;
  reason?: string;
}

/** What assembling `parts` into a repo would do. Reads only. */
export function planAssembly(parts: Part[], t: AssemblyTarget): AssemblyStep[] {
  return parts.map((part) => {
    const target = targetDir(t, part);
    const at = findCopy(t, part);
    if (!at || at === target) return planOne(part, t, target);
    // Same key at an older folder: judge the copy where it is, then move it to the new name. A verdict that writes nothing
    // (current) still moves, so the folder name always tells the truth about the part.
    const step = planOne(part, t, at);
    if (step.verdict === "own" || step.verdict === "conflict") return step;
    let write = step.write;
    if (!write) {
      // Nothing to bring (current): keep the repo's content, only restamp `from:` with the new folder name.
      const main = MAIN_FILE[part.shelf];
      const text = readFileSync(join(at, main), "utf8");
      const old = parseFrom(String(frontMatter(text)?.meta.from ?? ""));
      write = new Map([[main, stampFrom(text, fromLine(part, old?.hash ?? partHash(part.dir, part.shelf)))]]);
    }
    return { ...step, target, renameFrom: at, write, reason: step.reason ?? `renamed from ${at}` };
  });
}

function planOne(part: Part, t: AssemblyTarget, target = targetDir(t, part)): AssemblyStep {
  const main = MAIN_FILE[part.shelf];
  const theirs = readPartFiles(part.dir, main);
  const theirsHash = hashFiles(theirs, main);
  const stamped = (files: Map<string, string>, hash: string): Map<string, string> => {
    const out = new Map(files);
    out.set(main, stampFrom(files.get(main) ?? "", fromLine(part, hash)));
    return out;
  };
  if (!existsSync(join(target, main))) {
    // Only the part's own generated files there (the guard written before 02-55 was assembled) = not assembled yet.
    const g = frontMatter(theirs.get(main) ?? "")?.meta.generated;
    const gen = new Set(Array.isArray(g) ? g : typeof g === "string" && g ? [g] : []);
    const present = existsSync(target) ? partFiles(target).filter((f) => !gen.has(f)) : [];
    if (present.length) return { part, target, verdict: "own", reason: `${main} missing — not an assembled copy` };
    return { part, target, verdict: "absent", write: stamped(theirs, theirsHash) };
  }
  const mine = readPartFiles(target, main);
  const from = parseFrom(String(frontMatter(mine.get(main) ?? "")?.meta.from ?? ""));
  if (!from) return { part, target, verdict: "own", reason: "no from: line — the repo's own folder" };
  const mineHash = hashFiles(mine, main);
  if (mineHash === theirsHash) {
    // Same content; only refresh the stamp when it names an older version/hash.
    if (from.hash === theirsHash && from.version === part.version) return { part, target, verdict: "current" };
    return { part, target, verdict: "clean", write: stamped(theirs, theirsHash), remove: [] };
  }
  if (mineHash === from.hash) {
    const remove = [...mine.keys()].filter((f) => !theirs.has(f));
    return { part, target, verdict: "clean", write: stamped(theirs, theirsHash), remove };
  }
  // Edited here, but the part has not changed since it was assembled (or last merged): nothing to bring, the edit stays.
  if (from.hash === theirsHash) return { part, target, verdict: "current", reason: "edited here; the store part has not changed since" };
  // Edited here: three-way, per file, against the part as it was at assembly time.
  const base = baseFiles(part, from.hash);
  if (!base) return { part, target, verdict: "conflict", reason: `edited here, and the base #${from.hash} is not in zemory's history` };
  const out = new Map<string, string>();
  for (const f of new Set([...base.keys(), ...mine.keys(), ...theirs.keys()])) {
    const b = base.get(f), m = mine.get(f), th = theirs.get(f);
    const strip = (s: string | undefined): string | undefined => (f === main && s !== undefined ? withoutFrom(s) : s);
    const [B, M, T] = [strip(b), strip(m), strip(th)];
    if (M === T) { if (M !== undefined) out.set(f, M); continue; }
    if (M === B) { if (T !== undefined) out.set(f, T); continue; }
    if (T === B) { if (M !== undefined) out.set(f, M); continue; }
    if (B === undefined || M === undefined || T === undefined) {
      return { part, target, verdict: "conflict", reason: `${f}: added or removed on both sides` };
    }
    const eol = M.includes("\r\n") ? "\r\n" : "\n";
    const r = merge3(B.split(/\r?\n/), M.split(/\r?\n/), T.split(/\r?\n/));
    if (!r.ok) return { part, target, verdict: "conflict", reason: `${f}: ${r.reason}` };
    out.set(f, r.lines.join(eol));
  }
  // The merged copy records the NEW part as its base: the next update compares against it.
  out.set(main, stampFrom(out.get(main) ?? "", fromLine(part, theirsHash)));
  const remove = [...mine.keys()].filter((f) => !out.has(f));
  return { part, target, verdict: "merged", write: out, remove };
}

/** Write a plan. Only absent · clean · merged steps write; the others are reported by the caller. */
export function applyAssembly(steps: AssemblyStep[]): AssemblyStep[] {
  const done: AssemblyStep[] = [];
  for (const s of steps) {
    if (!s.write) continue;
    if (s.renameFrom && !existsSync(s.target)) {
      mkdirSync(dirname(s.target), { recursive: true });
      renameSync(s.renameFrom, s.target);
    }
    for (const f of s.remove ?? []) rmSync(join(s.target, f), { force: true });
    for (const [f, text] of s.write) {
      const p = join(s.target, f);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, text);
    }
    done.push(s);
  }
  return done;
}

// ── base from history ───────────────────────────────────────────────────────────────────────────────────────────────

const baseCache = new Map<string, Map<string, string> | null>();

/** git run inside a part folder, with the folder's path as git names it. Paths are never joined by hand: a temp folder
 *  under an 8.3 short name (`HUY~1.NGU`) and git's long name for the same place do not relate as strings. */
function partGit(dir: string): { git: (args: string[]) => string; prefix: string } | null {
  const git = (args: string[]): string => execFileSync("git", args, { cwd: dir, encoding: "utf8", windowsHide: true, maxBuffer: 64 << 20 });
  try {
    return { git, prefix: git(["rev-parse", "--show-prefix"]).trim() };
  } catch {
    return null;
  }
}

/** The files of a part folder at one commit (full names from git, the folder prefix stripped). */
function filesAt(pg: { git: (args: string[]) => string; prefix: string }, sha: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const f of pg.git(["ls-tree", "-r", "--full-name", "--name-only", sha, "--", "."]).split(/\r?\n/).filter(Boolean)) {
    files.set(f.slice(pg.prefix.length), pg.git(["show", `${sha}:${f}`]));
  }
  return files;
}

/** The part's files at the version whose hash is `hash`, from the history of the git repo that holds the store (zemory's
 *  own in production). Null when not found. */
export function baseFiles(part: Part, hash: string): Map<string, string> | null {
  const key = `${part.dir}#${hash}`;
  if (baseCache.has(key)) return baseCache.get(key) ?? null;
  const main = MAIN_FILE[part.shelf];
  const matches = (files: Map<string, string>): boolean => {
    const g = frontMatter(files.get(main) ?? "")?.meta.generated;
    for (const name of Array.isArray(g) ? g : typeof g === "string" && g ? [g] : []) files.delete(name);
    return hashFiles(files, main) === hash;
  };
  let found: Map<string, string> | null = null;
  // Fast path: the history of the part's own folder.
  const pg = partGit(part.dir);
  if (pg) {
    try {
      for (const sha of pg.git(["log", "--format=%H", "--", "."]).split(/\r?\n/).filter(Boolean)) {
        const files = filesAt(pg, sha);
        if (matches(files)) {
          found = files;
          break;
        }
      }
    } catch {
      found = null;
    }
  }
  // The part was renamed (enforcement group · name · shelf): look for its KEY across the whole shelf history, legacy
  // shelf name included. Only the main file is read per folder until the key matches.
  if (!found) found = baseAcrossRenames(part, matches);
  baseCache.set(key, found);
  return found;
}

function baseAcrossRenames(part: Part, matches: (files: Map<string, string>) => boolean): Map<string, string> | null {
  const shelfAt = dirname(part.dir);
  const pg = partGit(shelfAt);
  if (!pg) return null;
  const main = MAIN_FILE[part.shelf];
  const shelfName = shelfAt.replace(/\\/g, "/").split("/").pop() ?? "";
  const legacy = Object.entries(LEGACY_SHELF).find(([old, cur]) => cur === shelfName || old === shelfName);
  const paths = ["."];
  if (legacy) paths.push(`../${legacy[0] === shelfName ? legacy[1] : legacy[0]}`);
  try {
    const shas = pg.git(["log", "--format=%H", "--", ...paths]).split(/\r?\n/).filter(Boolean);
    const root = pg.prefix.split("/").filter(Boolean).slice(0, -1).join("/");
    for (const sha of shas) {
      const names = pg.git(["ls-tree", "-r", "--full-name", "--name-only", sha, "--", ...paths]).split(/\r?\n/).filter(Boolean);
      const folders = new Map<string, string[]>();
      for (const f of names) {
        const rest = root ? f.slice(root.length + 1) : f; // `<shelf>/<folder>/<file…>`
        const [, folder, ...file] = rest.split("/");
        if (!folder || !file.length) continue;
        const prefix = (root ? root + "/" : "") + rest.split("/").slice(0, 2).join("/") + "/";
        folders.set(prefix, [...(folders.get(prefix) ?? []), f]);
      }
      for (const [prefix, files] of folders) {
        if (!files.includes(prefix + main)) continue;
        const head = pg.git(["show", `${sha}:${prefix}${main}`]);
        const folder = prefix.split("/").slice(-2, -1)[0] ?? "";
        const id = String(frontMatter(head)?.meta.id ?? "");
        if (partKey(id, folder) !== part.key) continue;
        const map = new Map<string, string>();
        for (const f of files) map.set(f.slice(prefix.length), f === prefix + main ? head : pg.git(["show", `${sha}:${f}`]));
        if (matches(map)) return map;
      }
    }
  } catch {
    return null;
  }
  return null;
}

// ── checks ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A store part whose content changed without a version bump — its copies could not tell old from new. Needs history. */
export function unbumpedParts(storeDir = STORE_DIR): string[] {
  const out: string[] = [];
  for (const shelf of SHELVES) {
    for (const p of listParts(storeDir, shelf)) {
      const pg = partGit(p.dir);
      if (!pg) continue;
      let head: Map<string, string>;
      try {
        head = filesAt(pg, "HEAD");
      } catch {
        continue; // no commit yet — nothing to compare with
      }
      if (!head.has(MAIN_FILE[shelf])) continue; // the part is new since HEAD
      const headVersion = Number((frontMatter(head.get(MAIN_FILE[shelf]) ?? "")?.meta.version as string) || 1);
      if (hashFiles(head, MAIN_FILE[shelf]) !== hashFiles(readPartFiles(p.dir), MAIN_FILE[shelf]) && headVersion >= p.version) {
        out.push(`${shelf}/${p.folder}: content changed since HEAD but version is still v${p.version}`);
      }
    }
  }
  return out;
}

const SHELF_CODE: Record<string, string[]> = {
  "01_CONSTITUTION": ["Cons"], "02_CONSTITUTION": ["Cons"],
  "02_RULES": ["Rule"], "01_RULES": ["Rule"],
  "03_STRUCTURE": ["Slot", "Struc"],
  "04_SKILLS": ["Skill"],
};

/**
 * A part name must tell the truth (plan/28 §0o): the code fits the shelf, the enforcement group of a rule or article is what
 * its gate.json really does, a slot's area is the first segment of its path, the number is the number of its id. `legacy`
 * lists the parts still under a pre-dictionary name — the rename step drives that list to zero.
 */
export function partNameFindings(storeDir = STORE_DIR): { wrong: string[]; legacy: string[] } {
  const wrong: string[] = [];
  const legacy: string[] = [];
  // A number is taken for good: a retired part in `Archive/` still holds it (plan/28 §0o).
  const owner = new Map<string, string>();
  for (const base of [storeDir, join(storeDir, "Archive")]) {
    for (const shelf of SHELVES) {
      for (const p of listParts(base, shelf)) {
        const where = `${base === storeDir ? "" : "Archive/"}${shelf}/${p.folder}`;
        const prev = owner.get(p.key);
        if (prev) wrong.push(`${where}: key ${p.key} is already taken by ${prev}`);
        else owner.set(p.key, where);
      }
    }
  }
  for (const shelf of SHELVES) {
    for (const p of listParts(storeDir, shelf)) {
      const n = parsePartName(p.folder);
      const where = `${shelf}/${p.folder}`;
      if (!n) {
        legacy.push(where);
        continue;
      }
      if (!(SHELF_CODE[shelf] ?? []).includes(n.code)) wrong.push(`${where}: code ${n.code} does not belong on ${shelf}`);
      const vi = viName(n.name);
      if (vi) wrong.push(`${where}: the name ${n.name} reads as Vietnamese without marks (${vi}) — names are English`);
      if (n.no !== undefined && p.key !== keyOf(n)) wrong.push(`${where}: the name says ${keyOf(n)} but the header id says ${p.key}`);
      if (n.code === "Rule" || n.code === "Cons") {
        let gate: Record<string, unknown> | null = null;
        try { gate = JSON.parse(readFileSync(join(p.dir, "gate.json"), "utf8")) as Record<string, unknown>; } catch { gate = null; }
        const real = enforcementOf(gate);
        if (real !== n.group) wrong.push(`${where}: named ${n.group} but its gate.json makes it ${real}`);
      }
      if (n.code === "Slot") {
        const area = slotArea(String(p.meta.path ?? ""));
        if (area !== n.group) wrong.push(`${where}: area ${n.group} but path ${String(p.meta.path ?? "")} is in ${area}`);
      }
    }
  }
  return { wrong, legacy };
}

/** What a slot's `gate.json › conform` finds wrong in a repo: a required path that does not exist, a file that does not
 *  contain the text it must. Empty = the slot holds. An unreadable gate.json is reported, never skipped. */
export function slotGateFailures(root: string, slotDir: string): string[] {
  const p = join(slotDir, "gate.json");
  if (!existsSync(p)) return [];
  let c: { require?: unknown; contains?: unknown } | undefined;
  try {
    c = (JSON.parse(readFileSync(p, "utf8")) as { conform?: typeof c }).conform;
  } catch {
    return ["gate.json unreadable"];
  }
  if (!c) return [];
  const out: string[] = [];
  for (const rel of Array.isArray(c.require) ? c.require : []) {
    if (typeof rel === "string" && !existsSync(join(root, rel))) out.push(`${rel} missing`);
  }
  if (c.contains && typeof c.contains === "object") {
    for (const [rel, needle] of Object.entries(c.contains as Record<string, unknown>)) {
      const f = join(root, rel);
      if (!existsSync(f)) continue; // already reported by require when it is required
      if (typeof needle === "string" && !readFileSync(f, "utf8").includes(needle)) out.push(`${rel} does not contain ${needle}`);
    }
  }
  return out;
}

// ── gates that live beside their owner (a skill or a rule) — plan/27 §2c, plan/28 §0n ─────────────────────────────

export interface ReadTrigger {
  when: "path_prefix" | "cmd_re" | "script_re" | "new_dir";
  prefix?: string;
  re?: string;
}

export interface PromptGate {
  kind: string;
  re: string;
  text: string;
}

function gateOf(dir: string): { read?: ReadTrigger[]; prompt?: PromptGate } | null {
  try {
    return JSON.parse(readFileSync(join(dir, "gate.json"), "utf8")) as { read?: ReadTrigger[]; prompt?: PromptGate };
  } catch {
    return null;
  }
}

/** Read-before-write doors a repo's skills declare (`gate.json › read`): each entry names the SKILL.md to read. */
export function skillReadTriggers(skillsDir: string): Array<ReadTrigger & { skill: string }> {
  if (!existsSync(skillsDir)) return [];
  const out: Array<ReadTrigger & { skill: string }> = [];
  for (const e of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    for (const t of gateOf(join(skillsDir, e.name))?.read ?? []) out.push({ ...t, skill: e.name });
  }
  return out;
}

/** Prompt reminders a repo carries: from its skills and from the rule folders of a folder harness (`gate.json › prompt`). */
export function promptGates(skillsDir: string, agentDir: string): PromptGate[] {
  const dirs: string[] = [];
  if (existsSync(skillsDir)) for (const e of readdirSync(skillsDir, { withFileTypes: true })) if (e.isDirectory()) dirs.push(join(skillsDir, e.name));
  for (const shelf of ["01_CONSTITUTION", "02_RULES"] as const) for (const p of listParts(agentDir, shelf)) if (!isRetired(p)) dirs.push(p.dir);
  return dirs.map((d) => gateOf(d)?.prompt).filter((g): g is PromptGate => Boolean(g && g.re && g.text && g.kind));
}

/** True when a repo's harness is the folder layout (plan/28 §0c): `02_RULES` is a folder, not a file. */
export function isFolderHarness(agentDir: string): boolean {
  try {
    return statSync(join(agentDir, "02_RULES")).isDirectory();
  } catch {
    return false;
  }
}
