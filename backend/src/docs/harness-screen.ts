// The cockpit's Harness screen (docs/plan/31): the sets as they are on disk, the parts of HS, and building a set from
// them. No register: a set is its folder (store.ts readKits), and saving one is assembling it (kit-apply.ts assembleSet).
// Pure data in and out - the daemon runs these in a worker thread (HS is read through a mount in the Docker install).

import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { harnessPathsAt } from "../core/config.js";
import { HOST_KIND, parseSetName, SHELF, TIER } from "./harness-names.js";
import { assembleSet } from "./kit-apply.js";
import { partLinks } from "./law-links.js";
import { frontMatter, hostSkillOf, type Kit, kitCluster, kitParts, leafOf, listParts, listStructures, mainOf, readKits, setDir, SLOT_LAYER, STORE_DIR, structureSlotNames, translationsOf, type Part } from "./store.js";

export type ShelfKey = "rules" | "constitution" | "structure" | "slots" | "skills";

export interface CatalogPart {
  id: string;
  folder: string;
  name: string;
  version: number;
  kind?: string;
  /** the clusters the part is for (empty = every cluster): a set whose frame is of another cluster drops it */
  applies?: string[];
  /** a frame only: the slots it lists, so the builder marks them as already there */
  slots?: string[];
}

export interface SetView {
  name: string;
  no: string;
  host: string;
  tier: string;
  structure: string;
  rules: string[];
  constitution: string[];
  skills: string[];
  /** custom slots on top of the frame's (plan/31 §1b) */
  slots: string[];
}

export interface Draft {
  /** the set being edited (its folder name), or absent for a new set */
  editing?: string;
  host: string;
  tier: string;
  /** the name part between host and tier: `App` in `04_IDE_App_Memory` */
  title: string;
  structure: string;
  rules: string[];
  constitution: string[];
  skills: string[];
  /** custom slots added on top of the frame's slots, by bare name (plan/31 §1b) */
  slots: string[];
}

const view = (p: Part): CatalogPart => ({
  id: p.id, folder: p.folder, name: p.name, version: p.version, ...(p.kind ? { kind: p.kind } : {}), ...(p.applies.length ? { applies: p.applies } : {}),
});

/** Every set beside HS, in number order. */
export function listSets(storeDir = STORE_DIR): SetView[] {
  return readKits(storeDir).map((k) => ({ name: k.name, no: k.no, host: k.host, tier: k.tier, structure: k.structure, rules: k.rules, constitution: k.constitution, skills: k.skills, slots: k.slots ?? [] }));
}

/** The parts of HS a set can be built from, by shelf. */
export function storeCatalog(storeDir = STORE_DIR): Record<ShelfKey, CatalogPart[]> {
  return {
    rules: listParts(storeDir, SHELF.rules).map(view),
    constitution: listParts(storeDir, SHELF.constitution).map(view),
    // a set is built on a REPO frame; a drive or region frame (`scope: disk|region`) lays out folders above repos
    structure: listStructures(storeDir).filter((s) => !s.meta.scope).map((s) => ({ ...view(s), slots: structureSlotNames(s) })),
    // slots a set may add on top of its frame: repo-level slots only (a `scope: layout` slot lays out a drive), by bare name
    slots: listParts(storeDir, SHELF.structure)
      .filter((p) => p.folder.startsWith(`${SLOT_LAYER}/`) && !p.meta.scope)
      .map((p) => ({ ...view(p), folder: leafOf(p.folder) })),
    skills: listParts(storeDir, SHELF.skills).map(view),
  };
}

/** What the builder offers: the parts of HS, and the host and tier a set name may carry (one list, in harness-names). */
export function catalogView(storeDir = STORE_DIR): Record<ShelfKey, CatalogPart[]> & { hosts: string[]; tiers: string[] } {
  return { ...storeCatalog(storeDir), hosts: [...HOST_KIND], tiers: [...TIER] };
}

