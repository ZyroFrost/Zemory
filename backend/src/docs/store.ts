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
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { merge3 } from "./standard.js";
import { archiveDirOf } from "../core/config.js";
import { relinkFrom } from "./relink.js";
import { CONS_REPO_FILE, HOST_KIND, LEGACY_LEDGER, LEGACY_SETS, LEGACY_SHELF, SHELF, citationKey, enforcementOf, keyOf, legacyKey, parsePartName, parseSetName, slotArea } from "./harness-names.js";
import { viName } from "./vi-name-judge.js";

// Same place as adopt.ts TEMPLATE_DIR, computed here: guard-gen imports this module and adopt imports guard-gen, so taking
// the constant from adopt would read it before adopt has run.
export const STORE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs_template", "_Store");
/** Shelves in reading order (plan/28 §0o): common rules above the repo's own constitution. A legacy shelf folder
 *  (`02_RULES` · `01_CONSTITUTION`) is still READ through `shelfDir`; everything is WRITTEN under these names. */
export const SHELVES = [SHELF.rules, SHELF.constitution, SHELF.structure, SHELF.skills] as const;
export type Shelf = (typeof SHELVES)[number];

/** The file of a part that carries its header (id · name · version · from). */
export const MAIN_FILE: Record<Shelf, string> = {
  [SHELF.rules]: "RULE.md",
  [SHELF.constitution]: "RULE.md",
  [SHELF.structure]: "SLOT.md",
  [SHELF.skills]: "SKILL.md",
};

/**
 * The two layers of the structure shelf (plan/28 §0o). The inner layer `_Slot/` holds every slot (`_Host/` the hosts); a slot belongs to no
 * structure and is never assembled on its own. The outer layer is one folder per structure (`Struc_Repo_App/`): a
 * STRUCTURE.md and a structure.json naming the slots it is made of. A kit picks one structure; the slots come through it.
 */
export const SLOT_LAYER = "_Slot";
/** The slot layer's older name (before plan/28 §0p): still read; sync renames it. */
export const LEGACY_SLOT_LAYER = "_Struc_Slot";
/** The hosts' inner layer (plan/28 §0p E): one folder per kind of environment (`_Host/GUI`); a set carries exactly one. */
export const HOST_LAYER = "_Host";
/** Key name of a host's header file inside the tool (see mainOf); on disk it is named after its folder. */
export const HOST_MAIN = "HOST.md";
const INNER_LAYERS: readonly string[] = [SLOT_LAYER, LEGACY_SLOT_LAYER, HOST_LAYER];
export const STRUCTURE_MAIN = "STRUCTURE.md";
/** Folder of a slot's starter files (`seed/<repo path>`): written once into a new repo where nothing is yet, never
 *  compared or merged after that — not part of the slot's content, not copied with it. */
export const SEED_DIR = "seed";

/**
 * The KEY of a part's header file inside the tool: an outer structure's STRUCTURE.md, every other part its shelf's file.
 * On disk the header file is named after its folder (plan/28 §0p: `Rule_Gate_04_ScratchFiles/Rule_Gate_04_ScratchFiles.md`);
 * an older copy still has the key name. Every file map is keyed by the key name whatever the file is called on disk, so a
 * rename never changes a hash and a copy assembled before still matches its `from:` line (`readPartFiles` · `filesAt` read
 * it that way, `applyAssembly` writes the key back under the folder's name).
 */
export function mainOf(p: Pick<Part, "shelf" | "folder">): string {
  if (p.shelf === SHELF.structure && p.folder.startsWith(HOST_LAYER + "/")) return HOST_MAIN;
  return p.shelf === SHELF.structure && isStructureFolder(p.folder) ? STRUCTURE_MAIN : MAIN_FILE[p.shelf];
}

/** The header file's name on disk: the folder's own name. */
export function ownMainName(dir: string): string {
  return `${basename(dir)}.md`;
}

/** The header file of a part folder on disk: its own name, else the key name an older copy has. */
export function mainPath(dir: string, key: string): string {
  const own = join(dir, ownMainName(dir));
  return existsSync(own) || !existsSync(join(dir, key)) ? own : join(dir, key);
}

/** Does the folder hold a header file, under either name? */
export function hasMain(dir: string, key: string): boolean {
  return existsSync(join(dir, ownMainName(dir))) || existsSync(join(dir, key));
}

function isStructureFolder(folder: string): boolean {
  return folder.startsWith("Struc_");
}

/** A shelf name as written anywhere (legacy included) → the current shelf. */
export function currentShelf(name: string): Shelf | null {
  if ((SHELVES as readonly string[]).includes(name)) return name as Shelf;
  return (LEGACY_SHELF[name] as Shelf | undefined) ?? null;
}

/**
 * The archive leaves the harness folder for `docs/archive/` (plan/28 §0q, user 2026-10-18), for any harness — file or
 * folder. Merged into what is there, never overwriting: a name taken on both sides stays where it was and is reported.
 * File by file, so a markdown file one level shallower keeps its links pointing at the same files (relinkFrom).
 * Returns what was done, or "" when there was no old archive.
 */
export function moveArchiveOut(agentDir: string): string {
  const oldArchive = join(agentDir, "archive");
  if (!existsSync(oldArchive)) return "";
  const newArchive = join(dirname(agentDir), "archive");
  const left: string[] = [];
  const move = (from: string, to: string): void => {
    if (statSync(from).isDirectory()) {
      if (existsSync(to) && !statSync(to).isDirectory()) { left.push(relative(agentDir, from).replace(/\\/g, "/")); return; }
      mkdirSync(to, { recursive: true });
      for (const e of readdirSync(from)) move(join(from, e), join(to, e));
      if (!readdirSync(from).length) rmSync(from, { recursive: true });
      return;
    }
    if (existsSync(to)) { left.push(relative(agentDir, from).replace(/\\/g, "/")); return; }
    if (/\.md$/i.test(from)) {
      writeFileSync(to, relinkFrom(readFileSync(from, "utf8"), dirname(from), dirname(to), { from: oldArchive, to: newArchive }));
      rmSync(from);
    } else renameSync(from, to);
  };
  move(oldArchive, newArchive);
  return left.length ? `archive → ../archive (left in place, name taken on both sides: ${left.join(" · ")})` : "archive → ../archive";
}

/**
 * Rename a harness's legacy shelf folders to the current names, once (`02_RULES` → `01_RULES` · `01_CONSTITUTION` →
 * `02_CONSTITUTION`). Done before assembly writes anything, so parts never end up split across two shelf folders.
 * Returns the renames made.
 */
