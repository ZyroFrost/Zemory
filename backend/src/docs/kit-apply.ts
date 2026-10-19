// plan/28 §0 — assemble a repo's folder harness from the parts store. One entry for both `zemory init --kit <no>` (a new
// repo) and `zemory sync --standard` on a repo whose marker names a kit (HP article 17: no second command).
//
// Order: legacy layout moved → marker (records the kit) → the starter files the assembled slots seed (gap-fill only, never
// overwritten) → parts (plan, then write when `apply`) → the host plug → the skills block of 04_SKILLS/INDEX.md → the guard.
// Reading is the default; nothing is written without `apply`.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { CONFIG_FILE, findMarker, harnessPathsAt, readMarker } from "../core/config.js";
import { DEFAULT_CONFIG } from "./adopt.js";
import {
  applyAssembly,
  listParts,
  SHELVES,
  bodyOf,
  mainOf,
  readSource,
  findKit,
  kitStructure,
  kitParts,
  mainPath,
  gateOf,
  hostSkillOf,
  planAssembly,
  plugSkills,
  installBases,
  installParts,
  type InstallResult,
  renameLegacyShelves,
  retireCopies,
  seedFiles,
  seedTextOf,
  setDir,
  STORE_DIR,
  type AssemblyStep,
  type AssemblyTarget,
  type Kit,
  type Part,
  type PlugResult,
  type RetiredCopy,
} from "./store.js";
import { SHELF } from "./harness-names.js";
import { unwireHooks } from "./hook-wiring.js";
import { writeIndexes } from "./harness-index.js";
import { addMissingSections } from "./cons-read.js";

