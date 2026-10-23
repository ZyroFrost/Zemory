// The layout levels of HS (docs/plan/32): a data drive, its Workspace/, and each organisation's folder are structures
// like a repo's (Struc_Disk_Data · Struc_Region_Workspace · Struc_Region_Company), made of slots whose `path` is a
// pattern. This module reads those structures from HS and checks a real tree against them. A layout is a dictionary plus
// checks: it never creates folders, and it writes nothing into the roots it checks (a drive root holds no loose file).

import { existsSync, readdirSync } from "node:fs";
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
  check: "loose-file" | "unknown-folder" | "repo-outside-workspace" | "unknown-value" | "program-incomplete" | "repo-under-company" | "assembled-external";
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

function entries(dir: string): Array<{ name: string; dir: boolean }> {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => !/^\$|^System Volume Information$|^\.st(folder|versions)$|^desktop\.ini$/i.test(e.name))
      .map((e) => ({ name: e.name, dir: e.isDirectory() }));
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

/** The three parts every program folder holds (Software_149): its installer, its installed copy, its own data. */
const PROGRAM_PARTS = ["Setup", "App", "Data"] as const;
/** Groups whose children are packs, not programs: a driver or a font has no installed copy. */
const PACK_GROUPS = /^(Drivers|Fonts)$/;

/**
 * The program folders of one `Software/<group>/`: a child that already has a program part, or no sub-folder at all, is a
 * program; any other child is a vendor level (`[<vendor>/]`) and its children are the programs.
 */
function programsIn(groupDir: string): string[] {
  const out: string[] = [];
  for (const c of entries(groupDir).filter((x) => x.dir)) {
    const p = join(groupDir, c.name);
    const subs = entries(p).filter((x) => x.dir);
    const isProgram = subs.length === 0 || subs.some((s) => (PROGRAM_PARTS as readonly string[]).includes(s.name));
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
      add({ level: "blocking", check: "unknown-folder", path: abs, fix: `no slot of ${out.structure} takes "${e.name}" - move it, or add a slot to HS (approval)` });
      continue;
    }
    if (kind === "drive") {
      if (e.name === "Workspace") sub(abs, "workspace");
      else {
        if (e.name === "Software") {
          for (const a of entries(abs).filter((x) => x.dir)) {
            if (!onSomeSlot(slots, [e.name, a.name])) {
              add({ level: "blocking", check: "unknown-value", path: join(abs, a.name), fix: "Software/ holds the groups of Software_148 only" });
              continue;
            }
            if (PACK_GROUPS.test(a.name)) continue;
            for (const prog of programsIn(join(abs, a.name))) {
              const missing = PROGRAM_PARTS.filter((part) => !existsSync(join(prog, part)));
              if (missing.length) {
                add({ level: "blocking", check: "program-incomplete", path: prog, fix: `every program holds Setup/ (installer) · App/ (installed copy) · Data/ (its own data) - missing ${missing.join(", ")}` });
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