export function renameLegacyShelves(agentDir: string): string[] {
  const done: string[] = [];
  for (const [old, cur] of Object.entries(LEGACY_SHELF)) {
    if (old === cur) continue;
    const from = join(agentDir, old), to = join(agentDir, cur);
    if (!existsSync(from) || existsSync(to)) continue;
    try { if (!statSync(from).isDirectory()) continue; } catch { continue; }
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
    done.push(`${old} → ${cur}`);
  }
  // The skills list moves into the skills shelf, beside the sources it lists (as the structure shelf's INDEX.md).
  for (const list of ["04_SKILLS.md", "03_SKILLS.md"].map((n) => join(agentDir, n))) {
    const index = join(agentDir, SHELF.skills, "INDEX.md");
    if (!existsSync(list) || existsSync(index)) continue;
    try { if (!statSync(list).isFile()) continue; } catch { continue; }
    mkdirSync(join(agentDir, SHELF.skills), { recursive: true });
    renameSync(list, index);
    done.push(`${basename(list)} → ${SHELF.skills}/INDEX.md`);
  }
  const arch = moveArchiveOut(agentDir);
  if (arch) done.push(arch);
  // The forwarder the move to the folder harness left at the old hook path (for sessions open during the move) has done
  // its job by the next sync: gone, and the old hooks folder with it when nothing else is in it.
  const oldHooks = join(dirname(agentDir), "hooks");
  const fwd = join(oldHooks, "guard.cjs");
  if (existsSync(fwd) && readFileSync(fwd, "utf8").startsWith("// Forwarder left by the move to the folder harness")) {
    rmSync(fwd);
    if (!readdirSync(oldHooks).length) rmSync(oldHooks, { recursive: true });
    done.push("hooks/guard.cjs forwarder removed");
  }
  // The ledgers take their current names (plan/28 §0q): 05_TODO.md → 04_TODO.md · 06_CHANGES.md → 05_CHANGES.md.
  // Their archives too, so a ledger and its archive always carry the same name.
  for (const dir of [agentDir, archiveDirOf(agentDir)]) {
    for (const [old, cur] of Object.entries(LEGACY_LEDGER)) {
      const from = join(dir, old), to = join(dir, cur);
      if (!existsSync(from) || existsSync(to)) continue;
      renameSync(from, to);
      done.push(`${relative(agentDir, from).replace(/\\/g, "/")} → ${cur}`);
    }
  }
  // Slots that still sit flat on the structure shelf (assembled before the two layers, or the repo's own) move into the
  // inner layer, so the shelf only ever holds the layer and the structures.
  const st = join(agentDir, SHELF.structure);
  // The slot layer's older name moves to the current one; the slots inside are renamed by assembly (found by key).
  if (existsSync(join(st, LEGACY_SLOT_LAYER)) && !existsSync(join(st, SLOT_LAYER))) {
    renameSync(join(st, LEGACY_SLOT_LAYER), join(st, SLOT_LAYER));
    done.push(`${SHELF.structure}/${LEGACY_SLOT_LAYER} → ${SHELF.structure}/${SLOT_LAYER}`);
  }
  if (existsSync(st)) {
    let moved = 0;
    for (const e of readdirSync(st, { withFileTypes: true })) {
      if (!e.isDirectory() || INNER_LAYERS.includes(e.name) || isStructureFolder(e.name) || !hasMain(join(st, e.name), MAIN_FILE[SHELF.structure])) continue;
      const to = join(st, SLOT_LAYER, e.name);
      if (existsSync(to)) continue;
      mkdirSync(join(st, SLOT_LAYER), { recursive: true });
      renameSync(join(st, e.name), to);
      moved++;
    }
    if (moved) done.push(`${moved} slot(s) → ${SHELF.structure}/${SLOT_LAYER}/`);
  }
  return done;
}

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

// The shelf is one folder (`02_STRUCTURE`) or the law shelf with its inner layer (`01_LAW/_Rule`).
const FROM_RE = /^from:\s*_Store\/(\d{2}_[A-Z_]+(?:\/_(?:Rule|Cons))?)\/([^\s@]+)\s+@v(\d+)\s+#([0-9a-f]{8,})\s*$/;
// A `from:` line written before the shelves were renumbered names a legacy shelf; it still parses (the hash is what counts).
const knownShelf = (s: string): boolean => (SHELVES as readonly string[]).includes(s) || s in LEGACY_SHELF;
/** A shelf named in a `from:` line, a legacy name mapped to the current shelf. */
const shelfOfFrom = (s: string): Shelf => ((SHELVES as readonly string[]).includes(s) ? s : LEGACY_SHELF[s]) as Shelf;

export function fromLine(p: Pick<Part, "shelf" | "folder" | "version">, hash: string): string {
  return `from: _Store/${p.shelf}/${p.folder} @v${p.version} #${hash}`;
}

export function parseFrom(value: string): FromRef | null {
  const m = FROM_RE.exec(`from: ${value}`.replace(/^from:\s*from:/, "from:"));
  if (!m || !knownShelf(m[1])) return null;
  return { shelf: shelfOfFrom(m[1]), folder: m[2], version: Number(m[3]), hash: m[4] };
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
/**
 * The host builds a skill carries inside its own folder (plan/28 §0o: `Skill_<Group>_<Name>/Claude/<host-name>/`): assembled
 * from the skill's source by the tool, never edited by hand. They are not part of the skill's content — not hashed, not
 * merged, not copied into another build.
 */
export const HOST_BUILD_DIRS = ["Claude", "Codex"] as const;
const NOT_CONTENT: readonly string[] = [...HOST_BUILD_DIRS, SEED_DIR];

export function partFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (d === dir && NOT_CONTENT.includes(e.name)) continue;
        walk(p);
      } else if (!(d === dir && e.name === CONS_REPO_FILE)) out.push(relative(dir, p).replace(/\\/g, "/"));
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
  const own = ownMainName(dir);
  const files = partFiles(dir);
  for (const f of files) {
    // the header file is keyed by its key name (`mainOf`); a stale key-named file beside the own-named one is left out
    if (main && f === main && main !== own && files.includes(own)) continue;
    m.set(main && f === own ? main : f, readFileSync(join(dir, f), "utf8"));
  }
  const head = main ? frontMatter(m.get(main) ?? "")?.meta.generated : undefined;
  for (const g of Array.isArray(head) ? head : typeof head === "string" && head ? [head] : []) m.delete(g);
  return m;
}

export function partHash(dir: string, shelf: Shelf, main = MAIN_FILE[shelf]): string {
  return hashFiles(readPartFiles(dir, main), main);
}

// ── reading parts ────────────────────────────────────────────────────────────────────────────────────────────────────

/** One part folder. `folder` is the path below the shelf: `_Slot/<Area>_<NNN>_<Name>` for a slot, `_Host/<kind>` for a host. */
export function readPart(dir: string, shelf: Shelf, mainName = MAIN_FILE[shelf]): Part | null {
  const main = mainPath(dir, mainName);
  if (!existsSync(main)) return null;
  const text = readFileSync(main, "utf8");
  const meta = frontMatter(text)?.meta ?? {};
  const segs = dir.replace(/\\/g, "/").split("/");
  const leaf = segs.pop() ?? "";
  const parent = segs.pop() ?? "";
  // a slot read from the layer's older name is placed under the current one: assembly always writes `_Slot/`
  const layer = parent === LEGACY_SLOT_LAYER ? SLOT_LAYER : parent;
  const folder = shelf === SHELF.structure && INNER_LAYERS.includes(parent) ? `${layer}/${leaf}` : leaf;
  const str = (k: string): string => (typeof meta[k] === "string" ? (meta[k] as string) : "");
  const list = (k: string): string[] => (Array.isArray(meta[k]) ? (meta[k] as string[]) : str(k) ? [str(k)] : []);
  const from = str("from") ? parseFrom(str("from")) ?? undefined : undefined;
  const id = str("id") || leaf.split("_")[0];
  return {
    shelf,
    folder,
    dir,
    id,
    key: partKey(id, leaf),
    name: str("name") || leaf.replace(/^\d{2}-\d+_/, ""),
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

/**
 * Every part named in the store's own text (`Rule_Gate_31_…` · `Cons_Gate_09_…` · `Skill_Harness_Audit`) must be a live part.
 * A renamed or retired part left behind in prose points readers at nothing: seven such mentions of a renamed rule lived on in
 * three parts (2026-10-17). Archive/ is the one place that names the retired. Returns "<file>: <name>" per dead mention.
 */
export function partMentionFindings(storeDir = STORE_DIR): string[] {
  const live = new Set<string>();
  for (const shelf of SHELVES) for (const p of listParts(storeDir, shelf)) live.add(leafOf(p.folder));
  // a group may be all capitals (`Skill_PBI_Base`)
  const NAME = /\b(?:(?:Rule|Cons)_(?:Gate|Keys|Core)_\d{2,3}_[A-Za-z0-9]+|Skill_[A-Z][A-Za-z]+_[A-Za-z0-9]+)\b/g;
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!(d === storeDir && e.name === ARCHIVE_SHELF)) walk(p); continue; }
      if (!/\.(md|json)$/i.test(e.name)) continue;
      let text = readFileSync(p, "utf8");
      // a gate.json's block/pass examples are test data, wrong names on purpose (the naming rule's own cases)
      if (e.name === "gate.json") {
        try { const j = JSON.parse(text) as Record<string, unknown>; delete j.block; delete j.pass; text = JSON.stringify(j); } catch { /* read as text */ }
      }
      // `replaces:` names the part this one took over — an old name on purpose
      text = text.replace(/^replaces:.*$/gm, "");
      for (const m of text.matchAll(NAME)) {
        if (!live.has(m[0])) out.push(`${relative(storeDir, p).replace(/\\/g, "/")}: ${m[0]}`);
      }
    }
  };
  if (existsSync(storeDir)) walk(storeDir);
  return [...new Set(out)];
}

