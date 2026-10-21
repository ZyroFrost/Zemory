// Checks of a repo built from cases and tasks (non-app sets: tasks/<case>/ · data/<case>/ · content/README.md · reports/ ·
// bin/ · shared slots sources/ config/ queries/) and of the words the harness left behind after a reshape.
//
// Why they exist (2026-10-19): Dept_FA after its reshape passed conform · validate · paths · doctor, and a hand check still
// found six faults; Dept_HR found four more. Every one was a fact a machine can read: a case on disk the index does not
// list, a status the index and the spec disagree on, a file a VM task keeps on the PC, a launcher no task owns, a ledger
// headed with the repo's old name, ~120 mentions of harness files that no longer exist. Each function returns the samples
// for one conform item; an empty list means clean. Pure reads.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { archiveDirOf, harnessPathsAt, readMarker } from "../core/config.js";
import { findRegionRepo, repoRole } from "./region-links.js";
import { manifestPaths, manifests } from "./stignore-gen.js";
import { CONS_REPO_FILE, LEDGER, SHELF } from "./harness-names.js";
import { installsOf, isFolderHarness, listParts, listStructures, shelfDir } from "./store.js";

const rel = (root: string, abs: string): string => relative(root, abs).replace(/\\/g, "/");

// One conform pass reads each text file once, however many checks scan it: the scans of the repo's text (own text,
// shared-slot readers, ledgers) each read every file again (measured 2026-10-21: 92 + 85 s of a 465 s region sync). Conform
// writes nothing, so inside `withTextCache` a file read once stays read.
let textCache: Map<string, string | null> | null = null;

export function withTextCache<T>(fn: () => T): T {
  if (textCache) return fn();
  textCache = new Map();
  try {
    return fn();
  } finally {
    textCache = null;
  }
}

export function readText(p: string): string | null {
  if (textCache) {
    // one file reached by `a\b` and `a/b` is one entry
    const k = resolve(p);
    if (!textCache.has(k)) textCache.set(k, readTextFresh(p));
    return textCache.get(k) ?? null;
  }
  return readTextFresh(p);
}