const SHELF_OF: Record<ShelfKey, (typeof SHELF)[keyof typeof SHELF]> = {
  rules: SHELF.rules,
  constitution: SHELF.constitution,
  structure: SHELF.structure,
  slots: SHELF.structure,
  skills: SHELF.skills,
};

/** The header file of one part of HS, by shelf and folder; null when there is no such part. */
export function partText(shelf: ShelfKey, folder: string, lang = "", storeDir = STORE_DIR): { folder: string; text: string; lang?: string } | null {
  const parts = shelf === "structure" ? listStructures(storeDir) : listParts(storeDir, SHELF_OF[shelf]);
  const p = parts.find((x) => x.folder === folder || x.id === folder || (shelf === "slots" && leafOf(x.folder) === folder));
  if (!p) return null;
  // people read the translation in the cockpit's language when the part has one (plan/33); otherwise the English header
  const tr = lang ? translationsOf(p.dir).get(lang) : undefined;
  if (tr) return { folder: p.folder, text: readFileSync(join(p.dir, tr), "utf8"), lang };
  for (const f of [join(p.dir, `${leafOf(p.folder)}.md`), join(p.dir, mainOf(p))]) {
    if (existsSync(f)) return { folder: p.folder, text: readFileSync(f, "utf8") };
  }
  return null;
}

/**
 * The set folders beside HS, by name and number only - one directory listing. The draft check needs no more than this; a
 * full `readKits` reads every part of every set (measured in Docker, HS on a mount: 10 s per call, twice per check).
 */
function setNames(storeDir = STORE_DIR): Array<{ name: string; no: string }> {
  const base = dirname(storeDir);
  if (!existsSync(base)) return [];
  const out: Array<{ name: string; no: string }> = [];
  for (const e of readdirSync(base, { withFileTypes: true })) {
    const n = e.isDirectory() ? parseSetName(e.name) : null;
    if (n) out.push({ name: e.name, no: n.nn });
  }
  return out;
}

/** The folder name a draft saves to: the edited set's number, or the next free one. */
export function draftName(d: Draft, storeDir = STORE_DIR, sets = setNames(storeDir)): string {
  const nn = d.editing ? (parseSetName(d.editing)?.nn ?? "") : String(Math.max(0, ...sets.map((s) => Number(s.no))) + 1).padStart(2, "0");
  return `${nn}_${d.host}_${d.title}_${d.tier}`;
}

/** One thing wrong with a draft: a code the cockpit words in its own language, and the parts it names. */
export interface Problem {
  code: "host" | "tier" | "name" | "noSet" | "taken" | "structure" | "unknown" | "twice" | "link" | "applies" | "inFrame";
  a?: string;
  b?: string;
}

const PROBLEM_TEXT: Record<Problem["code"], (p: Problem) => string> = {
  host: () => `host must be one of ${HOST_KIND.join(" · ")}`,
  tier: () => `tier must be one of ${TIER.join(" · ")}`,
  name: (p) => `"${p.a}" is not a set name: letters and digits, starting with a capital or a digit`,
  noSet: (p) => `an edited set keeps its name: ${p.a} is not a set, or the draft renames it`,
  taken: (p) => `${p.a} already holds number ${p.b}`,
  structure: () => "choose the repo structure (Struc_*) the set is built on",
  unknown: (p) => `${p.a} is not a part of HS`,
  twice: (p) => `a ${p.a} part is listed twice`,
  link: (p) => `${p.a} implements ${p.b}, which this set does not carry`,
  applies: (p) => `${p.a} applies to other clusters, not to ${p.b}: assembly would leave it out`,
  inFrame: (p) => `${p.a} is already a slot of ${p.b}: a custom slot only adds what the frame does not have`,
};

/** A draft as it came over the wire, with every field the type it must be. */
export function normalDraft(d: unknown): Draft {
  const o = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
  const str = (x: unknown): string => (typeof x === "string" ? x : "");
  const arr = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : []);
  return {
    ...(str(o.editing) ? { editing: str(o.editing) } : {}),
    host: str(o.host), tier: str(o.tier), title: str(o.title), structure: str(o.structure),
    rules: arr(o.rules), constitution: arr(o.constitution), skills: arr(o.skills), slots: arr(o.slots),
  };
}