export interface KitApplyResult {
  kit: Kit;
  createdMarker: boolean;
  /** Starter files the assembled slots seeded into the repo (only where nothing was yet). */
  ownAdded: string[];
  steps: AssemblyStep[];
  written: AssemblyStep[];
  /** the two INDEX files (plan/29 §13): rewritten from what is assembled, or already current */
  skillsBlock: "written" | "current";
  /** the repo's own files whose paths to a part that moved folder were brought along (repo-relative) */
  pathsFollowed: string[];
  /** sections of a frame added to the repo's written Cons.md, "<frame>: + <section>" (plan/29 §13b) */
  consAdded: string[];
  /** hand-written INDEX files kept whole in the archive before the generated ones replaced them */
  indexArchived: string[];
  /** Legacy shelf folders renamed to the current names by this pass (`02_RULES → 01_RULES` …). */
  renamedShelves: string[];
  /** Host builds of the kit's skills written into the host folder; a repo-own skill of the same name is skipped. */
  plug: PlugResult;
  /** Copies of parts the store retired: moved to the archive when untouched, reported when edited here (plan/28 §0q). */
  retired: RetiredCopy[];
  /** Files parts install where the repo runs them: written, or kept because they were edited here (plan/28 §0q). */
  installed: InstallResult;
  /** repo hooks a part took over (replaces_hooks): settings.json commands dropped, old copies archived */
  hooksTakenOver: string[];
  /** AGENTS.md's router half was rewritten from the set's seed (refreshEntryRouter) */
  entryRefreshed?: boolean;
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
  // a part that moved folder (a frame into its chapter, a rule into its code): the repo's own text follows it
  const pathsFollowed = followMovedParts(root, hp.agent, steps, opts.apply);
  // a section HS added to a frame after the repo wrote its Cons.md goes in with the template text (plan/29 §13b)
  const consAdded = addMissingSections(hp.agent, opts.apply, storeDir);
  // files the parts install where the repo runs them (scripts/...), after the parts themselves are current
  const installed = installParts(target, root, opts.apply ? parts : [], bases, opts.apply);
  const skills = parts.filter((p) => p.shelf === SHELF.skills);
  // the host plug: every assembled skill's host build, written from its source into the host's own skill folder
  const plug = opts.apply ? plugSkills(target, skills) : { plugged: [], skipped: [], removed: [] };
  // the repo's own skills (Skill_Own_*, written on the frame Skill_Frame_Own, plan/29 §13b) are plugged the same way
  if (opts.apply) {
    const own = plugSkills(target, listParts(hp.agent, SHELF.skills).filter((p) => !p.from && /^Skill_Own_/.test(p.folder)));
    plug.plugged.push(...own.plugged);
    plug.skipped.push(...own.skipped);
  }
  const hooksTakenOver = retireReplacedHooks(root, parts, opts.apply);
  const entryRefreshed = refreshEntryRouter(root, seedTextOf("AGENTS.md", kit, parts, opts.projectName ?? basename(root), storeDir), opts.apply);
  if (opts.apply) followEntryRenames(root, skills, target, listParts(hp.agent, SHELF.skills).filter((p) => !p.from && /^Skill_Own_/.test(p.folder)));
  const retired = retireCopies(target, new Set(parts.map((p) => p.key)), hp.archive, opts.apply, storeDir);
  // plan/29 §13: both INDEX files are tables of contents the machine writes from what is assembled - last, once retired
  // copies have left; a hand-written one is archived whole the first time
  const index = writeIndexes(hp.agent, hp.skills, hp.archive, opts.projectName ?? basename(root), opts.apply);
  const skillsBlock: KitApplyResult["skillsBlock"] = index.written.length ? "written" : "current";
  return { kit, createdMarker, ownAdded, steps, written, pathsFollowed, consAdded, skillsBlock, indexArchived: index.archived, renamedShelves, plug, retired, installed, hooksTakenOver, entryRefreshed };
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
  // A set is a template, not a repo with a history: what a pass retires or replaces in it is already kept in the store's
  // Archive, and an archive folder in the set would be copied into every new repo (and listed in its BOOTSTRAP).
  rmSync(join(dir, "docs", "archive"), { recursive: true, force: true });
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
      // plan/29 §14b: the role comes from the template; a marker that still says it is rewritten without it
      if (raw.kit === kit.name && !("role" in raw)) return false;
      delete raw.role;
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

/**
 * A part that took over a repo's own hook (`gate.json › replaces_hooks: ["mail-gate.cjs"]` — the same check, now dispatched by
 * the guard from the part's folder): the settings.json command that ran the old copy goes, and the copy moves to
 * docs/archive/hooks/. One way only — two copies of one gate would block twice, and the old one stops being kept up.
 */
function retireReplacedHooks(root: string, parts: Part[], apply: boolean): string[] {
  const names = new Set<string>();
  for (const p of parts) {
    try {
      const g = JSON.parse(readFileSync(join(p.dir, "gate.json"), "utf8")) as { replaces_hooks?: unknown };
      if (Array.isArray(g.replaces_hooks)) for (const n of g.replaces_hooks) if (typeof n === "string") names.add(n);
    } catch { /* no gate.json */ }
  }
  if (!names.size) return [];
  const files = [...names].map((n) => `docs/hooks/${n}`);
  const out = unwireHooks(root, files, apply).map((c) => `settings.json: ${c}`);
  for (const f of files) {
    const from = join(root, f);
    if (!existsSync(from)) continue;
    out.push(`${f} → docs/archive/hooks/`);
    if (!apply) continue;
    const to = join(root, "docs", "archive", "hooks", basename(f));
    mkdirSync(dirname(to), { recursive: true });
    if (!existsSync(to)) renameSync(from, to); else rmSync(from);
  }
  // the old hook folder goes when only flags were left in it
  const hooksDir = join(root, "docs", "hooks");
  if (apply && existsSync(hooksDir) && !readdirSync(hooksDir).some((n) => !/^\.(allow-|seen\.json$|gitignore$)/.test(n))) rmSync(hooksDir, { recursive: true, force: true });
  return out;
}

/**
 * A part that sync moved to another folder (a constitution frame into its chapter, a rule into its code of law — plan/29
 * §4 · §5) leaves every path the repo wrote to it dead: measured 2026-10-18 on four departments, each plan or content file
 * that named `_Cons/Cons_Gate_09_Purpose/Cons.md`. Each such path, written as a link or as text, follows the move. The
 * assembled copies are not touched (they would read as edited here), nor is the archive (history keeps its words).
 * Returns the repo-relative files changed (or that would change).
 */
function followMovedParts(root: string, agentDir: string, steps: AssemblyStep[], apply: boolean): string[] {
  const moves = steps
    .filter((s) => s.renameFrom && s.renameFrom !== s.target)
    .map((s) => [relative(agentDir, s.renameFrom!).replace(/\\/g, "/"), relative(agentDir, s.target).replace(/\\/g, "/")] as const)
    .filter(([a, b]) => a && b && !a.startsWith(".."));
  if (!moves.length) return [];
  const copies = new Set(SHELVES.flatMap((sh) => listParts(agentDir, sh).filter((p) => p.from).map((p) => p.dir)));
  const archive = harnessPathsAt(root).archive;
  const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const out: string[] = [];
  const walk = (d: string): void => {
    let ents: import("node:fs").Dirent[];
    try { ents = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (/^(\.git|node_modules|\.claude|attic)$/.test(e.name) || p === archive || copies.has(p)) continue;
        walk(p);
        continue;
      }
      if (!/\.md$/i.test(e.name)) continue;
      const t = readFileSync(p, "utf8");
      let n = t;
      for (const [a, b] of moves) n = n.replace(new RegExp(`${esc(a)}(?=[/)\`\\s#]|$)`, "g"), b);
      if (n === t) continue;
      out.push(relative(root, p).replace(/\\/g, "/"));
      if (apply) writeFileSync(p, n);
    }
  };
  walk(root);
  return out.sort();
}

/** The heading that ends the router half of the entry file; the trigger table below it is the repo's to extend. */
const ENTRY_TRIGGERS = "\n## Mở khi trúng trigger";