/** The skill list of a folder harness: `03_SKILLS/INDEX.md`, or the list FILE a first-generation folder repo still has
 *  (`04_SKILLS.md` · `03_SKILLS.md`) until sync moves it — reading only the new place reported those repos as missing it. */
export function skillsIndexOf(agentDir: string): string {
  const now = join(shelfDir(agentDir, SHELF.skills), "INDEX.md");
  if (existsSync(now)) return now;
  return ["04_SKILLS.md", "03_SKILLS.md"].map((n) => join(agentDir, n)).find((f) => existsSync(f)) ?? now;
}

/** The last segment of a part folder (`_Slot/Root_001_Entry` → `Root_001_Entry`). */
export function leafOf(folder: string): string {
  return folder.split("/").pop() ?? folder;
}

/**
 * Every part on one shelf under `root` (the store, or a repo's harness folder). On the structure shelf these are the SLOTS:
 * the inner layer, plus any slot still flat on the shelf (a repo not yet moved — `renameLegacyShelves` moves it). The outer
 * structures are read by `listStructures`.
 */
export function listParts(root: string, shelf: Shelf): Part[] {
  const dir = shelfDir(root, shelf);
  if (!existsSync(dir)) return [];
  const out: Part[] = [];
  const read = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      // the outer structures are read by listStructures: with every header file named after its folder, only the folder
      // name tells a structure from a slot
      if (shelf === SHELF.structure && (INNER_LAYERS.includes(e.name) || isStructureFolder(e.name))) continue;
      const p = readPart(join(d, e.name), shelf);
      if (p) out.push(p);
    }
  };
  read(dir);
  if (shelf === SHELF.structure) for (const l of [SLOT_LAYER, LEGACY_SLOT_LAYER]) if (existsSync(join(dir, l))) read(join(dir, l));
  return out.sort(byId);
}

/** The outer structures on the structure shelf (`Struc_Repo_App/` …): parts whose header file is STRUCTURE.md. */
export function listStructures(root: string): Part[] {
  const dir = shelfDir(root, SHELF.structure);
  if (!existsSync(dir)) return [];
  const out: Part[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || !isStructureFolder(e.name)) continue;
    const p = readPart(join(dir, e.name), SHELF.structure, STRUCTURE_MAIN);
    if (p) out.push(p);
  }
  return out.sort((a, b) => a.folder.localeCompare(b.folder));
}

/** Every part on a shelf, the outer structures included — what identity checks and copy lookups walk. */
export function listAllParts(root: string, shelf: Shelf): Part[] {
  return shelf === SHELF.structure ? [...listParts(root, shelf), ...listStructures(root), ...listHostParts(root)] : listParts(root, shelf);
}

/** The hosts in the structure shelf's inner layer `_Host/` (`GUI` · `IDE` · `CLI`). */
export function listHostParts(root: string): Part[] {
  const dir = join(shelfDir(root, SHELF.structure), HOST_LAYER);
  if (!existsSync(dir)) return [];
  const out: Part[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = readPart(join(dir, e.name), SHELF.structure, HOST_MAIN);
    if (p) out.push(p);
  }
  return out.sort((a, b) => a.folder.localeCompare(b.folder));
}

/**
 * The slot names a structure is made of (empty when its structure.json is missing or unreadable). A structure may
 * `extends` another one: the base's slots come first, then its own, each name once — a department repo is a non-app repo
 * plus the department's slots, and the base list is never copied (plan/28 §0q). The base is found beside the structure (the
 * store) or, in a repo where only the assembled structure sits, on the store's shelf.
 */
export function structureSlotNames(structure: Part, seen: Set<string> = new Set()): string[] {
  let j: { slots?: unknown; extends?: unknown };
  try {
    j = JSON.parse(readFileSync(join(structure.dir, "structure.json"), "utf8")) as typeof j;
  } catch {
    return [];
  }
  const own = Array.isArray(j.slots) ? j.slots.filter((s): s is string => typeof s === "string") : [];
  const baseName = typeof j.extends === "string" ? j.extends : "";
  if (!baseName || seen.has(structure.folder)) return own;
  seen.add(structure.folder);
  const where = [dirname(structure.dir), shelfDir(STORE_DIR, SHELF.structure)];
  const baseDir = where.map((d) => join(d, baseName)).find((d) => existsSync(join(d, "structure.json")));
  const base = baseDir ? readPart(baseDir, SHELF.structure, STRUCTURE_MAIN) : null;
  const inherited = base ? structureSlotNames(base, seen) : [];
  return [...new Set([...inherited, ...own])];
}

/** The slots a structure is made of, found by KEY (a renamed slot still resolves), and the names that resolve to none. */
export function structureSlots(structure: Part, slots: Part[]): { slots: Part[]; missing: string[] } {
  const byKey = new Map(slots.map((s) => [s.key, s]));
  const out: Part[] = [];
  const missing: string[] = [];
  for (const name of structureSlotNames(structure)) {
    const s = byKey.get(partKey("", name));
    if (s) out.push(s);
    else missing.push(name);
  }
  return { slots: out, missing };
}

