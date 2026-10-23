// plan/28 §0l ⑤⑥ — move a repo from the file harness (01..04 as files, hooks/ beside the agent folder) to the folder
// harness assembled from the parts store. Entry: `zemory sync --standard --kit <no>` on a file-harness repo (HP article 17:
// no new command). Dry-run unless `apply`.
//
// Nothing is lost, by construction:
//  · every file the move replaces is COPIED first to `<agent>/archive/file-harness-<date>/` (01..04, AGENTS.md, hooks/);
//  · a rule whose text in the repo differs from every kit's text keeps the repo's wording inside its RULE.md, under a
//    section the repo merges by hand; a rule only the repo has becomes the repo's own folder (no `from:` — never synced);
//  · an unnumbered 02_RULES.md goes whole to `02_RULES/LEGACY.md`;
//  · constitution articles are split one per folder, word for word; Mục đích and every other section go to PURPOSE.md;
//    a gate row of the old table is copied into its article's text (the repo's agent turns it into a gate.json);
//  · the old 03_STRUCTURE.md becomes `03_STRUCTURE/INDEX.md` whole;
//  · a shared skill the repo edited stays the repo's own; trigger rows of AGENTS.md for skills outside the kit are carried.
// What is NOT touched: 05_TODO · 06_CHANGES · plan/ · the repo's own skills · anything outside the harness.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { harnessPathsAt, readMarker } from "../core/config.js";
import { TEMPLATE_DIR } from "./adopt.js";
import { generateGuards, hooksDirOf } from "./guard-gen.js";
import { CONS_REPO_FILE, LEDGER, OWN_ARTICLE_FROM, SHELF, camelName, formatPartName, legacyKey } from "./harness-names.js";
import { applyKit, writeKitMarker, type KitApplyResult } from "./kit-apply.js";
import { ruleBlocks } from "./rule-core.js";
import { NO_GATE_END, NO_GATE_START } from "./no-gate.js";
import { hpGateRows } from "./validate.js";
import { historyOfRel, revText } from "./standard.js";
import { ARCHIVE_SHELF, findKit, hostSkillOf, isFolderHarness, kitParts, leafOf, listParts, mainPath, shelfDir, STORE_DIR, type Kit } from "./store.js";
import { wiredHooks } from "./hook-wiring.js";
import { READ_FIRST_FILE } from "./read-first-src.js";
import { RULE_HOOKS } from "./rule-hooks-src.js";
import { SQL_GATE_FILE } from "./sql-gate-src.js";

export interface MigrateReport {
  root: string;
  kit: Kit;
  archive: string;
  /** Rules whose repo wording differs from every kit — kept inside their RULE.md for a hand merge. */
  localRules: string[];
  /** Rules only the repo has — written as the repo's own folders. */
  ownRules: string[];
  /** Rules the store has retired (merged into others, plan/28 §0q) still word for word in the repo: dropped, not kept as own. */
  retiredRules: string[];
  /** 02_RULES.md had no numbered rules: kept whole as 02_RULES/LEGACY.md. */
  legacyRules: boolean;
  /** Constitution articles written as folders, and those whose old gate row was carried as text. */
  articles: string[];
  articleGateRows: string[];
  /** Shared skills the repo edited (kept as its own) and shared skills replaced by the store copy. */
  keptSkills: string[];
  /** hooks of the repo's own that settings.json still calls, left in docs/hooks (they need a law to live in) */
  keptHooks?: string[];
  replacedSkills: string[];
  /** AGENTS.md trigger rows carried for skills outside the kit. */
  carriedTriggers: number;
  applied: boolean;
  assembly?: KitApplyResult;
  guard?: string[];
  /** Files whose markdown links to a replaced file were repointed. */
  repointedLinks?: string[];
}

const KIT_RULE_FILES = ["03_nonapp/agent", "05_app/agent", "04_adapt/agent", "01_cowork_basic/nonapp/agent", "02_cowork_memory/nonapp/agent"];
const KIT_SKILL_DIRS = ["03_nonapp/.claude/skills", "05_app/.claude/skills", "04_adapt/.claude/skills", "01_cowork_basic/nonapp/.claude/skills", "02_cowork_memory/nonapp/.claude/skills"];

const norm = (s: string): string => s.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\s+$/g, "").trim();

