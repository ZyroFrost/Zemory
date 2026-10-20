// One pass that brings a kit repo (folder harness) up to the store — the single implementation behind `zemory sync` and the
// app's "update repo" button (constitution article 17: one function, one command; a second door delegates here).
//
// A pass: assemble every part that is behind the store · put a first-generation repo's constitution in the current shape ·
// repoint links into the old harness · drop marker entries the move replaced · regenerate the guard · write what is still
// off the standard into the repo's TODO ledger, so the repo's next session finds it in the file it reads first.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { SHELF } from "./harness-names.js";
import { harnessPathsAt, readMarker } from "../core/config.js";
import { conform, type ConformItem } from "./conform.js";
import { generateGuards } from "./guard-gen.js";
import { applyKit, type KitApplyResult } from "./kit-apply.js";
import { normalizeOwnConstitution, pruneMarkerProtected, repointLinks } from "./kit-migrate.js";
import { regionRepos, repoRole } from "./region-links.js";
import { rewriteInPlace, STIGNORE_ALLOW_START, writeStignoreAllow, type StignoreAllowResult } from "./stignore-gen.js";
import { SLOT_LAYER, STORE_DIR } from "./store.js";

/** A repo the manager at `root` syncs: one that names it as owner, or names no owner while it is the only manager of its role. */
export interface ManagedRepo {
  root: string;
  name: string;
  /** the role of the repo's template (dept …) */
  role: string;
  /** the marker names no owner yet: the manager's sync writes it (it is the only repo of the workspace managing this role) */
  ownerMissing: boolean;
}

/**
 * The repos a workspace manager syncs down (user 2026-10-19: the manager fixes the shared standard and its sync reaches every
 * repo it manages, each assembled from ITS OWN set, so each stays on its own structure). A repo of the workspace counts when
 * the template of `root` manages its role and either its marker names `root` as owner, or it names no owner and `root` is
 * the only repo managing that role (the owner is then certain). With two managers of one role an unnamed repo is listed in
 * `ambiguous`: the machine does not guess — conform asks that repo to name its owner. A repo that is no manager gets nothing.
 */
export function managedRepos(root: string, storeDir = STORE_DIR): { repos: ManagedRepo[]; ambiguous: string[] } {
  const me = repoRole(root, storeDir);
  if (!me?.manages.length) return { repos: [], ambiguous: [] };
  const name = basename(resolve(root));
  const region = regionRepos(root, storeDir);
  const roles = new Map(region.map((at) => [at, repoRole(at, storeDir)] as const));
  const repos: ManagedRepo[] = [];
  const ambiguous: string[] = [];
  for (const at of region) {
    if (resolve(at) === resolve(root)) continue;
    const r = roles.get(at);
    if (!r || !me.manages.includes(r.name)) continue;
    const owner = readMarker(at)?.data.owner;
    if (owner === name) repos.push({ root: at, name: basename(at), role: r.name, ownerMissing: false });
    // another repo's, or a malformed owner (a list) — conform reports that one; never overwritten here
    else if (owner !== undefined && owner !== null && owner !== "") continue;
    else {
      const managers = region.filter((x) => roles.get(x)?.manages.includes(r.name));
      if (managers.length === 1) repos.push({ root: at, name: basename(at), role: r.name, ownerMissing: true });
      else ambiguous.push(basename(at));
    }
  }
  return { repos: repos.sort((a, b) => a.name.localeCompare(b.name)), ambiguous: ambiguous.sort() };
}