/** Skills of a repo live where the host loads them, not on a numbered shelf. */
export function listRepoSkills(skillsRoot: string): Part[] {
  if (!existsSync(skillsRoot)) return [];
  const out: Part[] = [];
  for (const e of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = readPart(join(skillsRoot, e.name), SHELF.skills);
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
  /** A set name, read in shelf order: `<NN>_<01 rules>_<03 structure>_<04 skills>_<tier>` (plan/28 §0o). */
  name: string;
  /** Names repos were marked with before (`06_IDE_App_Memory` · `05_app`): such a marker still finds its set. */
  legacy: string[];
  status: "built" | "reserved" | "retired";
  /** The one host the set carries (`GUI` · `IDE` · `CLI`): fixed per set, in its name. */
  host: string;
  /** The ONE outer structure the kit is assembled on (`Struc_Repo_App`); its structure.json names the slots. */
  structure: string;
  tier: "Basic" | "Memory";
  requires: string[];
  constitution: string[];
  rules: string[];
  skills: string[];
  tools: string[];
}

/** The cluster of a kit's structure (`Struc_Repo_App` → `App`): what a rule's `applies` is matched against. */
export function kitCluster(kit: Pick<Kit, "structure">): string {
  return parsePartName(kit.structure)?.name ?? kit.structure;
}

/**
 * The sets, read from the template folder itself (plan/28 §0p): a set IS its assembled folder beside the store
 * (`docs_template/<NN>_Rule_…/`), named in shelf order. There is no register: what the set carries is what its folder
 * carries — the rules, articles and skills on its harness shelves and its one outer structure.
 */
export function readKits(storeDir = STORE_DIR): Kit[] {
  const base = dirname(storeDir);
  if (!existsSync(base)) return [];
  const out: Kit[] = [];
  for (const e of readdirSync(base, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const n = parseSetName(e.name);
    if (!n) continue;
    const agent = join(base, e.name, "docs", "agent");
    out.push({
      no: n.nn,
      name: e.name,
      legacy: Object.entries(LEGACY_SETS).filter(([, v]) => v === e.name).map(([k]) => k),
      status: "built",
      host: n.host,
      structure: listStructures(agent)[0]?.folder ?? "",
      tier: n.tier as Kit["tier"],
      requires: [],
      constitution: listParts(agent, SHELF.constitution).map((p) => p.id),
      rules: listParts(agent, SHELF.rules).map((p) => p.id),
      skills: listParts(agent, SHELF.skills).map((p) => p.folder),
      tools: [],
    });
  }
  return out.sort((a, b) => a.no.localeCompare(b.no));
}

/** The folder of a set: beside the store, under the set's name. */
export function setDir(name: string, storeDir = STORE_DIR): string {
  return join(dirname(storeDir), name);
}

/** The outer structure a kit is assembled on, or null when the store has none of that name. */
export function kitStructure(kit: Pick<Kit, "structure">, storeDir = STORE_DIR): Part | null {
  return listStructures(storeDir).find((s) => s.folder === kit.structure) ?? null;
}

/**
 * Write the starter files of the assembled slots into a new repo (plan/28 §0o: nothing is copied from outside the parts).
 * Each slot's `seed/<repo path>` lands at that path when nothing is there yet; never overwritten — from then on the file is
 * the repo's. Placeholders are filled from what was assembled: the project, the tool's address, the structure
 * (`<STRUC_*>` from its STRUCTURE.md header, `<STRUC_KITS>` from the kits built on it) and the skills (`<SKILL_TRIGGERS>`,
 * one row per skill whose gate.json carries a `trigger`).
 */
export function seedFiles(kit: Kit, parts: Part[], repoRoot: string, projectName: string, storeDir = STORE_DIR, agentDir?: string): string[] {
  const source = readSource(storeDir);
  const struc = parts.find((p) => p.shelf === SHELF.structure && isStructureFolder(p.folder));
  const m = (k: string): string => String(struc?.meta[k] ?? "");
  // the command that assembles this structure where zemory is installed: the Memory set of the same structure — the set
  // being assembled counts too (its own folder has no parts yet the first time, so the scan cannot see it)
  const kits = [...readKits(storeDir).filter((k) => k.name !== kit.name), kit]
    .filter((k) => k.status === "built" && k.structure === kit.structure && k.tier === "Memory")
    .sort((a, b) => a.no.localeCompare(b.no))
    .map((k) => `\`zemory init --kit ${k.no}\``)
    .join(" hoặc ");
  const triggers = parts
    .filter((p) => p.shelf === SHELF.skills)
    .map((p) => [gateOf(p.dir)?.trigger, hostSkillOf(p)] as const)
    .filter(([t]) => typeof t === "string" && t)
    .map(([t, host]) => `| ${t} | \`.claude/skills/${host}/SKILL.md\` |`)
    .join("\n");
  const fill = (text: string): string =>
    text
      .replace(/<PROJECT>/g, projectName)
      .replace(/<ZEMORY_RAW>/g, source.raw)
      .replace(/<ZEMORY_REPO>/g, source.repo)
      .replace(/<STRUC_LABEL>/g, m("label"))
      .replace(/<STRUC_INTRO>/g, m("intro") ? (/^[:;,]/.test(m("intro")) ? m("intro") : ` ${m("intro")}`) : "")
      .replace(/<STRUC_ASK>/g, m("ask"))
      .replace(/<STRUC_INDEX_ROLE>/g, m("index-role"))
      .replace(/<STRUC_TRIGGER>/g, m("trigger"))
      .replace(/<STRUC_KITS>/g, kits)
      .replace(/<SKILL_TRIGGERS>\r?\n?/g, triggers ? triggers + "\n" : "");
  const added: string[] = [];
  for (const slot of parts.filter((p) => p.shelf === SHELF.structure && !isStructureFolder(p.folder))) {
    const src = join(slot.dir, SEED_DIR);
    if (!existsSync(src)) continue;
    for (const rel of seedList(src)) {
      const dst = join(repoRoot, rel);
      if (existsSync(dst)) continue;
      mkdirSync(dirname(dst), { recursive: true });
      const eol = "\n";
      writeFileSync(dst, fill(readFileSync(join(src, rel), "utf8").replace(/\r\n/g, eol)));
      added.push(rel);
    }
  }
  // The files a store shelf carries beside its parts (02_CONSTITUTION/PURPOSE.md: the frame of every constitution, plan/28
  // §0o) land on the same shelf of the repo harness, once.
  if (agentDir) {
    for (const shelf of SHELVES) {
      const dir = join(storeDir, shelf);
      if (!existsSync(dir)) continue;
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isFile() || !e.name.endsWith(".md")) continue;
        const dst = join(agentDir, shelf, e.name);
        if (existsSync(dst)) continue;
        mkdirSync(dirname(dst), { recursive: true });
        writeFileSync(dst, fill(readFileSync(join(dir, e.name), "utf8").replace(/\r\n/g, "\n")));
        added.push(relative(repoRoot, dst).replace(/\\/g, "/"));
      }
    }
  }
  return added.sort();
}

/** Every file under a seed folder, relative and slash-separated. */
export function seedList(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(d, e.name));
      else out.push(relative(dir, join(d, e.name)).replace(/\\/g, "/"));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out.sort();
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

/**
 * A set by number (`04`), name (`03_IDE_NonApp_Memory`) or a name repos were marked with before
 * (`08_IDE_NonApp_Memory` · `03_nonapp`). An old name is looked up by name only: its number belonged to the old register and
 * means another set now.
 */
export function findKit(ref: string, storeDir = STORE_DIR): Kit | null {
  const kits = readKits(storeDir);
  return kits.find((k) => k.name === ref || k.no === ref || k.legacy.includes(ref)) ?? null;
}