/**
 * The router half of AGENTS.md (title line kept, up to the trigger heading) is the set's: it names the system, the init
 * command, where the laws and slots are. It was written once from the seed, so a repo that changed set or outlived a shelf
 * rename kept the old text (2026-10-19: _DB_Log on set 07 still said NON-APP and `--kit 02/03`; seven ERP repos still
 * pointed at 02_RULES · 05_TODO). Every pass rewrites it from the set's seed; the trigger section and its rows stay the
 * repo's. A file without the trigger heading is the repo's own and is left alone. Returns whether it was rewritten.
 */
function refreshEntryRouter(root: string, seed: string | null, apply: boolean): boolean {
  const p = join(root, "AGENTS.md");
  if (!seed || !existsSync(p)) return false;
  const text = readFileSync(p, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lf = text.replace(/\r\n/g, "\n");
  const at = lf.indexOf(ENTRY_TRIGGERS), sat = seed.indexOf(ENTRY_TRIGGERS), nl = lf.indexOf("\n");
  if (at < 0 || sat < 0 || nl < 0 || nl > at) return false;
  const next = (lf.slice(0, nl) + seed.slice(seed.indexOf("\n"), sat) + lf.slice(at)).split("\n").join(eol);
  if (next === text) return false;
  if (apply) writeFileSync(p, next);
  return true;
}

/** The trigger table of the entry file follows host renames too (see followHostRenames). */
function followEntryRenames(root: string, skills: Part[], t: AssemblyTarget, ownSkills: Part[] = []): void {
  const p = join(root, "AGENTS.md");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  let next = followHostRenames(text, skills, t);
  // the archive moved out of the harness folder (moveArchiveOut): the entry file names where it is now
  if (!existsSync(join(t.agentDir, "archive"))) next = next.split("docs/agent/archive/").join("docs/archive/");
  // the structure INDEX is a table of contents the machine writes (plan/29 §13): the line that called it the repo's own
  // "where things are, data dictionary" follows
  next = next.replace(/(`INDEX\.md`: )thứ gì nằm đâu(?:, từ điển dữ liệu của repo)?;/g, "$1mục lục slot do máy sinh lúc sync, không sửa tay;");
  // The row of a store skill is the skill's: its words are the skill's current trigger (2026-10-19, pbi-mix renamed
  // pbi-white kept the trigger "bản mix" and never learned "bản white"), and a skill has one row - a second row for the
  // same host build goes. A row naming a skill of the repo's own is the repo's and stays as written.
  const canon = new Map(skills
    .map((s) => [hostSkillOf(s), gateOf(s.dir)?.trigger] as const)
    .filter((e): e is readonly [string, string] => typeof e[1] === "string" && Boolean(e[1]))
    .map(([host, trig]) => [host, `| ${trig} | \`.claude/skills/${host}/SKILL.md\` |`]));
  const eolOf = next.includes("\r\n") ? "\r\n" : "\n";
  const seen = new Set<string>();
  next = next.split(/\r?\n/).filter((l) => {
    const host = /^\|.*`\.claude\/skills\/([^/`]+)\/SKILL\.md`\s*\|\s*$/.exec(l)?.[1];
    if (!host || !canon.has(host)) return true;
    if (seen.has(host)) return false;
    seen.add(host);
    return true;
  }).map((l) => {
    const host = /^\|.*`\.claude\/skills\/([^/`]+)\/SKILL\.md`\s*\|\s*$/.exec(l)?.[1];
    return host && canon.has(host) ? canon.get(host)! : l;
  }).join(eolOf);
  // A skill the set gained after the repo was assembled has no trigger row (the table is written once, from the seed): the
  // agent would never know when to open it. Its row goes in after the last skill row; a row already there is not doubled.
  // A skill of the repo's own with a gate.json trigger gets its row the same way (plan/29 §23: the DW and the departments
  // got Skill_Own_* on 20/10 and conform saw no row for them); once written, its row is the repo's.
  const own = ownSkills
    .map((s) => [hostSkillOf(s), gateOf(s.dir)?.trigger] as const)
    .filter((e): e is readonly [string, string] => typeof e[1] === "string" && Boolean(e[1]))
    .map(([host, trig]) => [host, `| ${trig} | \`.claude/skills/${host}/SKILL.md\` |`] as const);
  const missing = [...canon, ...own].filter(([host]) => !next.includes(`.claude/skills/${host}/`)).map(([, row]) => row);
  if (missing.length) {
    const lines = next.split(/\r?\n/);
    let last = -1;
    lines.forEach((l, i) => { if (/^\|.*`\.claude\/skills\/[^/`]+\/SKILL\.md`/.test(l)) last = i; });
    if (last >= 0) {
      lines.splice(last + 1, 0, ...missing);
      next = lines.join(next.includes("\r\n") ? "\r\n" : "\n");
    }
  }
  if (next !== text) writeFileSync(p, next);
}