/** What is wrong with a draft; empty = it can be saved. */
export function draftProblems(d: Draft, storeDir = STORE_DIR): Problem[] {
  const out: Problem[] = [];
  const kits = setNames(storeDir);
  const name = draftName(d, storeDir, kits);
  if (!(HOST_KIND as readonly string[]).includes(d.host)) out.push({ code: "host" });
  if (!(TIER as readonly string[]).includes(d.tier)) out.push({ code: "tier" });
  if (!parseSetName(name)) out.push({ code: "name", a: d.title });
  // an edited set keeps its folder name: a rename would leave the old folder holding the same number
  if (d.editing && (!kits.some((k) => k.name === d.editing) || name !== d.editing)) out.push({ code: "noSet", a: d.editing });
  const taken = kits.find((k) => k.name !== d.editing && (k.name === name || k.no === parseSetName(name)?.nn));
  if (taken) out.push({ code: "taken", a: taken.name, b: taken.no });
  const cat = storeCatalog(storeDir);
  if (!cat.structure.some((s) => s.folder === d.structure)) out.push({ code: "structure" });
  const known = (shelf: ShelfKey, key: "id" | "folder") => new Set(cat[shelf].map((p) => p[key]));
  for (const [shelf, list, key] of [["rules", d.rules, "id"], ["constitution", d.constitution, "id"], ["slots", d.slots, "folder"], ["skills", d.skills, "folder"]] as const) {
    const ok = known(shelf, key);
    for (const x of list) if (!ok.has(x)) out.push({ code: "unknown", a: x });
    if (new Set(list).size !== list.length) out.push({ code: "twice", a: shelf });
  }
  // a custom slot only ADDS: one the frame already lists is no custom slot (it would change nothing, and reads as if it did)
  const frame = listStructures(storeDir).find((s) => s.folder === d.structure);
  if (frame) {
    const framed = new Set(structureSlotNames(frame));
    for (const sl of d.slots) if (framed.has(sl)) out.push({ code: "inFrame", a: sl, b: d.structure });
  }
  // a part whose `applies` leaves out the cluster of the chosen frame is dropped by assembly (kitParts) without a word:
  // say it here, before the user saves a set that silently lacks it
  if (cat.structure.some((s) => s.folder === d.structure)) {
    const cluster = kitCluster({ structure: d.structure });
    for (const [shelf, list, key] of [["rules", d.rules, "id"], ["constitution", d.constitution, "id"], ["skills", d.skills, "folder"]] as const) {
      const byKey = new Map(cat[shelf].map((p) => [p[key], p] as const));
      for (const x of list) {
        const applies = byKey.get(x)?.applies;
        if (applies?.length && !applies.includes(cluster)) out.push({ code: "applies", a: x, b: cluster });
      }
    }
  }
  // a skill that implements a law the set does not carry: the law layers would not agree (Rule_Gate_86)
  const ruleLeaves = new Set(cat.rules.filter((r) => d.rules.includes(r.id)).map((r) => leafOf(r.folder)));
  const lawLeaves = new Set([...cat.rules.map((r) => leafOf(r.folder))]);
  for (const s of d.skills) {
    for (const l of partLinks(leafOf(s), storeDir).to) {
      if (l.kind === "implements" && lawLeaves.has(l.name) && !ruleLeaves.has(l.name)) out.push({ code: "link", a: s, b: l.name });
    }
  }
  return out;
}

/** What is wrong with a draft, one line each; empty = it can be saved. */
export function checkDraft(d: Draft, storeDir = STORE_DIR): string[] {
  return draftProblems(normalDraft(d), storeDir).map((p) => PROBLEM_TEXT[p.code](p));
}

/** The builder's live check: the folder name the draft saves to and what stops it. */
export function draftReport(d: unknown, storeDir = STORE_DIR): { name: string; problems: Problem[] } {
  const n = normalDraft(d);
  return { name: draftName(n, storeDir), problems: draftProblems(n, storeDir) };
}