/**
 * The dictionary folder of a repo's own article or rule (plan/28 §0o). The name component comes from the title with marks
 * dropped — not English yet: the constitution redraft (plan/28 §0o step 7) gives every repo-own part its English name.
 */
function partFolder(code: "Rule" | "Cons", no: number, group: "Gate" | "Core", title: string): string {
  return formatPartName({ code, group, no, name: camelName(slugOf(title)) || "Untitled" });
}

/** ASCII English-ish kebab name from a Vietnamese title: diacritics dropped, at most five words. */
export function slugOf(title: string): string {
  const ascii = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[`*_"'“”‘’()[\]{}]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join("-");
  return ascii || "rule";
}

let knownCache: Map<string, Set<string>> | null = null;

/** Every wording any kit EVER shipped for every rule — current files and every version in zemory's git history,
 *  normalized. A repo text found here was not customized: it is a copy of some standard version (repos carry the text of
 *  the day they last synced, not today's). */
function knownRuleTexts(): Map<string, Set<string>> {
  if (knownCache) return knownCache;
  const out = new Map<string, Set<string>>();
  const add = (text: string): void => {
    for (const b of ruleBlocks(text)) {
      const s = out.get(b.id) ?? new Set<string>();
      s.add(norm(b.text));
      out.set(b.id, s);
    }
  };
  for (const d of KIT_RULE_FILES) {
    const f = join(TEMPLATE_DIR, d, "02_RULES.md");
    if (existsSync(f)) add(readFileSync(f, "utf8"));
    for (const rev of historyOfRel(`docs_template/${d}/02_RULES.md`)) {
      const t = revText(rev);
      if (t) add(t);
    }
  }
  knownCache = out;
  return out;
}

function knownSkillTexts(name: string): Set<string> {
  const out = new Set<string>();
  for (const d of KIT_SKILL_DIRS) {
    const f = join(TEMPLATE_DIR, d, name, "SKILL.md");
    if (existsSync(f)) out.add(norm(readFileSync(f, "utf8")));
  }
  return out;
}

const title = (block: string): string => /\*\*(.+?)\*\*/.exec(block)?.[1]?.replace(/\s+/g, " ").trim() ?? "";

/** Split a constitution file into PURPOSE text and articles `{n, text}` (the article text without its `N. ` prefix). */
function splitConstitution(text: string): { purpose: string; articles: { n: number; title: string; body: string }[] } {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const articles: { n: number; title: string; body: string }[] = [];
  const purpose: string[] = [];
  let section = "";
  let inGen = false;
  let cur: { n: number; lines: string[] } | null = null;
  const close = (): void => {
    if (!cur) return;
    const body = cur.lines.join("\n").replace(/^\d+\.\s+/, "").trimEnd();
    articles.push({ n: cur.n, title: title(body), body });
    cur = null;
  };
  for (const l of lines) {
    if (l.startsWith(NO_GATE_START)) { inGen = true; continue; }
    if (l.startsWith(NO_GATE_END)) { inGen = false; continue; }
    if (inGen) continue; // generated block — rebuilt by the machine, nothing of the repo's own
    if (/^<!-- zemory-standard:/.test(l)) continue;
    if (/^## /.test(l)) { close(); section = l; if (!/^## Điều khoản\s*$/.test(l)) purpose.push(l); continue; }
    if (/^## Điều khoản\s*$/.test(section)) {
      const m = /^(\d{1,2})\.\s/.exec(l);
      if (m) { close(); cur = { n: Number(m[1]), lines: [l] }; continue; }
      if (cur) { cur.lines.push(l); continue; }
      purpose.push(l); // text of the section that is not an article (its comment)
      continue;
    }
    purpose.push(l);
  }
  close();
  return { purpose: purpose.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n", articles };
}

/** Plan (and with `apply`, perform) the move of one repo. */
export function migrateToKit(root: string, opts: { kitRef: string; apply: boolean; date?: string; storeDir?: string }): MigrateReport | { error: string } {
  const storeDir = opts.storeDir ?? STORE_DIR;
  const marker = readMarker(root);
  if (!marker) return { error: "no .harness.json — run `zemory init --kit <no>` instead" };
  const data = marker.data as { layout?: unknown; kit?: unknown };
  if (data.layout === "foreign" || data.layout === "adapt") return { error: "an Adapt repo (layout: foreign) — no Adapt kit yet; left on the file harness" };
  const hp = harnessPathsAt(root);
  const agent = hp.agent;
  if (isFolderHarness(agent)) return { error: "already a folder harness — use `zemory sync --standard`" };
  const kit = findKit(opts.kitRef, storeDir);
  if (!kit) return { error: `no kit "${opts.kitRef}"` };
  if (kit.status !== "built") return { error: `kit ${kit.name} is ${kit.status}` };

  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  const archive = join(dirname(agent), "archive", `file-harness-${date}`); // docs/archive (plan/28 §0q)
  const rep: MigrateReport = {
    root, kit, archive: relative(root, archive).replace(/\\/g, "/"), localRules: [], ownRules: [], retiredRules: [], legacyRules: false, articles: [],
    articleGateRows: [], keptSkills: [], replacedSkills: [], carriedTriggers: 0, applied: opts.apply,
  };
  const read = (p: string): string => (existsSync(p) ? readFileSync(p, "utf8") : "");
  const rulesText = read(join(agent, "02_RULES.md"));
  const hpText = read(join(agent, "01_CONSTITUTION.md"));
  const agentsText = read(join(root, "AGENTS.md"));

  // ── what will happen (computed the same for dry-run and apply) ──
  // Matched by KEY (plan/28 §0o): the repo's file names a rule `02-7`, the store part is keyed `Rule_7`.
  const storeRuleKeys = new Set(kitParts(kit, storeDir).filter((p) => p.shelf === SHELF.rules).map((p) => p.key));
  const retiredKeys = new Set(listParts(join(storeDir, ARCHIVE_SHELF), SHELF.rules).map((p) => p.key));
  const keyOfId = (id: string): string => legacyKey(id) ?? id;
  const known = knownRuleTexts();
  const blocks = ruleBlocks(rulesText);
  rep.legacyRules = Boolean(rulesText.trim()) && blocks.length === 0;
  const seen = new Set<string>();
  const local: { id: string; text: string }[] = [];
  const own: { id: string; text: string; gate: string | null }[] = [];
  for (const b of blocks) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    if (storeRuleKeys.has(keyOfId(b.id))) {
      if (!known.get(b.id)?.has(norm(b.text))) local.push({ id: b.id, text: b.text });
    } else if (retiredKeys.has(keyOfId(b.id)) && known.get(b.id)?.has(norm(b.text))) {
      // the standard's own old wording of a rule the store has retired: its content lives in the rule that took it in
      rep.retiredRules.push(b.id);
    } else own.push({ id: b.id, text: b.text, gate: b.gate });
  }
  rep.localRules = local.map((l) => l.id);
  rep.ownRules = own.map((o) => o.id);
  const con = splitConstitution(hpText);
  const rows = new Map((hpGateRows(agent) ?? []).map((r) => [r.n, r]));
  rep.articles = con.articles.map((a) => `01-${a.n}`);
  rep.articleGateRows = con.articles.filter((a) => rows.has(a.n)).map((a) => `01-${a.n}`);
  // A file-harness repo knows the kit's skills by their OLD names (`.claude/skills/grill/`); the store calls them
  // Skill_Harness_Grill (host name harness-grill), with the old name kept as aka (plan/28 §0o).
  const kitSkillParts = kitParts(kit, storeDir).filter((p) => p.shelf === SHELF.skills);
  const kitSkills = kitSkillParts.map((p) => String(p.meta.aka ?? "") || p.folder);
  const kitHosts = new Set(kitSkillParts.flatMap((p) => [String(p.meta.aka ?? ""), hostSkillOf(p)]).filter(Boolean));
  for (const s of kitSkills) {
    const f = join(hp.skills, s, "SKILL.md");
    if (!existsSync(f)) continue;
    if (knownSkillTexts(s).has(norm(readFileSync(f, "utf8")))) rep.replacedSkills.push(s);
    else rep.keptSkills.push(s);
  }
  const triggerRows = agentsText.split(/\r?\n/).filter((l) => {
    const m = /\.claude\/skills\/([\w-]+)\//.exec(l);
    return l.startsWith("|") && m && !kitHosts.has(m[1]);
  });
  rep.carriedTriggers = triggerRows.length;
  if (!opts.apply) return rep;

  // ── archive (copy — the move below never deletes before this exists) ──
  mkdirSync(archive, { recursive: true });
  for (const f of ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md"]) {
    if (existsSync(join(agent, f))) cpSync(join(agent, f), join(archive, f));
  }
  if (existsSync(join(root, "AGENTS.md"))) cpSync(join(root, "AGENTS.md"), join(archive, "AGENTS.md"));
  const oldHooks = join(agent, "..", "hooks");
  if (existsSync(oldHooks)) cpSync(oldHooks, join(archive, "hooks"), { recursive: true, filter: (s) => !/[\\/]\.(allow-[^\\/]*|seen\.json)$/.test(s) });

  // ── constitution (plan/28 §0q): the purpose becomes the written Cons.md of the purpose frame; each article becomes one of
  // the repo's own, numbered from OWN_ARTICLE_FROM — the store's frames hold the numbers below it ──
  mkdirSync(join(agent, SHELF.constitution), { recursive: true });
  const purposeFrame = kitParts(kit, storeDir).find((p) => p.shelf === SHELF.constitution && p.key === "Cons_9");
  if (purposeFrame && con.purpose.trim()) {
    const d = join(agent, SHELF.constitution, purposeFrame.folder);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, CONS_REPO_FILE), `---\nframe: ${leafOf(purposeFrame.folder)}\nstatus: written\n---\n# ${basename(root)} — Mục đích\n\n${con.purpose.trim()}\n`);
  }
  for (const a of con.articles) {
    const no = OWN_ARTICLE_FROM - 1 + a.n;
    const d = join(agent, SHELF.constitution, partFolder("Cons", no, "Core", a.title));
    mkdirSync(d, { recursive: true });
    const row = rows.get(a.n);
    const rowLine = row ? `\n\n- Cổng khai ở bảng cổng hiến pháp cũ: ${[row.kind, row.gate].filter(Boolean).join(" — ")} *(đổi thành \`gate.json\` khi có chốt máy thật)*` : "";
    writeFileSync(join(d, `${basename(d)}.md`), `---\nid: Cons_${no}\naka: 01-${a.n}\nname: ${slugOf(a.title)}\nversion: 1\nkind: judgment\n---\n# ${basename(d)} ${a.title}\n\n${a.body}${rowLine}\n`);
  }
  rmSync(join(agent, "01_CONSTITUTION.md"), { force: true });

  // ── marker first: the assembly below then treats the repo as already having a kit (no suggested articles) ──
  writeKitMarker(root, kit);

  // ── rules: the old file leaves; repo-only rules become the repo's own folders ──
  rmSync(join(agent, "02_RULES.md"), { force: true });
  mkdirSync(join(agent, SHELF.rules), { recursive: true });
  if (rep.legacyRules) writeFileSync(join(agent, SHELF.rules, "LEGACY.md"), rulesText);
  for (const o of own) {
    const d = join(agent, SHELF.rules, partFolder("Rule", Number(o.id.split("-")[1]), o.gate ? "Gate" : "Core", title(o.text)));
    mkdirSync(d, { recursive: true });
    const kind = o.gate ? "content" : "judgment";
    writeFileSync(join(d, `${basename(d)}.md`), `---\nid: ${keyOfId(o.id)}\naka: ${o.id}\nname: ${slugOf(title(o.text))}\nversion: 1\nkind: ${kind}\n---\n# ${basename(d)} ${title(o.text)}\n\n${o.text.trim()}\n`);
    if (o.gate) writeFileSync(join(d, "gate.json"), JSON.stringify({ gate: o.gate }) + "\n");
  }

  // ── structure: the old file is in the archive (above); the INDEX is the machine's table of contents (plan/29 §13),
  // written by the assembly below. 04_SKILLS.md moves to the skills shelf and is archived the same way when replaced.
  mkdirSync(join(agent, SHELF.structure), { recursive: true });
  rmSync(join(agent, "03_STRUCTURE.md"), { force: true });

  // ── shared skills: an unedited copy makes way for the store's ──
  for (const s of rep.replacedSkills) rmSync(join(hp.skills, s), { recursive: true, force: true });

  // ── AGENTS.md: the kit's own, plus the repo's trigger rows for skills outside the kit ──
  rmSync(join(root, "AGENTS.md"), { force: true });

  // ── hooks: the old folder leaves (archived above); the guard is regenerated in 02-55 ──
  // A hook of the repo's own that settings.json still calls stays where it is: archiving it left the host calling a path
  // that was gone, and a hook that fails is let through — a department's mail gate went silent that way (2026-10-18).
  // The tool's own files (guard, latch, generated rule hooks) leave as before.
  if (existsSync(oldHooks)) {
    const ours = new Set(["guard.cjs", "read-first.cjs", READ_FIRST_FILE, "precommit-guard.cjs", "policy.json", ".gitignore", SQL_GATE_FILE, ...RULE_HOOKS.map((h) => h.file)]);
    const own = wiredHooks(root).map((h) => h.file).filter((f) => f.startsWith("docs/hooks/") && !ours.has(f.slice("docs/hooks/".length)));
    rep.keptHooks = [...new Set(own)];
    if (!rep.keptHooks.length) rmSync(oldHooks, { recursive: true, force: true });
    else for (const e of readdirSync(oldHooks)) if (!rep.keptHooks.includes(`docs/hooks/${e}`)) rmSync(join(oldHooks, e), { recursive: true, force: true });
  }

  rep.assembly = applyKit(root, { apply: true, storeDir }) as KitApplyResult;

  // Local wording of a store rule: kept inside the assembled RULE.md for a hand merge (the copy now counts as edited).
  for (const l of local) {
    const dir = listParts(agent, SHELF.rules).find((p) => p.key === keyOfId(l.id))?.dir;
    if (!dir) continue;
    const p = mainPath(dir, "RULE.md");
    writeFileSync(p, readFileSync(p, "utf8").replace(/\s*$/, "") +
      `\n\n## Bản của repo trước khi chuyển\n\n> Chữ của repo cho luật này khác bản chuẩn. Đối chiếu, gộp phần còn cần vào bên trên, rồi xoá mục này.\n\n${l.text.trim()}\n`);
  }
  if (triggerRows.length && existsSync(join(root, "AGENTS.md"))) {
    const p = join(root, "AGENTS.md");
    writeFileSync(p, readFileSync(p, "utf8").replace(/\s*$/, "") + `\n\n## Trigger riêng của repo\n\n| Mở khi | Đọc |\n|---|---|\n${triggerRows.join("\n")}\n`);
  }
  rep.guard = generateGuards(root).added;
  rep.repointedLinks = repointLinks(root, true);
  // A session open while the repo moves keeps the hook command it read at start (`node docs/hooks/guard.cjs`): without
  // this forwarder that path is gone and the host lets every call of that session through. New sessions use the new path.
  const hooksRel = relative(join(agent, ".."), join(hooksDirOf(root), "guard.cjs")).replace(/\\/g, "/");
  mkdirSync(oldHooks, { recursive: true });
  writeFileSync(join(oldHooks, "guard.cjs"),
    `// Forwarder left by the move to the folder harness (plan/28): sessions opened before the move still call this path.\n` +
    `// The guard itself lives beside rule 55 (${hooksRel}). Safe to delete once no such session is open.\n` +
    `require(require("node:path").join(__dirname, "..", ${JSON.stringify(hooksRel)}));\n`);
  return rep;
}

