// plan/28 §0 — assemble a repo's folder harness from the parts store. One entry for both `zemory init --kit <no>` (a new
// repo) and `zemory sync --standard` on a repo whose marker names a kit (HP article 17: no second command).
//
// Order: legacy layout moved → marker (records the kit) → the starter files the assembled slots seed (gap-fill only, never
// overwritten) → parts (plan, then write when `apply`) → the host plug → the skills block of 04_SKILLS/INDEX.md → the guard.
// Reading is the default; nothing is written without `apply`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { CONFIG_FILE, findMarker, harnessPathsAt, readMarker } from "../core/config.js";
import { DEFAULT_CONFIG } from "./adopt.js";
import {
  applyAssembly,
  findKit,
  kitStructure,
  frontMatter,
  kitParts,
  MAIN_FILE,
  hostSkillOf,
  planAssembly,
  plugSkills,
  renameLegacyShelves,
  seedFiles,
  STORE_DIR,
  targetDir,
  type AssemblyStep,
  type AssemblyTarget,
  type Kit,
  type Part,
  type PlugResult,
} from "./store.js";
import { SHELF } from "./harness-names.js";

export interface KitApplyResult {
  kit: Kit;
  createdMarker: boolean;
  /** Starter files the assembled slots seeded into the repo (only where nothing was yet). */
  ownAdded: string[];
  steps: AssemblyStep[];
  written: AssemblyStep[];
  skillsBlock: "written" | "current" | "no-file";
  /** Legacy shelf folders renamed to the current names by this pass (`02_RULES → 01_RULES` …). */
  renamedShelves: string[];
  /** Host builds of the kit's skills written into the host folder; a repo-own skill of the same name is skipped. */
  plug: PlugResult;
}

/** The kit a repo's marker names, or null (a repo still on the file harness). */
export function repoKit(root: string, storeDir = STORE_DIR): Kit | null {
  const kit = (readMarker(root)?.data as { kit?: unknown } | undefined)?.kit;
  return typeof kit === "string" && kit ? findKit(kit, storeDir) : null;
}

/** Assemble (or report what assembling would do). `kitRef` names a kit for a repo that has none yet (init). */
export function applyKit(
  root: string,
  opts: { kitRef?: string; apply: boolean; storeDir?: string },
): KitApplyResult | { error: string } {
  const storeDir = opts.storeDir ?? STORE_DIR;
  const marked = repoKit(root, storeDir);
  const kit = opts.kitRef ? findKit(opts.kitRef, storeDir) : marked;
  if (!kit) return { error: opts.kitRef ? `no kit "${opts.kitRef}" in ${storeDir}/kits.json` : "the marker names no kit" };
  if (kit.status !== "built") return { error: `kit ${kit.name} is ${kit.status} — only a built kit can be assembled` };
  if (marked && opts.kitRef && marked.name !== kit.name) {
    return { error: `this repo is assembled from ${marked.name}; switching kits is not supported by init` };
  }

  const hp = harnessPathsAt(root);
  const target = { agentDir: hp.agent, skillsDir: hp.skills };
  // A repo still on the legacy shelf folders (02_RULES · 01_CONSTITUTION) moves to the current ones FIRST — before the
  // kit's own files (PURPOSE.md) and the parts are written — so no shelf ever ends up split across two folders.
  const renamedShelves = opts.apply ? renameLegacyShelves(target.agentDir) : [];

  let createdMarker = false;
  if (opts.apply) createdMarker = writeKitMarker(root, kit, storeDir);
  // A constitution belongs to its repo: the suggested articles are offered ONCE, when the repo is assembled the first
  // time. After that sync never adds one back (the repo may have declined it) and never edits one (only an approval in
  // the repo's own session changes its constitution).
  const parts = kitParts(kit, storeDir).filter((p) => p.shelf !== SHELF.constitution || !marked);
  const ownAdded = opts.apply ? seedFiles(kit, parts, root, basename(root), storeDir) : [];
  const steps = planAssembly(parts, target);
  const written = opts.apply ? applyAssembly(steps) : [];
  const skills = parts.filter((p) => p.shelf === SHELF.skills);
  // the host plug: every assembled skill's host build, written from its source into the host's own skill folder
  const plug = opts.apply ? plugSkills(target, skills) : { plugged: [], skipped: [] };
  const skillsBlock = opts.apply ? writeSkillsBlock(hp.agent, skills, target) : "current";
  return { kit, createdMarker, ownAdded, steps, written, skillsBlock, renamedShelves, plug };
}

/** Create the marker (or add `kit` to an existing one). True when a new marker file was written. */
export function writeKitMarker(root: string, kit: Kit, storeDir = STORE_DIR): boolean {
  const nonApp = kitStructure(kit, storeDir)?.meta.profile === "non-app";
  const existing = findMarker(root);
  if (existing) {
    try {
      const raw = JSON.parse(readFileSync(existing, "utf8").replace(new RegExp("^" + String.fromCharCode(0xfeff)), "")) as Record<string, unknown>;
      if (raw.kit === kit.name) return false;
      raw.kit = kit.name;
      if (nonApp) raw.profile = "non-app";
      writeFileSync(existing, JSON.stringify(raw, null, 2) + "\n");
    } catch {
      /* an unreadable marker is left alone — sync reports it elsewhere */
    }
    return false;
  }
  const p = join(root, CONFIG_FILE);
  mkdirSync(dirname(p), { recursive: true });
  const cfg = { ...DEFAULT_CONFIG, ...(nonApp ? { profile: "non-app" } : {}), kit: kit.name };
  writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n");
  return true;
}

const SK_START = "<!-- zemory:skills:start";
const SK_END = "<!-- zemory:skills:end -->";

/** The machine-written block of the skills list (`04_SKILLS/INDEX.md`): one row per kit skill — its source in the
 *  harness, the host folder it is plugged into, the `from:` it was assembled from. Rows the repo adds below the block are
 *  its own. A file without the block markers is left alone. */
function writeSkillsBlock(agentDir: string, skills: Part[], t: AssemblyTarget): "written" | "current" | "no-file" {
  const p = join(agentDir, SHELF.skills, "INDEX.md");
  if (!existsSync(p)) return "no-file";
  const text = readFileSync(p, "utf8");
  const a = text.indexOf(SK_START);
  const b = text.indexOf(SK_END);
  if (a < 0 || b < a) return "no-file";
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const head = text.slice(a, text.indexOf("\n", a) + 1).replace(/\r?\n$/, "");
  const rows = skills.map((s) => {
    const copy = join(targetDir(t, s), MAIN_FILE[SHELF.skills]);
    const from = existsSync(copy) ? String(frontMatter(readFileSync(copy, "utf8"))?.meta.from ?? "") : "";
    return `| \`${s.folder}/\` | \`.claude/skills/${hostSkillOf(s)}/\` | ${from || "(not assembled)"} |`;
  });
  const block = [head, "| Skill (source) | Host | from |", "|---|---|---|", ...rows, SK_END].join(eol);
  const next = text.slice(0, a) + block + text.slice(b + SK_END.length);
  if (next === text) return "current";
  writeFileSync(p, next);
  return "written";
}