/** `02-*` · `02-25` · a skill name — `*` is the only wildcard. */
function pick(parts: Part[], patterns: string[], by: (p: Part) => string): Part[] {
  const res = patterns.map((s) => new RegExp("^" + s.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"));
  return parts.filter((p) => res.some((r) => r.test(by(p))));
}

/**
 * The store parts a kit assembles, shelf by shelf: its constitution articles and rules (a rule's `applies` names the
 * clusters it is for; empty = every cluster), its ONE outer structure and the slots that structure lists, its skills.
 */
export function kitParts(kit: Kit, storeDir = STORE_DIR): Part[] {
  const cluster = kitCluster(kit);
  const fits = (p: Part): boolean => p.applies.length === 0 || p.applies.includes(cluster);
  const struc = kitStructure(kit, storeDir);
  const slots = struc ? structureSlots(struc, listParts(storeDir, SHELF.structure)).slots : [];
  return [
    ...pick(listParts(storeDir, SHELF.constitution), kit.constitution, (p) => p.id).filter(fits),
    ...pick(listParts(storeDir, SHELF.rules), kit.rules, (p) => p.id).filter(fits),
    ...(struc ? [struc] : []),
    ...slots,
    ...listHostParts(storeDir).filter((h) => kit.host && h.folder === `${HOST_LAYER}/${kit.host}`),
    ...pick(listParts(storeDir, SHELF.skills), kit.skills, (p) => p.folder).filter(fits),
  ];
}

// ── assembly ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface AssemblyTarget {
  /** The repo harness folder (`docs/agent`). */
  agentDir: string;
  /** Where the host loads skills (`.claude/skills`). */
  skillsDir: string;
}

/** Where a part's repo copy lives. Every shelf, skills included, under the harness folder: a skill's SOURCE is
 *  `docs/agent/04_SKILLS/<Skill_…>/`; the host loads the build `plugSkills` writes from it (plan/28 §0o). */
export function targetDir(t: AssemblyTarget, p: Pick<Part, "shelf" | "folder">): string {
  return join(t.agentDir, p.shelf, p.folder);
}

/**
 * The repo copy of a part, found by KEY (plan/28 §0o) — at its own folder name, or at an older name (the part moved from
 * Core to Keys, was renamed, or sits on a legacy shelf). Null when the repo has no copy.
 */
export function findCopy(t: AssemblyTarget, part: Part): string | null {
  const exact = targetDir(t, part);
  if (hasMain(exact, mainOf(part))) return exact;
  // On the constitution shelf only an assembled copy (it has a from: line) answers to a frame's key: a repo's own article
  // from an older layout may carry the same number (Cons_10) and is never the frame's copy (plan/28 §0q).
  const byKey = listAllParts(t.agentDir, part.shelf).find((p) => p.key === part.key && (part.shelf !== SHELF.constitution || Boolean(p.from)))?.dir;
  if (byKey) return byKey;
  // A part that took over another one under a new key (`replaces:` — a skill moved to another group): the assembled copy
  // of the old part is this part's copy. Only an assembled copy (from:) answers; a repo's own part never does.
  const old = replacesOf(part);
  const taken = old.length ? listAllParts(t.agentDir, part.shelf).find((p) => old.includes(p.key) && Boolean(p.from))?.dir : undefined;
  if (taken) return taken;
  if (part.shelf !== SHELF.skills) return null;
  // A skill assembled before the two-layer skills sat in the host folder under its old name (aka). An assembled copy (it
  // has a from: line) moves to the source shelf and is judged there — the repo's edits merge as usual; the host build is
  // written fresh from the source afterwards. A host folder without from: is the repo's own skill and is left alone.
  for (const name of [String(part.meta.aka ?? ""), hostSkillOf(part)].filter(Boolean)) {
    const legacy = join(t.skillsDir, name, MAIN_FILE[SHELF.skills]);
    if (existsSync(legacy) && frontMatter(readFileSync(legacy, "utf8"))?.meta.from) return join(t.skillsDir, name);
  }
  return null;
}

/** The keys of the parts this part took over (`replaces: [Skill_Dev_Pbi]`), as keys. */
export function replacesOf(p: Pick<Part, "meta">): string[] {
  const v = p.meta.replaces;
  return (Array.isArray(v) ? v : typeof v === "string" && v ? [v] : []).map((s) => partKey(String(s), String(s))).filter(Boolean);
}

/** A skill's host name — the `name:` of its SKILL.md (Agent Skills: equal to the host folder). */
export function hostSkillOf(part: Part): string {
  return String(part.meta.name ?? "") || part.folder;
}

export interface PlugResult {
  /** host folders written from the source */
  plugged: string[];
  /** host folders left alone: a skill of the repo's own already has that name */
  skipped: string[];
  /** host folders the tool built under a skill's old name (aka), removed */
  removed: string[];
}

/** Files a part declares under `installs:` (repo paths, e.g. `scripts/pbi_gate.py`): they live in the part and are
 *  assembled into the repo where the repo runs them (plan/28 §0q — a tool lives in the part that owns it). */
export function installsOf(p: Part): string[] {
  const v = p.meta.installs;
  return (Array.isArray(v) ? v : typeof v === "string" && v ? [v] : []).map(String).filter(Boolean);
}

/** Before assembly: the repo copy of every installed file as it was (the base of the three-way decision). */
export function installBases(t: AssemblyTarget, parts: Part[]): Map<string, string | null> {
  const out = new Map<string, string | null>();
  for (const p of parts) {
    for (const rel of installsOf(p)) {
      const f = join(targetDir(t, p), rel);
      out.set(`${p.key}:${rel}`, existsSync(f) ? readFileSync(f, "utf8") : null);
    }
  }
  return out;
}

export interface InstallResult { written: string[]; kept: string[] }

/** After assembly: write each installed file to its repo path. A repo file equal to the part's previous copy (or absent)
 *  takes the new one; a repo file edited here, or one the repo had before the part shipped it, is kept and reported —
 *  never overwritten silently (a mirror once destroyed a department's uncommitted work). */
export function installParts(t: AssemblyTarget, root: string, parts: Part[], bases: Map<string, string | null>, apply: boolean): InstallResult {
  const res: InstallResult = { written: [], kept: [] };
  for (const p of parts) {
    for (const rel of installsOf(p)) {
      const src = join(targetDir(t, p), rel);
      if (!existsSync(src)) continue;
      const next = readFileSync(src, "utf8");
      const dst = join(root, rel);
      const cur = existsSync(dst) ? readFileSync(dst, "utf8") : null;
      if (cur === next) continue;
      const base = bases.get(`${p.key}:${rel}`) ?? null;
      if (cur !== null && cur !== base) { res.kept.push(rel); continue; }
      if (apply) { mkdirSync(dirname(dst), { recursive: true }); writeFileSync(dst, next); }
      res.written.push(rel);
    }
  }
  return res;
}

/**
 * The host plug (plan/28 §0o): for every assembled skill, build `<source>/Claude/<host-name>/` from the source (every file
 * but gate.json — gates are the tool's, the host loads SKILL.md, scripts/, references/, assets/) and copy that build into
 * the host's own skill folder (`.claude/skills/<host-name>/`). Both are the tool's output: rewritten whole each time. A
 * host folder that is not ours (no SKILL.md with a from: line) is never replaced.
 */
export function plugSkills(t: AssemblyTarget, skills: Part[]): PlugResult {
  const res: PlugResult = { plugged: [], skipped: [], removed: [] };
  for (const part of skills) {
    const src = targetDir(t, part);
    if (!hasMain(src, MAIN_FILE[SHELF.skills])) continue;
    const host = hostSkillOf(part);
    // the host build is named the host's way: the source's own-named header file becomes SKILL.md (Agent Skills)
    const srcMain = basename(mainPath(src, MAIN_FILE[SHELF.skills]));
    const installed = installsOf(part);
    const files = partFiles(src).filter((f) => f !== "gate.json" && !installed.includes(f) && !(f === MAIN_FILE[SHELF.skills] && srcMain !== f));
    const buildName = (f: string): string => (f === srcMain ? MAIN_FILE[SHELF.skills] : f);
    const build = join(src, "Claude", host);
    rmSync(join(src, "Claude"), { recursive: true, force: true });
    for (const f of files) {
      mkdirSync(dirname(join(build, buildName(f))), { recursive: true });
      writeFileSync(join(build, buildName(f)), readFileSync(join(src, f)));
    }
    const dest = join(t.skillsDir, host);
    const destMain = join(dest, MAIN_FILE[SHELF.skills]);
    if (existsSync(dest) && !(existsSync(destMain) && frontMatter(readFileSync(destMain, "utf8"))?.meta.from)) {
      res.skipped.push(host);
      continue;
    }
    rmSync(dest, { recursive: true, force: true });
    for (const f of files.map(buildName)) {
      mkdirSync(dirname(join(dest, f)), { recursive: true });
      writeFileSync(join(dest, f), readFileSync(join(build, f)));
    }
    res.plugged.push(host);
    // the build this skill left under its old host name (aka) is the tool's own output: gone, or the host loads two copies.
    // A folder without a from: line is the repo's own skill and stays.
    const aka = String(part.meta.aka ?? "");
    const stale = aka && aka !== host ? join(t.skillsDir, aka) : "";
    const staleMain = stale ? join(stale, MAIN_FILE[SHELF.skills]) : "";
    if (staleMain && existsSync(staleMain) && frontMatter(readFileSync(staleMain, "utf8"))?.meta.from) {
      rmSync(stale, { recursive: true, force: true });
      res.removed.push(aka);
    }
  }
  return res;
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
      const main = mainOf(part);
      const text = readFileSync(mainPath(at, main), "utf8");
      const old = parseFrom(String(frontMatter(text)?.meta.from ?? ""));
      write = new Map([[main, stampFrom(text, fromLine(part, old?.hash ?? partHash(part.dir, part.shelf, main)))]]);
    }
    return { ...step, target, renameFrom: at, write, reason: step.reason ?? `renamed from ${at}` };
  });
}