/** Markdown LINK TARGETS that pointed at a file the move replaced, rewritten to where that content lives now. Only the
 *  target inside `](…)` changes — the words of the text are the repo's and stay. Skips the archive, generated parts and
 *  dependencies. Returns the files changed. */
export function repointLinks(root: string, apply: boolean): string[] {
  const agentDir = harnessPathsAt(root).agent;
  const MAP: Array<[RegExp, string]> = [
    // the file harness → the folder shelves (current names, plan/28 §0q)
    [/(\]\([^)\s]*?)01_CONSTITUTION\.md((?:#[^)\s]*)?\))/g, `$1${SHELF.constitution}/PURPOSE.md$2`],
    [/(\]\([^)\s]*?)02_RULES\.md(?:#[^)\s]*)?\)/g, `$1${SHELF.rules}/)`],
    [/(\]\([^)\s]*?)03_STRUCTURE\.md(?:#[^)\s]*)?\)/g, `$1${SHELF.structure}/INDEX.md)`],
    [/(\]\([^)\s]*?)04_SKILLS\.md(?:#[^)\s]*)?\)/g, `$1${SHELF.skills}/INDEX.md)`],
    [/(\]\([^)\s]*?)06_CHANGES\.md/g, `$1${LEDGER.changes}`],
    [/(\]\([^)\s]*?)05_TODO\.md/g, `$1${LEDGER.todo}`],
    // a folder harness on a legacy shelf name → the current one
    [/(\]\([^)\s]*?)0[12]_CONSTITUTION\//g, `$1${SHELF.constitution}/`],
    [/(\]\([^)\s]*?)0[12]_RULES\//g, `$1${SHELF.rules}/`],
    [/(\]\([^)\s]*?)03_STRUCTURE\//g, `$1${SHELF.structure}/`],
    [/(\]\([^)\s]*?)04_SKILLS\//g, `$1${SHELF.skills}/`],
    // the archive left the harness folder (plan/28 §0q): `…/agent/archive/x` → `…/archive/x`, same depth
    [/(\]\([^)\s]*?)agent\/archive\//g, `$1archive/`],
  ];
  // Assembled parts (rules · slots · articles · skills) are fixed in the store and reach the repo by sync, never here.
  const SKIP = /[\\/](archive|node_modules|\.git|\.claude|attic|external|dist|0[12]_RULES|01_LAW|0[23]_STRUCTURE[\\/](03-|Slot_|_Slot|_Host|Struc_)|0[12]_CONSTITUTION[\\/](01-|Cons_))([\\/]|$)/;
  // The purpose a repo wrote now lives in the purpose frame's Cons.md (plan/28 §0q), when the repo has that frame.
  const purposeFrame = existsSync(shelfDir(agentDir, SHELF.constitution))
    ? listParts(agentDir, SHELF.constitution).find((p) => p.key === "Cons_9" && p.from)?.folder
    : undefined;
  const agentRel = relative(root, agentDir).replace(/\\/g, "/");
  // where each file of the file harness lives in the folder one (text pointers)
  const TEXT_MAP: Record<string, string> = {
    "01_CONSTITUTION": purposeFrame ? `${SHELF.constitution}/${purposeFrame}/${CONS_REPO_FILE}` : `${SHELF.constitution}/`,
    "02_RULES": `${SHELF.rules}/`,
    "03_STRUCTURE": `${SHELF.structure}/INDEX.md`,
    "04_SKILLS": `${SHELF.skills}/INDEX.md`,
    "05_TODO": LEDGER.todo,
    "06_CHANGES": LEDGER.changes,
  };
  // the repo's assembled skills whose old host name (aka) has no folder any more
  const hostRenames: Array<[string, string]> = existsSync(shelfDir(agentDir, SHELF.skills))
    ? listParts(agentDir, SHELF.skills)
        .filter((p) => p.from)
        .map((p) => [String(p.meta.aka ?? ""), String(p.meta.name ?? "")] as [string, string])
        .filter(([aka, host]) => aka && host && aka !== host && !existsSync(join(root, ".claude", "skills", aka)))
    : [];
  const changed: string[] = [];
  const walk = (d: string): void => {
    let ents: import("node:fs").Dirent[];
    try { ents = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = join(d, e.name);
      if (SKIP.test(p + (e.isDirectory() ? "/" : ""))) continue;
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.md$/i.test(e.name)) continue;
      const t = readFileSync(p, "utf8");
      let n = t;
      for (const [re, to] of MAP) n = n.replace(re, to);
      // A link whose text names an article ("điều 2") goes to that article's folder, not to PURPOSE.
      // An article moved by the migration carries OWN_ARTICLE_FROM - 1 + its old number; one moved earlier keeps its number.
      n = n.replace(/\[([^\]]*?điều\s+(\d{1,2})[^\]]*)\]\(([^)\s]*?)(?:0[12]_CONSTITUTION|01_LAW\/_Cons)\/PURPOSE\.md\)/gi, (whole, text: string, num: string, pre: string) => {
        const own = existsSync(shelfDir(agentDir, SHELF.constitution)) ? listParts(agentDir, SHELF.constitution).filter((p) => !p.from) : [];
        const art = (own.find((p) => p.key === `Cons_${OWN_ARTICLE_FROM - 1 + Number(num)}`) ?? own.find((p) => p.key === `Cons_${Number(num)}`))?.folder;
        return art ? `[${text}](${pre}${SHELF.constitution}/${art}/${art}.md)` : whole;
      });
      if (purposeFrame) n = n.replace(/(\]\([^)\s]*?)01_LAW\/_Cons\/PURPOSE\.md/g, `$1${SHELF.constitution}/${purposeFrame}/${CONS_REPO_FILE}`);
      // A link whose text is the old harness path itself ([`docs/agent/03_STRUCTURE.md`](...)) would keep showing a file
      // that is gone — the agent reads the text and looks for it. Such a text follows the target; any other words stay.
      n = n.replace(/\[`(docs\/agent\/[^`\]]*)`\]\(((?:\.\.?\/)*)(docs\/agent\/[^)\s#]+)(#[^)\s]*)?\)/g,
        (whole, text: string, up: string, target: string, hash: string | undefined) =>
          text === target || existsSync(join(root, text)) ? whole : `[\`${target}\`](${up}${target}${hash ?? ""})`);
      // A path written as text, not as a link (`docs/agent/03_STRUCTURE.md` §7), names a file the move replaced just the
      // same — measured on a reshaped repo 2026-10-18: two such pointers left dead in a plan and a case spec.
      // A relative prefix written before it (`../../docs/agent/03_STRUCTURE.md`) stays as written.
      n = n.replace(/`((?:\.\.\/)*)docs\/agent\/(0[1-6]_[A-Z]+)\.md`/g, (whole, up: string, name: string) => {
        if (existsSync(join(agentDir, `${name}.md`))) return whole;
        const to = TEXT_MAP[name];
        return to ? `\`${up}${agentRel}/${to}\`` : whole;
      });
      // A kit skill named by its old host name (`.claude/skills/case/`) after its build moved to the new one (task-case).
      for (const [aka, host] of hostRenames) n = n.split(`.claude/skills/${aka}/`).join(`.claude/skills/${host}/`);
      // A ledger beside the archive linked it as `archive/x`; the archive left the harness folder (docs/archive), so the
      // link climbs one level - only when the file is there and not still under the old place (a reshaped repo 2026-10-18).
      if (dirname(p) === agentDir) {
        n = n.replace(/\]\(archive\/([^)\s#]+)/g, (whole, rest: string) =>
          existsSync(join(agentDir, "archive", rest)) || !existsSync(join(dirname(agentDir), "archive", rest)) ? whole : `](../archive/${rest}`);
      }
      if (n !== t) {
        if (apply) writeFileSync(p, n);
        changed.push(relative(root, p).replace(/\\/g, "/"));
      }
    }
  };
  walk(root);
  return changed;
}