function readTextFresh(p: string): string | null {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function dirs(p: string): string[] {
  try {
    return readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

function files(p: string): string[] {
  try {
    return readdirSync(p, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

/** Every task folder: a child of tasks/ holding a spec.md (a loose folder without one is not a case yet). */
export function taskNames(root: string): string[] {
  return dirs(join(root, "tasks")).filter((d) => existsSync(join(root, "tasks", d, "spec.md")));
}

/** The `key: value` lines of a spec.md front block, values without trailing comments or quotes. */
export function specHeader(text: string): Record<string, string> {
  const m = /^---\s*\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const out: Record<string, string> = {};
  for (const line of m ? m[1].split(/\r?\n/) : []) {
    if (/^\s/.test(line) || !line.includes(":")) continue;
    const i = line.indexOf(":");
    out[line.slice(0, i).trim()] = line.slice(i + 1).replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const CADENCES = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly", "Case", "OnDemand"];
const PERIODIC = new Set(["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"]);
const STATUSES = new Set(["open", "done", "closed", "retired"]);

/** The cadence a task name carries: `<DEPT>_<Cadence>_<Name>`, or null for a name off that pattern. */
export function nameCadence(task: string): string | null {
  const seg = task.split("_")[1];
  return seg && CADENCES.includes(seg) ? seg : null;
}

/** spec.md front block: status and cadence declared and known, the cadence the one in the name, a periodic task one-way. */
export function caseHeaderFindings(root: string): string[] {
  const out: string[] = [];
  for (const t of taskNames(root)) {
    const h = specHeader(readText(join(root, "tasks", t, "spec.md")) ?? "");
    const at = `tasks/${t}/spec.md`;
    if (!h.status) out.push(`${at}: no status: in the front block`);
    else if (!STATUSES.has(h.status)) out.push(`${at}: status: ${h.status} (one of ${[...STATUSES].join(" · ")})`);
    const named = nameCadence(t);
    if (!h.cadence) out.push(`${at}: no cadence: in the front block`);
    else if (named && h.cadence !== named) out.push(`${at}: cadence: ${h.cadence}, the name says ${named}`);
    const cad = h.cadence || named || "";
    if (PERIODIC.has(cad) && h.status !== "retired" && !/^(in|out)$/.test(h.direction ?? "")) {
      out.push(`${at}: a ${cad} task with no direction: in|out`);
    }
  }
  return out;
}

/** The rows of the case table in content/README.md: each row that links a tasks/<case>/ folder, with its status cell. */
function caseRows(text: string): { task: string; status: string }[] {
  const out: { task: string; status: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const m = /tasks\/([^/)\s`]+)\//.exec(line);
    if (!m) continue;
    const cells = line.split("|").map((c) => c.trim());
    out.push({ task: m[1], status: cells[2] ?? "" });
  }
  return out;
}

const CLOSED_WORDS = /ĐÓNG|đóng|\bclosed\b|\bdone\b|\bDONE\b|\bCLOSED\b/;

/**
 * content/README.md is the index of cases (slot Content_113): every case on disk has a row, every row names a case on disk,
 * and the row's status agrees with the spec (a closed case reads closed, an open one does not).
 */
export function caseIndexFindings(root: string): string[] {
  const idx = join(root, "content", "README.md");
  const text = readText(idx);
  const tasks = taskNames(root);
  if (text === null || !tasks.length) return [];
  const rows = caseRows(text);
  const listed = new Set(rows.map((r) => r.task));
  const out: string[] = [];
  for (const t of tasks) if (!listed.has(t)) out.push(`content/README.md: no row for tasks/${t}/`);
  for (const r of rows) {
    if (!existsSync(join(root, "tasks", r.task))) {
      out.push(`content/README.md: row names tasks/${r.task}/, not on disk`);
      continue;
    }
    const st = specHeader(readText(join(root, "tasks", r.task, "spec.md")) ?? "").status;
    const saysClosed = CLOSED_WORDS.test(r.status);
    if ((st === "done" || st === "closed") && !saysClosed) out.push(`content/README.md: ${r.task} is ${st} in spec.md, the row does not say closed`);
    if (st === "open" && saysClosed) out.push(`content/README.md: ${r.task} is open in spec.md, the row says closed`);
  }
  return out;
}

/** reports/README.md lists every report folder in reports/ (one folder per report). */
export function reportsIndexFindings(root: string): string[] {
  const text = readText(join(root, "reports", "README.md"));
  if (text === null) return [];
  return dirs(join(root, "reports"))
    .filter((d) => !d.startsWith(".") && !d.startsWith("_"))
    .filter((d) => !new RegExp("(^|[^A-Za-z0-9_])" + d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![A-Za-z0-9_])").test(text))
    .map((d) => `reports/README.md: no line for reports/${d}/`);
}

/** Folders of a VM task on the work PC that may hold only the shortcut(s) — 02_processing is run scratch. */
const VM_DATA_FOLDERS = ["01_raw", "03_output"];

/**
 * A task on the VM (tasks/<task>/vm_deploy.json) keeps no data on the work PC: data/<task>/01_raw and 03_output hold only
 * `_SharePoint*.url`, plus reference/ (the files a run is rebuilt against: kept on the PC AND copied to the VM as its backup —
 * they are written once and do not grow). Any other leftover is moved by scripts/move_outputs_to_vm.py.
 */
export function vmTaskDataFindings(root: string): string[] {
  const out: string[] = [];
  for (const t of taskNames(root)) {
    if (!existsSync(join(root, "tasks", t, "vm_deploy.json"))) continue;
    for (const f of VM_DATA_FOLDERS) {
      const d = join(root, "data", t, f);
      let ents: string[];
      try {
        ents = readdirSync(d, { withFileTypes: true })
          .filter((e) => !(e.isFile() && /^_SharePoint(_\d+)?\.url$/.test(e.name)) && !(e.isDirectory() && e.name === "reference"))
          .map((e) => e.name);
      } catch {
        continue;
      }
      if (ents.length) out.push(`data/${t}/${f}/: ${ents.slice(0, 3).join(", ")}${ents.length > 3 ? ` (+${ents.length - 3})` : ""}`);
    }
  }
  return out;
}

/** A .stignore line as a test on a repo path (Syncthing: a name without `/` matches any path segment, one with `/` is
 *  anchored at the folder root; `*` stays inside a segment, `**` crosses them). Comments, negations and `#include` give null. */
function stignoreTest(line: string): ((path: string) => boolean) | null {
  const p = line.trim().replace(/^(\(\?[di]\))+/, "");
  if (!p || p.startsWith("//") || p.startsWith("!") || p.startsWith("#")) return null;
  const glob = (g: string): string => g.split("**").map((x) => x.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]")).join(".*");
  if (!p.replace(/^\/|\/$/g, "").includes("/") && !p.startsWith("/")) {
    const re = new RegExp(`^${glob(p.replace(/\/$/, ""))}$`, "i");
    return (path) => path.split("/").some((seg) => re.test(seg));
  }
  const re = new RegExp(`^${glob(p.replace(/^\//, "").replace(/\/$/, ""))}(/|$)`, "i");
  return (path) => re.test(path);
}

/**
 * A file a VM task needs (tasks/<task>/vm_deploy.json `files` / `needs`) must travel to the VM: a .stignore line above it
 * keeps it on the work PC and the task fails on the VM (DW 2026-10-19, when reports · *.pbix · assets joined the list).
 * Paths outside the repo (`../`) are not this repo's to carry.
 */
export function vmDeployIgnoredFindings(root: string): string[] {
  const ign = readText(join(root, ".stignore"));
  if (ign === null) return [];
  // Syncthing takes the FIRST pattern that matches; a `!` pattern lets the path travel. The machine-made allow list
  // (slot Root_141_Stignore: `!/tasks` … then `*`) only reads right in order, negations included.
  const ordered = ign.split(/\r?\n/).map((l) => {
    const raw = l.trim().replace(/^(\(\?[di]\))+/, "");
    const neg = raw.startsWith("!");
    return [l.trim(), stignoreTest(neg ? raw.slice(1) : l), neg] as const;
  }).filter((e): e is readonly [string, (p: string) => boolean, boolean] => Boolean(e[1]));
  /** the line that keeps this path on the work PC, or undefined when it travels */
  const ignoredBy = (path: string): string | undefined => {
    const first = ordered.find(([, test]) => test(path));
    return first && !first[2] ? first[0] : undefined;
  };
  const out: string[] = [];
  // the same manifests and the same keys the allow list is written from (tasks/ and pipelines/; files · needs · secrets ·
  // wrapper · check · build · schedule[].launcher) — one reader, so the check never judges a different list than sync wrote
  for (const man of manifests(root)) {
    const spec = readText(join(root, man));
    if (spec === null) continue;
    let j: Record<string, unknown>;
    try { j = JSON.parse(spec.replace(/^\uFEFF/, "")) as Record<string, unknown>; } catch { continue; }
    for (const path of manifestPaths(j)) {
      if (path.startsWith("../")) continue;
      const hit = ignoredBy(path);
      if (hit) out.push(`${man}: ${path} (.stignore: ${hit})`);
    }
  }
  return out;
}

/**
 * A launcher in bin/ points at what it runs (slot Bin_082_Bin: `bin/<Task>.cmd` for the VM, `bin/<name>.cmd <stage>` run by
 * hand, a lane into pipelines/). It is stale when a repo path it calls is gone — a task renamed or retired, a script moved:
 * the launcher still looks fine and fails the day someone runs it. Its NAME is free (a stage launcher `weekly.cmd` runs
 * tasks/FA_Weekly_SalesReport/pipeline/ by design); an external program (caddy.exe) is not a repo path.
 */
export function binLauncherFindings(root: string): string[] {
  const out: string[] = [];
  for (const f of files(join(root, "bin")).filter((n) => /\.(cmd|bat|sh|ps1)$/i.test(n))) {
    const text = readText(join(root, "bin", f)) ?? "";
    const missing = new Set<string>();
    for (const line of text.split(/\r?\n/)) {
      if (/^\s*(@?rem\b|::|#)/i.test(line)) continue; // a comment names history, not a call
      for (const m of line.matchAll(/(?:^|[\\/"'\s=(])((?:tasks|pipelines|scripts|bin)[\\/][^\s"'%&|<>()^]+)/gi)) {
        const p = m[1].replace(/\\/g, "/").replace(/\/+$/, "");
        const parts = p.split("/");
        // a task folder must exist; a path with an extension must exist as a file; a bare folder must exist
        const target = parts[0].toLowerCase() === "tasks" ? parts.slice(0, 2).join("/") : p;
        // Windows runs `bin\turnover` as bin\turnover.cmd (PATHEXT): a launcher named without its extension is present
        // (Dept_OPS 2026-10-19: the usage lines of bin/turnover.cmd and bin/vault.cmd were reported as missing calls)
        const viaExt = !extname(target) && [".cmd", ".bat", ".ps1", ".sh", ".py"].some((e) => existsSync(join(root, target + e)));
        if (!existsSync(join(root, target)) && !viaExt) missing.add(target);
      }
    }
    if (missing.size) out.push(`bin/${f}: calls ${[...missing].slice(0, 3).join(", ")}, not in the repo`);
  }
  return out;
}

const SHARED_SLOTS = ["sources", "config", "queries"];
const TEXT_EXT = new Set([".md", ".py", ".ps1", ".psm1", ".sql", ".yaml", ".yml", ".json", ".cmd", ".bat", ".ts", ".js", ".cjs", ".mjs", ".txt", ".toml", ".ini", ".cfg", ".dax", ".tmdl", ".m"]);

/** Text files under a folder (recursive, skipping dot folders), repo-relative. */
function textFilesUnder(root: string, sub: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    let ents;
    try {
      ents = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "__pycache__") continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (TEXT_EXT.has(extname(e.name).toLowerCase())) out.push(rel(root, p));
    }
  };
  walk(join(root, sub));
  return out;
}

/**
 * The shared slots (sources/ · config/ · queries/) hold what two cases or more use. A file named after one case, or read
 * from one case only (its folder and its launcher), is that case's config: it lives in tasks/<case>/.
 */
export function sharedSlotFindings(root: string): string[] {
  const tasks = taskNames(root);
  if (!tasks.length) return [];
  const shared = SHARED_SLOTS.flatMap((s) => files(join(root, s)).filter((f) => f !== "README.md").map((f) => `${s}/${f}`));
  if (!shared.length) return [];
  // who mentions each shared file: the case owning the reader (tasks/<case>/** · bin/<case>.cmd), or "repo" for any other reader
  const readers = [
    ...tasks.flatMap((t) => textFilesUnder(root, `tasks/${t}`).map((f) => ({ f, owner: t }))),
    ...files(join(root, "bin")).map((f) => ({ f: `bin/${f}`, owner: tasks.find((t) => f.startsWith(t + ".")) ?? "repo" })),
    ...["scripts", "reports", "pipelines"].flatMap((s) => textFilesUnder(root, s).map((f) => ({ f, owner: "repo" }))),
    ...SHARED_SLOTS.flatMap((s) => textFilesUnder(root, s).map((f) => ({ f, owner: "repo" }))),
  ];
  const texts = new Map(readers.map((r) => [r.f, readText(join(root, r.f)) ?? ""]));
  const out: string[] = [];
  for (const s of shared) {
    const name = basename(s);
    const stem = name.slice(0, name.length - extname(name).length);
    const named = tasks.find((t) => stem === t || stem.startsWith(t + "_") || stem.startsWith(t + "."));
    if (named) {
      out.push(`${s}: named after ${named} — move it into tasks/${named}/`);
      continue;
    }
    const owners = new Set(readers.filter((r) => r.f !== s && texts.get(r.f)!.includes(name)).map((r) => r.owner));
    if (owners.size === 1) {
      const only = [...owners][0];
      if (only !== "repo") out.push(`${s}: read by ${only} only — move it into tasks/${only}/`);
    }
  }
  return out;
}

/** A ledger's first heading names the repo it belongs to (`# <Repo> — …`); the name of the repo before a rename stays wrong. */
export function ledgerTitleFindings(root: string): string[] {
  const hp = harnessPathsAt(root);
  const repo = basename(root).toLowerCase();
  const candidates = [hp.todo, hp.changes, join(hp.plan, "00_overview.md"), join(root, "content", "README.md")];
  const out: string[] = [];
  for (const f of candidates) {
    const text = readText(f);
    if (text === null) continue;
    const h1 = /^#\s+(.+)$/m.exec(text)?.[1] ?? "";
    // only a heading that opens with a repo-shaped identifier and a dash names a repo: one with "_" or a camel hump
    // (PBI_FIN · SasinFlow). "INDEX các case HR — …" and "00 — Tổng quan" name none.
    const m = /^`?([A-Za-z][\w.-]*)`?\s+[—–-]\s/.exec(h1);
    if (m && /_|[a-z][A-Z]/.test(m[1]) && m[1].toLowerCase() !== repo) out.push(`${rel(root, f)}: heading names "${m[1]}", the repo is ${basename(root)}`);
  }
  return out;
}

/** The same heading twice in the TODO ledger: two lists of one kind, one of them left behind. */
export function ledgerDuplicateHeadings(root: string): string[] {
  const f = harnessPathsAt(root).todo;
  const text = readText(f);
  if (text === null) return [];
  const seen = new Map<string, number>();
  let fence = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^```/.test(line)) fence = !fence;
    const m = !fence && /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (m) seen.set(m[2], (seen.get(m[2]) ?? 0) + 1);
  }
  return [...seen].filter(([, n]) => n > 1).map(([h, n]) => `${rel(root, f)}: "${h}" ×${n}`);
}

/**
 * Names of the harness before the folder harness (and of the department standard dissolved into HS parts), with where
 * each went. A repo on the folder harness that still names one points a reader at nothing; `paths check` misses them
 * because they carry no "/" and no extension.
 */
export const RETIRED_HARNESS_NAMES: Record<string, string> = {
  DEPT_STANDARD: "the HS parts (laws · slots · skills); the old file is in the archive of the region manager",
  "01_CONSTITUTION": `${SHELF.constitution}/ (one frame per article, the repo writes ${CONS_REPO_FILE})`,
  "02_RULES": `${SHELF.rules}/`,
  "03_STRUCTURE": `${SHELF.structure}/`,
  "04_SKILLS": `${SHELF.skills}/INDEX.md`,
  "05_TODO": LEDGER.todo,
  "06_CHANGES": LEDGER.changes,
  "docs/hooks/": "the rule folder that owns the hook",
};
const RETIRED_RE = /(?<![\w/])(DEPT_STANDARD|01_CONSTITUTION|02_RULES|03_STRUCTURE|04_SKILLS|05_TODO|06_CHANGES)(?!\w)|docs\/hooks\//g;
/** The block `zemory sync` keeps in the TODO ledger (docs/kit-sync.ts); same markers, kept here to avoid an import cycle. */
const STANDARD_TODO_BLOCK = /<!-- zemory:standard-todo:start[\s\S]*?<!-- zemory:standard-todo:end -->/g;
const SCAN_SKIP_DIRS = new Set([".git", "node_modules", "__pycache__", "attic", "data", "docs_template", "dist", "build", "external", "vendor"]);

/** Repo files the harness ships (skill and structure installs, the host's skill copies): changed in the store, not here. */
function shippedFiles(root: string, agent: string): Set<string> {
  const out = new Set<string>();
  for (const shelf of [SHELF.skills, SHELF.structure] as const) for (const p of listParts(agent, shelf)) for (const f of installsOf(p)) out.add(f);
  for (const s of listStructures(agent)) for (const f of installsOf(s)) out.add(f);
  return out;
}

/**
 * The text the repo writes itself, as [repo path, text]: its sources, plans, specs, READMEs, the Cons.md of each frame and its
 * TODO — not what HS ships (assembled shelf parts, installed tools, host skill copies), not history (archive, attic, the
 * CHANGES ledger, dated findings), not data. The block `zemory sync` keeps in the TODO is the report, so it is cut out.
 * Folder harness only: on a file harness the old names are still the living files.
 */
export function ownTextFiles(root: string): [string, string][] {
  const hp = harnessPathsAt(root);
  if (!isFolderHarness(hp.agent)) return [];
  const agentRel = rel(root, hp.agent);
  const archiveRel = rel(root, archiveDirOf(hp.agent));
  const shelves = [SHELF.rules, SHELF.constitution, SHELF.structure, SHELF.skills].map((s) => rel(root, shelfDir(hp.agent, s)));
  const shipped = shippedFiles(root, hp.agent);
  const skillsRel = rel(root, hp.skills);
  const out: [string, string][] = [];
  const walk = (d: string): void => {
    let ents;
    try {
      ents = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = join(d, e.name);
      const r = rel(root, p);
      if (e.isDirectory()) {
        if (SCAN_SKIP_DIRS.has(e.name) || e.name.startsWith(".") && e.name !== ".claude") continue;
        if (r === archiveRel || r === skillsRel || r === `${agentRel}/.harness-state`) continue;
        walk(p);
        continue;
      }
      if (!TEXT_EXT.has(extname(e.name).toLowerCase()) || shipped.has(r)) continue;
      // a dated findings file of a case (tasks/<case>/<YYYY-MM-DD>_<slug>.md, slot Tasks_117) is a record of its day, like the
      // CHANGES ledger: the names it quotes were the living files then
      if (/^tasks\/[^/]+\/\d{4}-\d{2}-\d{2}_[^/]*\.md$/.test(r)) continue;
      // inside the harness the repo writes its Cons.md files and its TODO; every other shelf file is assembled from the store,
      // and the CHANGES ledger is history (it names what was moved where)
      const inShelf = shelves.some((s) => r === s || r.startsWith(s + "/"));
      if (inShelf && e.name !== CONS_REPO_FILE) continue;
      if (r.startsWith(agentRel + "/") && !inShelf && r !== rel(root, hp.todo)) continue;
      try {
        if (statSync(p).size > 1_000_000) continue;
      } catch {
        continue;
      }
      // the standard block `zemory sync` writes into the TODO ledger quotes these findings: it is the report, not the repo's text
      out.push([r, (readText(p) ?? "").replace(STANDARD_TODO_BLOCK, "")]);
    }
  };
  walk(root);
  return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

// `files`: conform reads the repo's own text once and hands it to every check that scans it (each walk read every text
// file of the repo — measured 2026-10-21: 99 s of a 369 s region sync)
export function retiredNameFindings(root: string, files: [string, string][] = ownTextFiles(root)): string[] {
  const hits: string[] = [];
  for (const [r, text] of files) {
    const names = new Set<string>();
    for (const m of text.matchAll(RETIRED_RE)) names.add(m[1] ?? "docs/hooks/");
    if (names.size) hits.push(`${r}: ${[...names].join(" · ")}`);
  }
  return hits;
}

/** The region's real values (<manager>/data/region/values.json, slot Data_140): the marker's owner, or the repo itself. */
export function regionValues(root: string): Record<string, unknown> {
  const own = join(root, "data", "region", "values.json");
  let file = existsSync(own) ? own : "";
  if (!file) {
    const owner = (readMarker(root)?.data as { owner?: unknown } | undefined)?.owner;
    const at = typeof owner === "string" && owner ? findRegionRepo(owner, root) : null;
    if (at && existsSync(join(at, "data", "region", "values.json"))) file = join(at, "data", "region", "values.json");
  }
  try {
    return file ? (JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, "")) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** `files: "prose"` — the entry is about what an agent is told (an instruction in a .md), not about a task's own code: the
 *  desktop app's /api/vault in a pipeline is not fixed by the agent's probing tool (Dept_IT 2026-10-19). */
interface SupersededFact { old: string; now: string; roles?: string[]; level?: "advisory"; files?: "prose" }

/**
 * A fact of the region that changed — a server renamed, an app replaced, a root folder moved — listed once in region values
 * (`superseded_facts`: [{ old, now, roles? }]) and caught in the repo's own text everywhere it still stands (2026-10-19: a
 * renamed task server and a replaced query app kept living in three departments' constitutions until a person read them).
 * `old` is matched as a whole word that is not a path segment (`_Legacy\SRV-BI\` is the name of a mirror folder, not the fact);
 * `roles` limits an entry to repos whose template has that role (the app itself still names its own executable). An entry
 * marked `level: "advisory"` is a name that also lives on in history ("the legacy ETL ran on SRV-BI"): it is listed for the
 * repo to look at, not blocking. An instruction (an executable, an endpoint, a root path) stays blocking.
 */
export function supersededFactFindings(root: string, files?: [string, string][]): { blocking: string[]; advisory: string[] } {
  const out = { blocking: [] as string[], advisory: [] as string[] };
  const v = regionValues(root).superseded_facts;
  const facts = (Array.isArray(v) ? v : []) as SupersededFact[];
  const role = repoRole(root)?.name ?? "";
  const live = facts.filter((f) => f && typeof f.old === "string" && f.old && (!Array.isArray(f.roles) || f.roles.includes(role)));
  if (!live.length) return out;
  const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // not a path segment on either side: `_Legacy\SRV-BI\PWBI` and `SRV-BI/PWBI` name a mirror folder, not the fact
  const res = live.map((f) => ({ f, re: new RegExp(`(?<![\\w\\\\/.-])${esc(f.old)}(?![\\w\\\\/-])`, "i") }));
  for (const [r, text] of files ?? ownTextFiles(root)) {
    for (const lvl of ["blocking", "advisory"] as const) {
      const found = res
        .filter((x) => (x.f.level === "advisory" ? "advisory" : "blocking") === lvl && (x.f.files !== "prose" || /\.md$/i.test(r)) && x.re.test(text))
        .map((x) => `${x.f.old} → ${x.f.now}`);
      if (found.length) out[lvl].push(`${r}: ${found.join(" · ")}`);
    }
  }
  return out;
}

/**
 * A repo whose template says its git is the local backup (role git: local — the department repos) has no remote: a remote
 * there is the first step to a push nobody wants. A missing remote is never a finding for such a repo. Fail-open without git.
 */
export function gitRemoteFindings(root: string): string[] {
  if (repoRole(root)?.git !== "local" || !existsSync(join(root, ".git"))) return [];
  try {
    const out = execFileSync("git", ["remote", "-v"], { cwd: root, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    return [...new Set(out.split(/\r?\n/).filter(Boolean).map((l) => l.split(/\s+/).slice(0, 2).join(" ")))];
  } catch {
    return [];
  }
}

/** How long a used one-use flag may be retried (guard-gen FLAG_RETRY_MS); past it the flag is dead. */
const FLAG_RETRY_MS = 90 * 1000;
/** How long an unused flag stays an approval (guard-gen FLAG_FRESH_MS); past it the guard deletes it and blocks. */
const FLAG_FRESH_MS = 15 * 60 * 1000;

/**
 * One-use flags (`.allow-*`) left in the state folder: used and past the retry window, or never used and past the fresh
 * window. Either is revoked (the guard deletes it and blocks at the next ask), so it opens nothing — but a file that reads
 * like an open permission misleads anyone who lists the folder. Returns the paths of dead flags.
 */
export function deadFlagFindings(root: string, stateDir: string, now = Date.now()): string[] {
  const out: string[] = [];
  for (const f of files(stateDir).filter((n) => n.startsWith(".allow-"))) {
    const p = join(stateDir, f);
    const m = /ZEMORY-USED [0-9a-f]+ ([0-9]+)/.exec(readText(p) ?? "");
    let mtime: number;
    try {
      mtime = statSync(p).mtimeMs;
    } catch {
      continue;
    }
    // unused, or created again after use (a new approval): alive while fresh
    if (!m || mtime > Number(m[1]) + 2000) {
      if (now - mtime > FLAG_FRESH_MS) out.push(rel(root, p));
      continue;
    }
    if (now - Number(m[1]) >= FLAG_RETRY_MS) out.push(rel(root, p));
  }
  return out;
}