/** Write `owner` into a repo's marker (docs/.harness.json), keeping its other keys and its line ends. */
export function writeOwner(root: string, owner: string): boolean {
  const m = readMarker(root);
  if (!m) return false;
  const text = readFileSync(m.path, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  writeFileSync(m.path, (JSON.stringify({ ...m.data, owner }, null, 2) + "\n").replace(/\n/g, eol));
  return true;
}

export interface KitSyncResult {
  assembly: KitApplyResult;
  own: ReturnType<typeof normalizeOwnConstitution>;
  repointed: string[];
  dropped: string[];
  /** guard files written, or the error that stopped it (apply only) */
  guard: { added: string[] } | { error: string } | null;
  /** the standard block of the TODO ledger after the pass (apply only) */
  todo: StandardTodoResult | null;
  /** the machine-made allow list at the end of .stignore (slot Root_141_Stignore); null on a dry run */
  stignore: StignoreAllowResult | null;
  /** lines a slot requires added to / forbids removed from a line-list file ("<file>: + <line>"); empty on a dry run */
  slotLines: string[];
}

export function kitSync(root: string, opts: { kitRef?: string; apply: boolean }): KitSyncResult | { error: string } {
  const assembly = applyKit(root, { kitRef: opts.kitRef, apply: opts.apply });
  if ("error" in assembly) return { error: assembly.error };
  const own = normalizeOwnConstitution(root, opts.apply);
  let repointed: string[] = [];
  let dropped: string[] = [];
  let guard: KitSyncResult["guard"] = null;
  let todo: StandardTodoResult | null = null;
  let stignore: StignoreAllowResult | null = null;
  let slotLines: string[] = [];
  if (opts.apply) {
    // the lines a slot requires in a line-list file (.stignore · .gitattributes · .gitignore) are added, the old ones it
    // forbids are dropped — first, so the allow block below is written under a complete hand-written part
    slotLines = fixSlotLines(root, true);
    // what travels to the VM follows the manifests every pass (slot Root_141_Stignore) — before conform measures it
    stignore = writeStignoreAllow(root, true);
    // pointers into the old harness follow it every pass (idempotent): links, paths written as text, old skill host names
    repointed = repointLinks(root, true);
    dropped = pruneMarkerProtected(root, true);
    try {
      guard = { added: generateGuards(root).added };
    } catch (e) {
      guard = { error: e instanceof Error ? e.message : String(e) };
    }
    // measured AFTER the parts are in place: what the pass could not fix is the repo's own work
    todo = writeStandardTodo(root, conform(root).items);
  }
  return { assembly, own, repointed, dropped, guard, todo, stignore, slotLines };
}

/** Files a slot gate may complete line by line: each line is one pattern, so a missing required text is one more line. */
const LINE_FILES = new Set([".stignore", ".gitattributes", ".gitignore"]);

/**
 * Complete what the slots of the repo require in a line-list file (gate.json › conform: `contains` · `absent`): a required text
 * the file lacks becomes a line of its own — in .stignore above the machine allow block, so it still wins there (first match) —
 * and a line holding a forbidden old text goes. Other files are the repo's to write: conform reports them. The file is changed
 * in place, so a Hidden .stignore is written too. Returns "<file>: + <line>" / "<file>: - <line>" for what changed.
 */
export function fixSlotLines(root: string, apply: boolean): string[] {
  const slotsDir = join(harnessPathsAt(root).agent, SHELF.structure, SLOT_LAYER);
  const out: string[] = [];
  let slots: string[];
  try { slots = readdirSync(slotsDir); } catch { return out; }
  for (const s of slots) {
    let c: { contains?: Record<string, unknown>; absent?: Record<string, unknown> } | undefined;
    try { c = (JSON.parse(readFileSync(join(slotsDir, s, "gate.json"), "utf8")) as { conform?: typeof c }).conform; } catch { continue; }
    if (!c) continue;
    const list = (v: unknown): string[] => (Array.isArray(v) ? v : [v]).filter((x): x is string => typeof x === "string" && x.length > 0);
    for (const rel of new Set([...Object.keys(c.contains ?? {}), ...Object.keys(c.absent ?? {})])) {
      if (!LINE_FILES.has(rel)) continue;
      const p = join(root, rel);
      if (!existsSync(p)) continue;
      const text = readFileSync(p, "utf8");
      const eol = text.includes("\r\n") ? "\r\n" : "\n";
      let lines = text.split(/\r?\n/);
      const gone = list(c.absent?.[rel]);
      const keep = lines.filter((l) => !gone.some((g) => l.includes(g)));
      for (const l of lines) if (!keep.includes(l)) out.push(`${rel}: - ${l.trim()}`);
      lines = keep;
      const missing = list(c.contains?.[rel]).filter((n) => !lines.join("\n").includes(n));
      if (missing.length) {
        const at = lines.findIndex((l) => l.startsWith(STIGNORE_ALLOW_START));
        const before = at >= 0 ? at : lines.length - (lines[lines.length - 1] === "" ? 1 : 0);
        lines.splice(before, 0, ...missing, ...(at >= 0 ? [""] : []));
        for (const m of missing) out.push(`${rel}: + ${m}`);
      }
      const next = lines.join(eol);
      if (next !== text && apply) rewriteInPlace(p, next);
    }
  }
  return out;
}

export const STANDARD_TODO_START = "<!-- zemory:standard-todo:start";
export const STANDARD_TODO_END = "<!-- zemory:standard-todo:end -->";
const STANDARD_TODO_HEAD =
  `${STANDARD_TODO_START} · written by \`zemory sync\` from \`zemory conform\`; rewritten every run, removed once the repo is on the standard — fix the repo, never this block -->`;

export interface StandardTodoResult {
  /** written = block added or changed · removed = the repo is clean, the block left · unchanged · none = no ledger */
  state: "written" | "removed" | "unchanged" | "none";
  /** blocking findings (must fix) · advisory ones listed to look at */
  items: number;
  advisory: number;
  file: string | null;
}

const counts = (items: ConformItem[]): { items: number; advisory: number } => ({
  items: items.filter((i) => i.level === "blocking").length,
  advisory: items.filter((i) => i.level !== "blocking").length,
});

/** Findings listed under one item; past it the item says how many more and where to see them (conform), never silently cut. */
const TODO_ROWS_CAP = 80;

/**
 * The block of open standard work: one item per blocking conform finding with how to fix it, then EVERY place it was found,
 * one line each — the repo's session fixes from this block alone, as from a list a person hand-wrote for it.
 */
export function standardTodoBlock(items: ConformItem[]): string {
  const entry = (i: ConformItem): string[] => {
    const all = i.all ?? i.samples;
    const rows = all.slice(0, TODO_ROWS_CAP).map((s) => `  - ${s}`);
    if (all.length > TODO_ROWS_CAP) rows.push(`  - (+${all.length - TODO_ROWS_CAP} more — \`zemory conform --json\` lists them all)`);
    return [`- [ ] \`${i.check}\` (${i.count}) ${i.title} → ${i.fix}`, ...rows];
  };
  const must = items.filter((i) => i.level === "blocking");
  const look = items.filter((i) => i.level !== "blocking");
  const out = [STANDARD_TODO_HEAD, "## Lệch chuẩn — `zemory sync` giao, tự xoá khi hết lệch", ""];
  if (must.length) out.push("### Phải sửa", ...must.flatMap(entry));
  if (look.length) out.push(...(must.length ? [""] : []), "### Nên xem (máy không phân biệt được — người đọc quyết)", ...look.flatMap(entry));
  return [...out, STANDARD_TODO_END].join("\n");
}

/**
 * Put the block into the TODO ledger (after its first heading), replace the one already there, or remove it when nothing
 * blocks. Every other line of the ledger is the repo's own and stays byte for byte. The line ending follows the file.
 */
export function writeStandardTodo(root: string, items: ConformItem[]): StandardTodoResult {
  const file = harnessPathsAt(root).todo;
  if (!existsSync(file)) return { state: "none", ...counts(items), file: null };
  const text = readFileSync(file, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const s = text.indexOf(STANDARD_TODO_START);
  const e = s >= 0 ? text.indexOf(STANDARD_TODO_END, s) : -1;
  // the ledger without the old block (and the blank line that followed it)
  let rest = text;
  if (s >= 0 && e >= 0) {
    let after = e + STANDARD_TODO_END.length;
    while (text.startsWith(eol, after) && text.startsWith(eol, after + eol.length)) after += eol.length;
    if (text.startsWith(eol, after)) after += eol.length;
    rest = text.slice(0, s) + text.slice(after);
  }
  let next = rest;
  if (items.length) {
    const block = standardTodoBlock(items).split("\n").join(eol);
    const h1 = /^#\s.*$/m.exec(rest);
    const at = h1 ? h1.index + h1[0].length : 0;
    const head = rest.slice(0, at);
    const tail = rest.slice(at).replace(/^(\r?\n)+/, "");
    next = h1 ? `${head}${eol}${eol}${block}${eol}${eol}${tail}` : `${block}${eol}${eol}${tail}`;
  }
  if (next === text) return { state: "unchanged", ...counts(items), file };
  writeFileSync(file, next);
  return { state: items.length ? "written" : "removed", ...counts(items), file };
}