/** A `protected` entry of the marker that names a file of the file harness the move replaced (`docs/agent/01_CONSTITUTION.md`)
 *  protects nothing — the folder harness guards its own shelves and every `Cons.md`. Dropped; returns what was dropped. */
export function pruneMarkerProtected(root: string, apply: boolean): string[] {
  const p = join(root, "docs", ".harness.json");
  if (!existsSync(p)) return [];
  let j: { protected?: unknown };
  try { j = JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, "")) as typeof j; } catch { return []; }
  if (!Array.isArray(j.protected)) return [];
  const dead = (j.protected as unknown[]).filter((e): e is string => typeof e === "string" && /^docs\/agent\/0[1-6]_[A-Z]+\.md$/.test(e) && !existsSync(join(root, e)));
  if (!dead.length) return [];
  if (apply) writeFileSync(p, JSON.stringify({ ...j, protected: (j.protected as unknown[]).filter((e) => !dead.includes(e as string)) }, null, 2) + "\n");
  return dead;
}

export interface OwnConstitutionMove {
  purpose: boolean;
  renamed: Array<{ from: string; to: string }>;
}

/**
 * A first-generation folder harness (plan/28 §0q) keeps its purpose in `_Cons/PURPOSE.md` and its articles as `01-N_slug/RULE.md`.
 * The file-to-folder move already gives them the current shape; sync does the same here, so every repo ends on ONE template:
 * the purpose becomes the written `Cons.md` of the purpose frame (the old file goes to the archive), and each article becomes the
 * repo's own `Cons_<Core|Gate>_<100+N>_<Name>` (aka `01-N`), every file of its folder kept. Links into the old folders follow.
 * Real-repo trial 2026-10-17: AcmeFlow · AcmeInfra carried both, and conform called their purpose unwritten.
 */
