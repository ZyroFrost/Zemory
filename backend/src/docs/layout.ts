// The layout levels of HS (docs/plan/32): a data drive, its Workspace/, and each organisation's folder are structures
// like a repo's (Struc_Disk_Data · Struc_Region_Workspace · Struc_Region_Company), made of slots whose `path` is a
// pattern. This module reads those structures from HS and checks a real tree against them. A layout is a dictionary plus
// checks: it never creates folders, and it writes nothing into the roots it checks (a drive root holds no loose file).

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, parse } from "node:path";
import { SHELF } from "./harness-names.js";
import { listParts, listStructures, STORE_DIR, structureSlotNames, type Part } from "./store.js";

export type LayoutKind = "drive" | "workspace" | "company";

export const LAYOUT_STRUCTURE: Record<LayoutKind, string> = {
  drive: "Struc_Disk_Data",
  workspace: "Struc_Region_Workspace",
  company: "Struc_Region_Company",
};

interface Seg {
  re: RegExp;
  optional: boolean;
  raw: string;
}

export interface LayoutSlot {
  folder: string;
  path: string;
  segments: Seg[];
}

export interface LayoutFinding {
  level: "blocking" | "advice";
  check: "loose-file" | "unknown-folder" | "repo-outside-workspace" | "unknown-value" | "program-stray" | "repo-under-company" | "assembled-external" | "study-unmatched";
  path: string;
  fix: string;
}

export interface LayoutReport {
  root: string;
  kind: LayoutKind;
  structure: string;
  checked: number;
  findings: LayoutFinding[];
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One path segment as a test: a literal name, `<X>` (any name), or a literal with a `<X>` hole (`Dept_<Mã>`). */
function segOf(raw: string, optional: boolean, match?: string): Seg {
  const body = match ?? `^${raw.split(/<[^>]+>/).map(escapeRe).join(".+")}$`;
  // an explicit `match` is exact (`Dept_` + an UPPER-CASE code); a name pattern ignores case like the file system
  return { re: new RegExp(body, match ? "" : "i"), optional, raw };
}

/**
 * `Software/<Nhóm>/[<Hãng>/]<Ứng dụng>/` → segments; a `[...]` part is an optional level. A slot's `values` name the only
 * names its last placeholder takes - and that placeholder takes them in EVERY slot of the structure (`known`): `<Nhóm>` is
 * the groups of Software_148 in `Software/<Nhóm>/` and in `Software/<Nhóm>/<Ứng dụng>/` alike.
 */
export function slotSegments(path: string, meta: Record<string, string | string[]> = {}, known: Map<string, string[]> = new Map()): Seg[] {
  const tokens = path.replace(/\/+$/, "").split("/").filter(Boolean);
  const match = typeof meta.match === "string" ? meta.match : undefined;
  const own = Array.isArray(meta.values) ? meta.values : null;
  return tokens.map((t, i) => {
    const optional = t.startsWith("[");
    const raw = t.replace(/^\[/, "").replace(/^\]/, "").replace(/\]$/, "");
    const last = i === tokens.length - 1;
    const values = (last && own) || known.get(raw);
    if (values) return { re: new RegExp(`^(${values.map(escapeRe).join("|")})$`), optional, raw };
    return segOf(raw, optional, last ? match : undefined);
  });
}

const lastToken = (path: string): string => (path.replace(/\/+$/, "").split("/").pop() ?? "").replace(/^\[|^\]|\]$/g, "");