/** Save a draft: check it, then assemble the set folder from HS. */
export function saveDraft(input: Draft, storeDir = STORE_DIR): { ok: true; name: string; written: number } | { ok: false; errors: string[] } {
  const d = normalDraft(input);
  const errors = checkDraft(d, storeDir);
  if (errors.length) return { ok: false, errors };
  const name = draftName(d, storeDir);
  const kit = kitOf(d, name);
  if (!kit) return { ok: false, errors: [`bad set name ${name}`] };
  // A repo keeps a part its set no longer lists (assembly never takes away what a repo carries); a set IS its folder, so a
  // part taken out of the draft leaves it - the HS copy only (from: line), with its host build
  const removed = d.editing === name ? dropLeftParts(name, kit, storeDir) : 0;
  const r = assembleSet(kit, storeDir);
  if ("error" in r) return { ok: false, errors: [r.error] };
  return { ok: true, name, written: r.written.length + removed };
}

/** The kit a draft saves as, under the folder name `name`; null when the name is no set name. */
function kitOf(d: Draft, name: string): Kit | null {
  const n = parseSetName(name);
  if (!n) return null;
  return {
    no: n.nn, name, legacy: [], status: "built", host: n.host, structure: d.structure, tier: n.tier as Kit["tier"],
    requires: [], constitution: d.constitution, rules: d.rules, skills: d.skills, tools: [], ...(d.slots.length ? { slots: d.slots } : {}),
  };
}

function filesUnder(dir: string): number {
  let n = 0;
  for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) n += e.isDirectory() ? filesUnder(join(dir, e.name)) : 1;
  return n;
}

/**
 * What saving a draft writes, before it is saved: each part folder assembly copies into the set (the same list
 * `assembleSet` works from - `kitParts`), with its number of files. The Save confirmation shows this.
 */
export function draftPreview(input: unknown, storeDir = STORE_DIR): { name: string; writes: Array<{ path: string; files: number }> } {
  const d = normalDraft(input);
  const name = draftName(d, storeDir);
  const kit = kitOf(d, name);
  if (!kit) return { name, writes: [] };
  const writes = kitParts(kit, storeDir).map((p) => ({ path: `${name}/docs/agent/${p.shelf}/${p.folder}`, files: filesUnder(p.dir) }));
  return { name, writes };
}

function dropLeftParts(name: string, kit: Kit, storeDir: string): number {
  const hp = harnessPathsAt(setDir(name, storeDir));
  const keep: Record<string, Set<string>> = {
    [SHELF.rules]: new Set(kit.rules),
    [SHELF.constitution]: new Set(kit.constitution),
    [SHELF.skills]: new Set(kit.skills),
  };
  let n = 0;
  // a custom slot taken out of the draft leaves the set folder; the frame's own slots are never touched here
  const frame = listStructures(hp.agent)[0];
  const keepSlots = new Set([...(frame ? structureSlotNames(frame) : []), ...(kit.slots ?? [])]);
  for (const p of listParts(hp.agent, SHELF.structure)) {
    if (!p.from || !p.folder.startsWith(`${SLOT_LAYER}/`) || keepSlots.has(leafOf(p.folder))) continue;
    rmSync(p.dir, { recursive: true, force: true });
    n++;
  }
  for (const shelf of [SHELF.rules, SHELF.constitution, SHELF.skills] as const) {
    for (const p of listParts(hp.agent, shelf)) {
      if (!p.from || keep[shelf].has(shelf === SHELF.skills ? p.folder : p.id)) continue;
      if (shelf === SHELF.skills) {
        const build = join(hp.skills, hostSkillOf(p));
        const main = join(build, "SKILL.md");
        if (existsSync(main) && frontMatter(readFileSync(main, "utf8"))?.meta.from) rmSync(build, { recursive: true, force: true });
      }
      rmSync(p.dir, { recursive: true, force: true });
      n++;
    }
  }
  return n;
}
