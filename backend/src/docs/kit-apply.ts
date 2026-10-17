// plan/28 §0 — assemble a repo's folder harness from the parts store. One entry for both `zemory init --kit <no>` (a new
// repo) and `zemory sync --standard` on a repo whose marker names a kit (HP article 17: no second command).
//
// Order: legacy layout moved → marker (records the kit) → the starter files the assembled slots seed (gap-fill only, never
// overwritten) → parts (plan, then write when `apply`) → the host plug → the skills block of 04_SKILLS/INDEX.md → the guard.
// Reading is the default; nothing is written without `apply`.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { CONFIG_FILE, findMarker, harnessPathsAt, readMarker } from "../core/config.js";
import { DEFAULT_CONFIG } from "./adopt.js";
import {
  applyAssembly,
  bodyOf,
  mainOf,
  readSource,
  findKit,
  kitStructure,
  frontMatter,
  kitParts,
  MAIN_FILE,
  mainPath,
  hostSkillOf,
  planAssembly,
  plugSkills,
  installBases,
  installParts,
  type InstallResult,
  renameLegacyShelves,
  retireCopies,
  seedFiles,
  setDir,
  STORE_DIR,
  targetDir,
  type AssemblyStep,
  type AssemblyTarget,
  type Kit,
  type Part,
  type PlugResult,
  type RetiredCopy,
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
  /** Copies of parts the store retired: moved to the archive when untouched, reported when edited here (plan/28 §0q). */
  retired: RetiredCopy[];
  /** Files parts install where the repo runs them: written, or kept because they were edited here (plan/28 §0q). */
  installed: InstallResult;
}

/** The kit a repo's marker names, or null (a repo still on the file harness). */
export function repoKit(root: string, storeDir = STORE_DIR): Kit | null {
  const kit = (readMarker(root)?.data as { kit?: unknown } | undefined)?.kit;
  return typeof kit === "string" && kit ? findKit(kit, storeDir) : null;
}

/** Assemble (or report what assembling would do). `kitRef` names a kit for a repo that has none yet (init). */
export function applyKit(
  root: string,
  // `kit`: assemble this set as given (building a set folder, `assembleSet`) · `projectName`: what <PROJECT> becomes
  // (the folder name by default; a set folder keeps the placeholder)
  opts: { kitRef?: string; kit?: Kit; projectName?: string; apply: boolean; storeDir?: string },
): KitApplyResult | { error: string } {
  const storeDir = opts.storeDir ?? STORE_DIR;
  const marked = opts.kit ? null : repoKit(root, storeDir);
  const kit = opts.kit ?? (opts.kitRef ? findKit(opts.kitRef, storeDir) : marked);
  if (!kit) return { error: opts.kitRef ? `no set "${opts.kitRef}" beside ${storeDir}` : "the marker names no set" };
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
  // The constitution frames (plan/28 §0q) are common rules like the others: their rule text follows the store, a new frame
  // is added, and the Cons.md a repo wrote — its constitution — is never touched (applyAssembly writes it only when absent).
  const parts = kitParts(kit, storeDir);
  const ownAdded = opts.apply ? seedFiles(kit, parts, root, opts.projectName ?? basename(root), storeDir, target.agentDir) : [];
  const steps = planAssembly(parts, target);
  const bases = installBases(target, parts);
  const written = opts.apply ? applyAssembly(steps) : [];
  // files the parts install where the repo runs them (scripts/...), after the parts themselves are current
  const installed = installParts(target, root, opts.apply ? parts : [], bases, opts.apply);
  const skills = parts.filter((p) => p.shelf === SHELF.skills);
  // the host plug: every assembled skill's host build, written from its source into the host's own skill folder
  const plug = opts.apply ? plugSkills(target, skills) : { plugged: [], skipped: [], removed: [] };
  const skillsBlock = opts.apply ? writeSkillsBlock(hp.agent, skills, target) : "current";
  if (opts.apply) followEntryRenames(root, skills, target);
  const retired = retireCopies(target, new Set(parts.map((p) => p.key)), hp.archive, opts.apply, storeDir);
  return { kit, createdMarker, ownAdded, steps, written, skillsBlock, renamedShelves, plug, retired, installed };
}

/**
 * Build or refresh a set folder beside the store (plan/28 §0p): the set is assembled like a repo, placeholders kept, and
 * from then on the folder IS the set — `readKits` reads what it carries from it. Re-running it brings the folder up to the
 * store the way `sync --standard` does for a repo.
 */
export function assembleSet(kit: Kit, storeDir = STORE_DIR): KitApplyResult | { error: string } {
  const dir = setDir(kit.name, storeDir);
  mkdirSync(dir, { recursive: true });
  const r = applyKit(dir, { kit: { ...kit, status: "built" }, projectName: "<PROJECT>", apply: true, storeDir });
  if (!("error" in r)) writeFileSync(join(dir, BOOTSTRAP_FILE), setBootstrap(kit, storeDir));
  return r;
}

/** The set's own install guide, written beside its parts. */
export const BOOTSTRAP_FILE = "BOOTSTRAP.md";

/** Every file of a set folder a Basic install fetches (relative, slash-separated, sorted) — the bootstrap left out. */
function setFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string, rel: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(join(d, e.name), r);
      else if (r !== BOOTSTRAP_FILE) out.push(r);
    }
  };
  walk(dir, "");
  return out.sort();
}

/**
 * The bootstrap of a set (plan/28 §0p F), generated from the parts the set is assembled from — never written by hand:
 * how a project is opened on the set's host (the host part's own text), how the set is installed for its tier, which
 * modules it carries, and for a Basic install the file list with line counts to fetch and check against.
 */