export function normalizeOwnConstitution(root: string, apply: boolean): OwnConstitutionMove {
  const hp = harnessPathsAt(root);
  const cons = shelfDir(hp.agent, SHELF.constitution);
  const out: OwnConstitutionMove = { purpose: false, renamed: [] };
  if (!existsSync(cons)) return out;
  const frame = listParts(hp.agent, SHELF.constitution).find((p) => p.key === "Cons_9" && p.from);
  const purposeFile = join(cons, "PURPOSE.md");
  if (frame && existsSync(purposeFile)) {
    const consMd = join(frame.dir, CONS_REPO_FILE);
    const written = existsSync(consMd) && /^status:\s*written\s*$/m.test(readFileSync(consMd, "utf8"));
    if (!written) {
      out.purpose = true;
      if (apply) {
        const body = readFileSync(purposeFile, "utf8").replace(/^\uFEFF/, "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
        writeFileSync(consMd, `---\nframe: ${leafOf(frame.folder)}\nstatus: written\n---\n${body}\n`);
        mkdirSync(hp.archive, { recursive: true });
        cpSync(purposeFile, join(hp.archive, "PURPOSE.md"));
        rmSync(purposeFile, { force: true });
      }
    }
  }
  for (const e of readdirSync(cons, { withFileTypes: true })) {
    const m = /^01-(\d+)_/.exec(e.name);
    if (!e.isDirectory() || !m) continue;
    const dir = join(cons, e.name);
    const mainName = existsSync(join(dir, "RULE.md")) ? "RULE.md" : readdirSync(dir).find((f) => f.endsWith(".md"));
    if (!mainName) continue;
    const text = readFileSync(join(dir, mainName), "utf8");
    if (/^from:/m.test(text)) continue; // a store copy, not the repo's own
    const n = Number(m[1]);
    const no = OWN_ARTICLE_FROM - 1 + n;
    const heading = (/^#\s+(.+)$/m.exec(text)?.[1] ?? e.name).replace(/^01-\d+\s+/, "").trim();
    let gated = false;
    try { gated = Boolean(Object.keys(JSON.parse(readFileSync(join(dir, "gate.json"), "utf8"))).some((k) => ["gate", "hook", "match"].includes(k))); } catch { /* no gate.json */ }
    const to = partFolder("Cons", no, gated ? "Gate" : "Core", heading);
    if (existsSync(join(cons, to))) continue;
    out.renamed.push({ from: e.name, to });
    if (!apply) continue;
    renameSync(dir, join(cons, to));
    const head = text
      .replace(/^id:\s*.*$/m, `id: Cons_${no}`)
      .replace(/^(id: .*)$/m, /^aka:/m.test(text) ? "$1" : `$1\naka: 01-${n}`)
      .replace(/^#\s+01-\d+\s+/m, `# ${to} `);
    writeFileSync(join(cons, to, `${to}.md`), head);
    if (mainName !== `${to}.md`) rmSync(join(cons, to, mainName), { force: true });
  }
  if (apply && out.renamed.length) {
    // links into a moved article folder (plans · README · the repo's own docs) follow it; its own text is untouched
    const walk = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (/^(\.git|node_modules|archive|attic|external|dist|\.claude)$/.test(e.name)) continue;
        if (e.isDirectory()) { walk(p); continue; }
        if (!/\.md$/i.test(e.name)) continue;
        const t = readFileSync(p, "utf8");
        let n = t;
        for (const r of out.renamed) {
          n = n.split(`${r.from}/RULE.md`).join(`${r.to}/${r.to}.md`).split(`/${r.from}/`).join(`/${r.to}/`).split(`/${r.from})`).join(`/${r.to})`);
        }
        if (n !== t) writeFileSync(p, n);
      }
    };
    walk(root);
  }
  return out;
}

/** Old file-harness entries a repo may still point at after the move (for the report). */
export function legacyLeftovers(root: string): string[] {
  const agent = harnessPathsAt(root).agent;
  return ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md"].filter((f) => existsSync(join(agent, f)))
    .concat(existsSync(join(agent, "..", "hooks")) ? ["hooks/"] : []);
}