/** The slots of a layout structure, read from HS. */
export function layoutSlots(kind: LayoutKind, storeDir = STORE_DIR): LayoutSlot[] {
  const struc = listStructures(storeDir).find((s) => s.folder === LAYOUT_STRUCTURE[kind]);
  if (!struc) return [];
  // a slot part is read as `_Slot/<name>`; structure.json names it bare
  const byFolder = new Map(listParts(storeDir, SHELF.structure).map((p) => [p.folder.replace(/^_Slot\//, ""), p] as const));
  const parts = structureSlotNames(struc)
    .map((f) => byFolder.get(f))
    .filter((p): p is Part => Boolean(p) && typeof p?.meta.path === "string");
  const known = new Map<string, string[]>();
  for (const p of parts) if (Array.isArray(p.meta.values)) known.set(lastToken(String(p.meta.path)), p.meta.values);
  return parts.map((p) => ({ folder: p.folder, path: String(p.meta.path), segments: slotSegments(String(p.meta.path), p.meta, known) }));
}

const isRepo = (dir: string): boolean => existsSync(join(dir, ".git")) || existsSync(join(dir, "docs", ".harness.json"));
const isAssembled = (dir: string): boolean => existsSync(join(dir, "docs", ".harness.json"));

/** A link that points at a folder - or at nothing reachable now (a detached drive): a link point is never a loose file. */
function linkIsFolder(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return true;
  }
}

function entries(dir: string): Array<{ name: string; dir: boolean }> {
  try {
    return readdirSync(dir, { withFileTypes: true })
      // what Windows puts at a drive root by itself, and the sync tool's own folders, are left alone (Struc_Disk_Data)
      .filter((e) => !/^\$|^System Volume Information$|^\.st(folder|versions)$|^desktop\.ini$|^(pagefile|swapfile|hiberfil)\.sys$|^DumpStack\.log(\.tmp)?$/i.test(e.name))
      // a junction or a symlink is a link point of a split tree (Struc_Disk_Data, five laws): it stands for a folder, even
      // when its target is on a drive that is not attached right now
      .map((e) => ({ name: e.name, dir: e.isDirectory() || (e.isSymbolicLink() && linkIsFolder(join(dir, e.name))) }));
  } catch {
    return [];
  }
}

/** Repos below `dir`, `depth` levels down at most; an installed program's own parts (App · Data · Setup) are not entered. */
function reposUnder(dir: string, depth: number): string[] {
  const out: string[] = [];
  for (const e of entries(dir).filter((x) => x.dir && !/^(App|Data|Setup|node_modules|\.git)$/.test(x.name))) {
    const p = join(dir, e.name);
    if (isRepo(p)) out.push(p);
    else if (depth > 1) out.push(...reposUnder(p, depth - 1));
  }
  return out;
}

/**
 * The only parts a program folder may hold (Software_149): its installer, its installed copy, its own data. A part exists
 * only when it has something to hold, so a missing part is never a finding - only an item outside these parts is.
 */
const PROGRAM_PARTS = ["Setup", "App", "Data"] as const;
const isProgramPart = (name: string): boolean => (PROGRAM_PARTS as readonly string[]).includes(name);
/** Groups whose children are packs, not programs: a driver or a font has no installed copy. */
const PACK_GROUPS = /^(Drivers|Fonts)$/;
/**
 * The one file a folder of the frame may hold to explain itself: a split folder names what lives where (Struc_Disk_Data,
 * law 3); a study subject with no learning material kept names its course (Personal_145).
 */
const SPLIT_MARK = "_README.md";
/** Top-level folders whose children are a fixed list (Game_164 · Documents_152): a child outside it is `unknown-value`. */
const FIXED_CHILDREN = /^(Game|Documents)$/;
/** At an organisation level a non-repo folder with neither prefix is a work folder (Struc_Region_Company) and passes. */
const ROLE_PREFIX = /^(_|Dept_)/;

/**
 * Step 1 of Personal_145: a study project belongs to a subject the owner studies or studied. Every
 * `Workspace\Personal\StudyProjects\School\<School>\<Subject>\` and `…\Self\<Field>\` either mirrors a folder of `Study\`,
 * or - when no learning material is kept, so no `Study\` folder exists - carries `_README.md` naming the course.
 */
function unmatchedStudy(root: string): string[] {
  const sp = join(root, "Workspace", "Personal", "StudyProjects");
  if (!existsSync(sp)) return [];
  const out: string[] = [];
  const dirs = (p: string): string[] => entries(p).filter((x) => x.dir).map((x) => x.name);
  const matched = (rel: string[]): boolean => existsSync(join(root, "Study", ...rel)) || existsSync(join(sp, ...rel, SPLIT_MARK));
  for (const school of dirs(join(sp, "School"))) {
    for (const subject of dirs(join(sp, "School", school))) {
      if (!matched(["School", school, subject])) out.push(join(sp, "School", school, subject));
    }
  }
  for (const field of dirs(join(sp, "Self"))) if (!matched(["Self", field])) out.push(join(sp, "Self", field));
  return out;
}

/**
 * The program folders of one `Software/<group>/`: a child that already has a program part, holds a file, or has no
 * sub-folder at all, is a program; any other child is a vendor level (`[<vendor>/]`) and its children are the programs.
 */
function programsIn(groupDir: string): string[] {
  const out: string[] = [];
  for (const c of entries(groupDir).filter((x) => x.dir)) {
    const p = join(groupDir, c.name);
    const own = entries(p);
    const subs = own.filter((x) => x.dir);
    const isProgram = subs.length === 0 || own.some((x) => !x.dir) || subs.some((s) => isProgramPart(s.name));
    if (isProgram) out.push(p);
    else out.push(...subs.map((s) => join(p, s.name)));
  }
  return out;
}

/** Which kind of layout a root is, from where it sits: a drive root · a folder named Workspace · a folder in Company/. */
export function layoutKindOf(root: string): LayoutKind | null {
  // read the path as the host names it: a Windows drive root is a drive even where node parses POSIX paths (the container)
  if (/^[A-Za-z]:[\\/]?$/.test(root)) return "drive";
  if (parse(root).root.replace(/[\\/]+$/, "") === root.replace(/[\\/]+$/, "")) return "drive";
  const segs = root.replace(/[\\/]+$/, "").split(/[\\/]/);
  if (segs[segs.length - 1] === "Workspace") return "workspace";
  if (segs[segs.length - 2] === "Company") return "company";
  return null;
}

/** A path relative to `root` matches a slot whose segments consume it exactly (optional levels may be skipped). */
function matches(segs: Seg[], parts: string[]): boolean {
  const walk = (si: number, pi: number): boolean => {
    if (pi === parts.length) return segs.slice(si).every((s) => s.optional) || si === segs.length;
    if (si === segs.length) return false;
    const s = segs[si];
    if (s.re.test(parts[pi]) && walk(si + 1, pi + 1)) return true;
    return s.optional && walk(si + 1, pi);
  };
  return walk(0, 0);
}

/** Is `rel` (segments) a prefix of some slot path - a folder on the way to a slot, or the slot itself? */
function onSomeSlot(slots: LayoutSlot[], rel: string[]): boolean {
  return slots.some((sl) => {
    for (let n = rel.length; n <= sl.segments.length; n++) if (matches(sl.segments.slice(0, n), rel)) return true;
    return false;
  });
}

/** Check a real tree against its layout structure; a drive check goes on into Workspace/ and every organisation. */
export function checkLayout(root: string, kind: LayoutKind = layoutKindOf(root) ?? "drive", storeDir = STORE_DIR): LayoutReport {
  const slots = layoutSlots(kind, storeDir);
  const out: LayoutReport = { root, kind, structure: LAYOUT_STRUCTURE[kind], checked: 0, findings: [] };
  const add = (f: LayoutFinding): void => {
    out.findings.push(f);
  };
  const sub = (child: string, k: LayoutKind): void => {
    const r = checkLayout(child, k, storeDir);
    out.checked += r.checked;
    out.findings.push(...r.findings);
  };
  for (const e of entries(root)) {
    out.checked++;
    const abs = join(root, e.name);
    if (!e.dir) {
      add({ level: "blocking", check: "loose-file", path: abs, fix: `move it into the folder of its role (${out.structure})` });
      continue;
    }
    if (!onSomeSlot(slots, [e.name])) {
      // an organisation's non-repo work folder (no `_`, no `Dept_`) has its place there (Struc_Region_Company)
      if (kind === "company" && !ROLE_PREFIX.test(e.name) && !isRepo(abs)) continue;
      add({ level: "blocking", check: "unknown-folder", path: abs, fix: `no slot of ${out.structure} takes "${e.name}" - move it, or add a slot to HS (approval)` });
      continue;
    }
    if (kind === "drive") {
      if (e.name === "Workspace") {
        sub(abs, "workspace");
        for (const p of unmatchedStudy(root)) {
          add({ level: "blocking", check: "study-unmatched", path: p, fix: "a study project mirrors a folder of Study/, or carries _README.md naming its course when no material is kept (Personal_145) - neither here: it is not a study project, move it to Games/ or Apps/" });
        }
      } else {
        if (FIXED_CHILDREN.test(e.name)) {
          for (const c of entries(abs).filter((x) => x.dir)) {
            if (!onSomeSlot(slots, [e.name, c.name])) add({ level: "blocking", check: "unknown-value", path: join(abs, c.name), fix: `${e.name}/ holds a fixed list of folders (${e.name === "Game" ? "Game_164" : "Documents_152"})` });
          }
        }
        if (e.name === "Software") {
          for (const a of entries(abs).filter((x) => x.dir)) {
            if (!onSomeSlot(slots, [e.name, a.name])) {
              add({ level: "blocking", check: "unknown-value", path: join(abs, a.name), fix: "Software/ holds the groups of Software_148 only" });
              continue;
            }
            if (PACK_GROUPS.test(a.name)) continue;
            for (const prog of programsIn(join(abs, a.name))) {
              const stray = entries(prog).filter((x) => (x.dir ? !isProgramPart(x.name) : x.name !== SPLIT_MARK)).map((x) => x.name);
              if (stray.length) {
                add({ level: "blocking", check: "program-stray", path: prog, fix: `a program folder holds only Setup/ (installer) · App/ (installed copy) · Data/ (its own data), each only when it has something to hold - move ${stray.join(", ")} into its part` });
              }
            }
          }
        }
        for (const p of reposUnder(abs, 4)) add({ level: "blocking", check: "repo-outside-workspace", path: p, fix: "repos live in Workspace/ only" });
      }
    } else if (kind === "workspace") {
      if (e.name === "Company") {
        for (const org of entries(abs).filter((x) => x.dir)) {
          const p = join(abs, org.name);
          if (isRepo(p)) add({ level: "blocking", check: "repo-under-company", path: p, fix: "a repo goes inside its organisation's folder, Company/<org>/<repo>" });
          else sub(p, "company");
        }
      }
      if (e.name === "Personal") {
        // every item of Personal/ sits under one of its fixed kinds (Personal_145); a repo straight under it is caught too
        for (const k of entries(abs).filter((x) => x.dir)) {
          if (!onSomeSlot(slots, [e.name, k.name])) {
            add({ level: "blocking", check: "unknown-value", path: join(abs, k.name), fix: "Personal/ holds the kinds of Personal_145 only - move it under its kind" });
          }
        }
      }
      if (e.name === "External") {
        for (const x of entries(abs).filter((y) => y.dir)) {
          const p = join(abs, x.name);
          if (isAssembled(p)) add({ level: "advice", check: "assembled-external", path: p, fix: "External/ holds outside clones, read-only: no HS assembled there" });
        }
      }
    }
  }
  return out;
}