function planOne(part: Part, t: AssemblyTarget, target = targetDir(t, part)): AssemblyStep {
  const main = mainOf(part);
  const theirs = readPartFiles(part.dir, main);
  const theirsHash = hashFiles(theirs, main);
  const stamped = (files: Map<string, string>, hash: string): Map<string, string> => {
    const out = new Map(files);
    out.set(main, stampFrom(files.get(main) ?? "", fromLine(part, hash)));
    return out;
  };
  if (!hasMain(target, main)) {
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
  // A copy whose header file still has an older name: the content stays as it is, only the name moves (see mainOf).
  const renameOnly = (): AssemblyStep => ({ part, target, verdict: "clean", write: new Map([[main, mine.get(main) ?? ""]]), remove: [], reason: "header file renamed to the folder's name" });
  const oldName = !existsSync(join(target, ownMainName(target)));
  if (mineHash === theirsHash) {
    // Same content; only refresh the stamp when it names an older version/hash.
    if (from.hash === theirsHash && from.version === part.version) return oldName ? renameOnly() : { part, target, verdict: "current" };
    return { part, target, verdict: "clean", write: stamped(theirs, theirsHash), remove: [] };
  }
  if (mineHash === from.hash) {
    const remove = [...mine.keys()].filter((f) => !theirs.has(f));
    return { part, target, verdict: "clean", write: stamped(theirs, theirsHash), remove };
  }
  // Edited here, but the part has not changed since it was assembled (or last merged): nothing to bring, the edit stays.
  if (from.hash === theirsHash) return oldName ? renameOnly() : { part, target, verdict: "current", reason: "edited here; the store part has not changed since" };
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
    // The header file is keyed by its key name and written under the folder's own name; whatever header file the copy
    // had under another name (the key name of an older copy, the old folder name after a rename) goes.
    const key = mainOf(s.part);
    const own = ownMainName(s.target);
    const disk = (f: string): string => (f === key ? own : f);
    for (const f of s.remove ?? []) rmSync(join(s.target, disk(f)), { force: true });
    for (const [f, text] of s.write) {
      const p = join(s.target, disk(f));
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, text);
    }
    if (s.write.has(key)) {
      for (const stale of [key, s.renameFrom ? ownMainName(s.renameFrom) : ""]) {
        if (stale && stale !== own) rmSync(join(s.target, stale), { force: true });
      }
    }
    // A constitution frame brings its Cons.md template once; from then on the file is the repo's (plan/28 §0q).
    const tpl = join(s.part.dir, CONS_REPO_FILE);
    if (s.part.shelf === SHELF.constitution && existsSync(tpl) && !existsSync(join(s.target, CONS_REPO_FILE))) {
      writeFileSync(join(s.target, CONS_REPO_FILE), readFileSync(tpl, "utf8").replace(/\r\n/g, "\n"));
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
function filesAt(pg: { git: (args: string[]) => string; prefix: string }, sha: string, main?: string): Map<string, string> {
  const files = new Map<string, string>();
  const own = `${pg.prefix.replace(/\/$/, "").split("/").pop() ?? ""}.md`;
  const names = pg.git(["ls-tree", "-r", "--full-name", "--name-only", sha, "--", "."]).split(/\r?\n/).filter(Boolean);
  const rels = names.map((f) => f.slice(pg.prefix.length));
  names.forEach((f, i) => {
    const rel = rels[i];
    if (rel.includes("/") && NOT_CONTENT.includes(rel.split("/")[0])) return; // host builds · seed: not content
    if (rel === CONS_REPO_FILE) return; // the repo writes it — not part content (same rule as partFiles)
    // the header file under the key name, whichever name it had at that commit (see mainOf)
    if (main && rel === main && main !== own && rels.includes(own)) return;
    files.set(main && rel === own ? main : rel, pg.git(["show", `${sha}:${f}`]));
  });
  return files;
}

/** The part's files at the version whose hash is `hash`, from the history of the git repo that holds the store (zemory's
 *  own in production). Null when not found. */
export function baseFiles(part: Part, hash: string): Map<string, string> | null {
  const key = `${part.dir}#${hash}`;
  if (baseCache.has(key)) return baseCache.get(key) ?? null;
  const main = mainOf(part);
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
        const files = filesAt(pg, sha, main);
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
  // The shelf folder: a slot in the inner layer sits one level deeper; its history may still be flat on the shelf.
  let shelfAt = dirname(part.dir);
  if (INNER_LAYERS.includes(shelfAt.replace(/\\/g, "/").split("/").pop() ?? "")) shelfAt = dirname(shelfAt);
  const pg = partGit(shelfAt);
  if (!pg) return null;
  const main = mainOf(part);
  // The shelf as named below the harness/store folder: one segment, or two for the law shelf's layers (`01_LAW/_Rule`).
  const segs = shelfAt.replace(/\\/g, "/").split("/");
  const shelfName = segs[segs.length - 1].startsWith("_") ? segs.slice(-2).join("/") : segs[segs.length - 1];
  const up = "../".repeat(shelfName.split("/").length);
  const cur = currentShelf(shelfName);
  // every other name the same shelf has had (legacy shelves of it, or the current one when this is a legacy folder)
  const others = [cur ?? "", ...Object.entries(LEGACY_SHELF).filter(([, c]) => c === cur).map(([o]) => o)].filter((n) => n && n !== shelfName);
  const paths = [".", ...others.map((n) => `${up}${n}`)];
  try {
    const shas = pg.git(["log", "--format=%H", "--", ...paths]).split(/\r?\n/).filter(Boolean);
    for (const sha of shas) {
      const names = pg.git(["ls-tree", "-r", "--full-name", "--name-only", sha, "--", ...paths]).split(/\r?\n/).filter(Boolean);
      // A part folder = a folder holding the header file, at any depth of the shelf; its content leaves out the folders
      // that are not content (host builds · seed).
      // The header file under either name: the key name, or the folder's own name (see mainOf).
      const folders = new Map<string, { head: string; files: string[] }>();
      for (const f of names) {
        const segs = f.split("/");
        const file = segs.pop() ?? "";
        const leaf = segs[segs.length - 1] ?? "";
        if (file !== main && file !== `${leaf}.md`) continue;
        const prefix = f.slice(0, f.length - file.length);
        if (folders.has(prefix) && file === main) continue; // the own-named file wins over a stale key-named one
        folders.set(prefix, {
          head: f,
          files: names.filter((n) => n.startsWith(prefix) && !NOT_CONTENT.includes(n.slice(prefix.length).split("/")[0])),
        });
      }
      for (const [prefix, { head: headPath, files }] of folders) {
        const head = pg.git(["show", `${sha}:${headPath}`]);
        const folder = prefix.split("/").slice(-2, -1)[0] ?? "";
        const id = String(frontMatter(head)?.meta.id ?? "");
        const k = partKey(id, folder);
        if (k !== part.key && !replacesOf(part).includes(k)) continue; // its own key, or a part it took over
        const map = new Map<string, string>();
        for (const f of files) {
          if (f !== headPath && (f === prefix + main || f === `${prefix}${folder}.md`)) continue;
          map.set(f === headPath ? main : f.slice(prefix.length), f === headPath ? head : pg.git(["show", `${sha}:${f}`]));
        }
        if (matches(map)) return map;
      }
    }
  } catch {
    return null;
  }
  return null;
}

// ── checks ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The store's archive shelf: retired parts, kept citable. */
export const ARCHIVE_SHELF = "Archive";


/**
 * A store shelf that is missing or empty (plan/28 §0p A1): every repo pulls the store to pick parts from, so every shelf
 * is always there under its own name, a numbered shelf with at least one part. Shelf 05 holds one host per kind of
 * environment, each named by the dictionary with its header file. Tools/ joins the list when it is built.
 */
export function storeShelfFindings(storeDir = STORE_DIR): string[] {
  const out: string[] = [];
  for (const shelf of SHELVES) {
    if (!existsSync(join(storeDir, shelf))) out.push(`${shelf}: shelf missing`);
    else if (listParts(storeDir, shelf).length === 0) out.push(`${shelf}: shelf has no part`);
  }
  // the hosts: the structure shelf's second inner layer, one folder per kind, each with its header file
  const hostDir = join(storeDir, SHELF.structure, HOST_LAYER);
  const hostFolders = existsSync(hostDir) ? readdirSync(hostDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
  if (!hostFolders.length) out.push(`${SHELF.structure}/${HOST_LAYER}: no host`);
  for (const h of hostFolders) {
    if (!(HOST_KIND as readonly string[]).includes(h)) out.push(`${SHELF.structure}/${HOST_LAYER}/${h}: not a host kind (${HOST_KIND.join("|")})`);
    else if (!existsSync(join(hostDir, h, `${h}.md`))) out.push(`${SHELF.structure}/${HOST_LAYER}/${h}: no ${h}.md`);
  }
  if (!existsSync(join(storeDir, ARCHIVE_SHELF))) out.push(`${ARCHIVE_SHELF}: shelf missing`);
  return out;
}

/** A store part whose content changed without a version bump — its copies could not tell old from new. Needs history. */
export function unbumpedParts(storeDir = STORE_DIR): string[] {
  const out: string[] = [];
  for (const shelf of SHELVES) {
    for (const p of listAllParts(storeDir, shelf)) {
      const main = mainOf(p);
      const pg = partGit(p.dir);
      if (!pg) continue;
      let head: Map<string, string>;
      try {
        head = filesAt(pg, "HEAD", main);
      } catch {
        continue; // no commit yet — nothing to compare with
      }
      if (!head.has(main)) continue; // the part is new since HEAD
      const headVersion = Number((frontMatter(head.get(main) ?? "")?.meta.version as string) || 1);
      if (hashFiles(head, main) !== hashFiles(readPartFiles(p.dir, main), main) && headVersion >= p.version) {
        out.push(`${shelf}/${p.folder}: content changed since HEAD but version is still v${p.version}`);
      }
    }
  }
  return out;
}

const SHELF_CODE: Record<string, string[]> = {
  [SHELF.constitution]: ["Cons"],
  [SHELF.rules]: ["Rule"],
  [SHELF.structure]: ["Slot", "Struc", "Host"],
  [SHELF.skills]: ["Skill"],
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
      for (const p of listAllParts(base, shelf)) {
        const where = `${base === storeDir ? "" : "Archive/"}${shelf}/${p.folder}`;
        const prev = owner.get(p.key);
        if (prev) wrong.push(`${where}: key ${p.key} is already taken by ${prev}`);
        else owner.set(p.key, where);
      }
    }
  }
  for (const shelf of SHELVES) {
    for (const p of listAllParts(storeDir, shelf)) {
      const n = parsePartName(leafOf(p.folder));
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
        let gate: Record<string, unknown> | null;
        try { gate = JSON.parse(readFileSync(join(p.dir, "gate.json"), "utf8")) as Record<string, unknown>; } catch { gate = null; }
        const real = enforcementOf(gate);
        if (real !== n.group) wrong.push(`${where}: named ${n.group} but its gate.json makes it ${real}`);
      }
      if (n.code === "Slot") {
        if (!p.folder.startsWith(SLOT_LAYER + "/")) wrong.push(`${where}: a slot lives in ${shelf}/${SLOT_LAYER}/, never on the shelf itself`);
        if (p.applies.length) wrong.push(`${where}: a slot belongs to no structure — drop applies: (a structure lists its slots in structure.json)`);
        const paths = String(p.meta.path ?? "").split(/\s*[·|]\s*/).map((x) => x.trim()).filter(Boolean);
        for (const rel of seedList(join(p.dir, SEED_DIR))) {
          const ok = paths.some((x) => x === "." || rel === x || rel.startsWith(x.endsWith("/") ? x : x + "/"));
          if (!ok) wrong.push(`${where}: seed/${rel} is not under the slot's path (${paths.join(" · ")})`);
        }
        const area = slotArea(String(p.meta.path ?? ""));
        if (area !== n.group) wrong.push(`${where}: area ${n.group} but path ${String(p.meta.path ?? "")} is in ${area}`);
      }
    }
  }
  for (const s of listStructures(storeDir)) {
    const r = structureSlots(s, listParts(storeDir, SHELF.structure));
    for (const m of r.missing) wrong.push(`${SHELF.structure}/${s.folder}: structure.json names ${m}, which is no slot in ${SLOT_LAYER}/`);
    if (!structureSlotNames(s).length) wrong.push(`${SHELF.structure}/${s.folder}: structure.json lists no slot`);
  }
  return { wrong, legacy };
}