export function setBootstrap(kit: Kit, storeDir = STORE_DIR): string {
  const dir = setDir(kit.name, storeDir);
  const parts = kitParts(kit, storeDir);
  const host = parts.find((p) => p.folder.startsWith("_Host/"));
  const hostBody = host
    ? bodyOf(readFileSync(mainPath(host.dir, mainOf(host)), "utf8")).split(/\r?\n/).filter((l) => !/^#\s/.test(l)).join("\n").trim()
    : "";
  const rules = parts.filter((p) => p.shelf === SHELF.rules);
  const byGroup = (g: string): number => rules.filter((p) => p.folder.split("_")[1] === g).length;
  const articles = parts.filter((p) => p.shelf === SHELF.constitution).map((p) => p.folder);
  const skills = parts.filter((p) => p.shelf === SHELF.skills).map((p) => hostSkillOf(p));
  const raw = readSource(storeDir).raw;
  const lines = (f: string): number => readFileSync(join(dir, f), "utf8").split(/\r?\n/).length - (readFileSync(join(dir, f), "utf8").endsWith("\n") ? 1 : 0);
  const install = kit.tier === "Memory"
    ? [
        "Máy đã cài zemory. Trong folder dự án:",
        "",
        "```",
        `zemory init --kit ${kit.no}`,
        "zemory doctor",
        "```",
        "",
        "`init` ráp bộ từ kho của bản zemory đang cài; `doctor` phải xanh trước khi làm việc.",
      ]
    : [
        "Không cần cài zemory. Tải từng file trong bảng §4 từ",
        `\`${raw}/docs_template/${kit.name}/<đường>\` về đúng đường đó trong folder dự án; thay \`<PROJECT>\` bằng tên folder`,
        "dự án. Tải xong, đếm số dòng từng file: khớp bảng §4 thì cài xong, lệch thì tải lại file đó.",
      ];
  const files = kit.tier === "Basic" ? setFiles(dir) : [];
  return [
    `<!-- Generated by zemory from the parts of ${kit.name} (plan/28 §0p F) — never edited by hand; assembleSet rewrites it. -->`,
    `# BOOTSTRAP — ${kit.name}`,
    "",
    `> Cho trợ lý thi hành. Bộ: hệ **${kit.host}** · structure **${kit.structure}** · tầng **${kit.tier}**.`,
    "",
    `## 1. Mở dự án — hệ ${kit.host}`,
    "",
    hostBody,
    "",
    "## 2. Cài bộ",
    "",
    ...install,
    "",
    "## 3. Module trong bộ",
    "",
    `- Luật chung: ${rules.length} (Gate ${byGroup("Gate")} · Keys ${byGroup("Keys")} · Core ${byGroup("Core")}).`,
    `- Khung hiến pháp (${articles.length}): ${articles.length ? articles.map((a) => `\`${a}\``).join(" · ") : "không có"}. Mỗi khung có \`Cons.md\` mẫu: viết lại cho sản phẩm của dự án, hoặc ghi \`status: n/a\` kèm lý do.`,
    `- Structure: \`${kit.structure}\` · hệ: \`_Host/${kit.host}\`.`,
    `- Skill (${skills.length}): ${skills.map((s) => `\`${s}\``).join(" · ")}.`,
    ...(files.length
      ? ["", "## 4. Danh sách file", "", "| # | Đường | Số dòng |", "|---|---|---|", ...files.map((f, i) => `| ${i + 1} | \`${f}\` | ${lines(f)} |`)]
      : []),
    "",
  ].join("\n");
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
    const copy = mainPath(targetDir(t, s), MAIN_FILE[SHELF.skills]);
    const from = existsSync(copy) ? String(frontMatter(readFileSync(copy, "utf8"))?.meta.from ?? "") : "";
    return `| \`${s.folder}/\` | \`.claude/skills/${hostSkillOf(s)}/\` | ${from || "(not assembled)"} |`;
  });
  const block = [head, "| Skill (source) | Host | from |", "|---|---|---|", ...rows, SK_END].join(eol);
  // The repo's own rows still name a kit skill by its OLD name (`grill/`) after that folder made way for the host build
  // (`harness-grill/`): conform then reported each as a skill with no SKILL.md (8 and 13 rows on two real repos,
  // 2026-10-17). Follow the rename outside the block; a folder still on disk under the old name (an edited copy) keeps it.
  const next = followHostRenames(text.slice(0, a), skills, t) + block + followHostRenames(text.slice(b + SK_END.length), skills, t);
  if (next === text) return "current";
  writeFileSync(p, next);
  return "written";
}

/** A kit skill named by its OLD host name (aka) — a row `grill/` or a trigger path `.claude/skills/dev-pbi/SKILL.md` —
 *  points at nothing once the host build moved to the new name. Follow the rename; a folder still on disk under the old
 *  name (an edited copy, or the repo's own skill) keeps it. */
function followHostRenames(s: string, skills: Part[], t: AssemblyTarget): string {
  let out = s;
  for (const k of skills) {
    const aka = String(k.meta.aka ?? "");
    const host = hostSkillOf(k);
    if (!aka || aka === host || existsSync(join(t.skillsDir, aka))) continue;
    out = out.split("`" + aka + "/`").join("`" + host + "/`").split(`.claude/skills/${aka}/`).join(`.claude/skills/${host}/`);
  }
  return out;
}

/** The trigger table of the entry file follows host renames too (see followHostRenames). */
function followEntryRenames(root: string, skills: Part[], t: AssemblyTarget): void {
  const p = join(root, "AGENTS.md");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  const next = followHostRenames(text, skills, t);
  if (next !== text) writeFileSync(p, next);
}