export interface RetiredCopy {
  /** shelf-relative folder of the repo copy */
  folder: string;
  shelf: Shelf;
  /** where it was moved (repo-relative), or null when it was left because the repo edited it */
  movedTo: string | null;
}

/**
 * Repo copies of parts the store has retired (plan/28 §0q): an assembled copy (`from:`) whose key now sits in the store's
 * Archive and in none of the kit's parts. Left in place it would keep its hook and its core text beside the rule that took
 * it in — the same check twice. Untouched since assembly ⇒ moved to `<archive>/retired/<shelf>/` (nothing is deleted);
 * edited here ⇒ left where it is and reported, so the edit is merged into its new home by hand.
 */
export function retireCopies(t: AssemblyTarget, kitKeys: Set<string>, archiveDir: string, apply: boolean, storeDir = STORE_DIR): RetiredCopy[] {
  const out: RetiredCopy[] = [];
  for (const shelf of [SHELF.rules, SHELF.constitution] as const) {
    const retired = new Set(listParts(join(storeDir, ARCHIVE_SHELF), shelf).map((p) => p.key));
    for (const p of listParts(t.agentDir, shelf)) {
      if (!p.from || kitKeys.has(p.key) || !retired.has(p.key)) continue;
      const main = mainOf(p);
      const untouched = hashFiles(readPartFiles(p.dir, main), main) === p.from.hash;
      if (!untouched) { out.push({ folder: p.folder, shelf, movedTo: null }); continue; }
      const dest = join(archiveDir, "retired", shelf, p.folder);
      if (apply && !existsSync(dest)) {
        mkdirSync(dirname(dest), { recursive: true });
        renameSync(p.dir, dest);
      }
      out.push({ folder: p.folder, shelf, movedTo: relative(dirname(t.agentDir), dest).replace(/\\/g, "/") });
    }
  }
  return out;
}

/**
 * A constitution FRAME (plan/28 §0q): an assembled part whose header says `frame: true` — a common rule that makes the repo
 * declare one kind of invariant in its Cons.md. Anything else on the shelf (the repo's own article, or an article an older
 * layout gave the repo to keep) is constitution text in its own right.
 */
export function isFrame(p: Part): boolean {
  return Boolean(p.from) && String(p.meta.frame ?? "") === "true";
}

/**
 * Constitution frames a repo has not written yet (plan/28 §0q). An assembled frame (it has a `from:` line) needs a Cons.md
 * with `status: written` and no template placeholder left (`<…>`), or `status: n/a` with a reason line. A repo's own article
 * (no `from:`) is its own text and is not judged here.
 */
export function consFindings(agentDir: string): string[] {
  const out: string[] = [];
  for (const p of listParts(agentDir, SHELF.constitution)) {
    if (!isFrame(p) || isRetired(p)) continue;
    const file = join(p.dir, CONS_REPO_FILE);
    if (!existsSync(file)) { out.push(`${p.folder}: ${CONS_REPO_FILE} missing`); continue; }
    const text = readFileSync(file, "utf8");
    const status = String(frontMatter(text)?.meta.status ?? "");
    const body = bodyOf(text).trim();
    if (status === "n/a") { if (!body) out.push(`${p.folder}: status n/a without a reason`); continue; }
    if (status !== "written") { out.push(`${p.folder}: status is "${status || "missing"}" — not written yet`); continue; }
    const left = /<[^<>\n`]{1,60}>/.exec(body.replace(/`[^`\n]*`/g, ""));
    if (left) out.push(`${p.folder}: template placeholder ${left[0]} left`);
  }
  return out;
}

/**
 * The repo's constitution as files (plan/28 §0q): the Cons.md of every frame the repo has written (status `written` — an
 * `n/a` frame says nothing about the product), and the header file of each of the repo's own articles (no `from:` line).
 */
export function constitutionFiles(agentDir: string): string[] {
  const out: string[] = [];
  for (const p of listParts(agentDir, SHELF.constitution)) {
    if (isRetired(p)) continue;
    if (!isFrame(p)) { out.push(mainPath(p.dir, mainOf(p))); continue; }
    const f = join(p.dir, CONS_REPO_FILE);
    const text = (existsSync(f) ? readFileSync(f, "utf8") : "");
    if (text && /^status:\s*written\s*$/m.test(text)) out.push(f);
  }
  return out;
}

/**
 * The laws no hook holds (plan/27 · plan/28 §0e, user 2026-10-18: "only the laws without a hook are forced"), as files:
 * the purpose the repo wrote, every written frame (`Cons.md`) and every own article of its constitution that carries no
 * full gate, and every judgment rule. The ONE list behind the read-first door and the text put back after a compaction —
 * a law that gets a hook leaves it by itself.
 */
export function folderCoreFiles(agentDir: string): string[] {
  // any hook takes a law out of the forced list: one that blocks (`hook` · `gate`, carrying the law in its message) or one
  // that reminds by keyword (`prompt`, carrying the law too — promptGates)
  const hooked = (dir: string): boolean => {
    try {
      const g = JSON.parse(readFileSync(join(dir, "gate.json"), "utf8")) as { hook?: unknown; gate?: unknown; prompt?: unknown };
      return Boolean(g.hook || g.gate || g.prompt);
    } catch {
      return false;
    }
  };
  // An older harness still has PURPOSE.md on the constitution shelf; the current one writes it in Cons_Gate_09_Purpose/Cons.md.
  const purpose = join(shelfDir(agentDir, SHELF.constitution), "PURPOSE.md");
  // a frame's gate checks that its Cons.md is written; what the repo wrote there is judgment, so it stays
  const constitution = constitutionFiles(agentDir).filter((f) => basename(f) === CONS_REPO_FILE || !hooked(dirname(f)));
  const rules = listParts(agentDir, SHELF.rules)
    .filter((p) => !isRetired(p) && p.kind === "judgment" && !hooked(p.dir))
    .map((p) => mainPath(p.dir, mainOf(p)));
  return [...(existsSync(purpose) ? [purpose] : []), ...constitution, ...rules];
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

function gateOf(dir: string): { read?: ReadTrigger[]; prompt?: PromptGate; trigger?: string } | null {
  try {
    return JSON.parse(readFileSync(join(dir, "gate.json"), "utf8")) as { read?: ReadTrigger[]; prompt?: PromptGate; trigger?: string };
  } catch {
    return null;
  }
}

/** Read-before-write doors a repo's skills declare (`gate.json › read`): each entry names the SKILL.md to read. */
/**
 * The skills a repo carries, each with the folder its gates live in: an assembled skill keeps gate.json in its SOURCE
 * (`docs/agent/04_SKILLS/<Skill_…>/` — the host build carries no gates, plan/28 §0o); a skill of the repo's own (only in the
 * host folder, no source) keeps it there. `source` is the source folder, null for a repo-own skill.
 */
function repoSkillDirs(skillsDir: string, agentDir?: string): Array<{ host: string; gates: string; source: string | null }> {
  const out: Array<{ host: string; gates: string; source: string | null }> = [];
  const seen = new Set<string>();
  if (agentDir) {
    for (const p of listParts(agentDir, SHELF.skills)) {
      const host = hostSkillOf(p);
      seen.add(host);
      out.push({ host, gates: p.dir, source: p.dir });
    }
  }
  if (existsSync(skillsDir)) {
    for (const e of readdirSync(skillsDir, { withFileTypes: true })) {
      if (e.isDirectory() && !seen.has(e.name)) out.push({ host: e.name, gates: join(skillsDir, e.name), source: null });
    }
  }
  return out;
}

/** Read-before-write doors a repo's skills declare (`gate.json › read`): each names the skill (its host name) and where
 *  its source is, so the latch can accept a reading of any copy of the same skill. */
export function skillReadTriggers(skillsDir: string, agentDir?: string): Array<ReadTrigger & { skill: string; source: string | null }> {
  const out: Array<ReadTrigger & { skill: string; source: string | null }> = [];
  for (const s of repoSkillDirs(skillsDir, agentDir)) for (const t of gateOf(s.gates)?.read ?? []) out.push({ ...t, skill: s.host, source: s.source });
  return out;
}

/** Prompt reminders a repo carries: from its skills and from the rule folders of a folder harness (`gate.json › prompt`). */
export function promptGates(skillsDir: string, agentDir: string): PromptGate[] {
  const ok = (g: PromptGate | undefined): g is PromptGate => Boolean(g && g.re && g.text && g.kind);
  const out = repoSkillDirs(skillsDir, agentDir).map((s) => gateOf(s.gates)?.prompt).filter(ok);
  // A law with a reminder is not in the forced read list (folderCoreFiles, user 2026-10-18), so the reminder carries the
  // law word for word, as a block message does — the agent meets the whole law at the moment it applies.
  for (const shelf of [SHELF.rules, SHELF.constitution] as const) {
    for (const p of listParts(agentDir, shelf)) {
      const g = isRetired(p) ? undefined : gateOf(p.dir)?.prompt;
      if (!ok(g)) continue;
      const body = bodyOf(readFileSync(mainPath(p.dir, mainOf(p)), "utf8")).trim();
      out.push({ ...g, text: body ? `${g.text}\n\nThe rule (${p.folder}):\n${body}` : g.text });
    }
  }
  return out;
}

/** True when a repo's harness is the folder layout (plan/28 §0c): `02_RULES` is a folder, not a file. */
export function isFolderHarness(agentDir: string): boolean {
  try {
    return statSync(shelfDir(agentDir, SHELF.rules)).isDirectory();
  } catch {
    return false;
  }
}
