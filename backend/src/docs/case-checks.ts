// Checks of a repo built from cases and tasks (non-app sets: tasks/<case>/ · data/<case>/ · content/README.md · reports/ ·
// bin/ · shared slots sources/ config/ queries/) and of the words the harness left behind after a reshape.
//
// Why they exist (2026-10-19): Dept_FA after its reshape passed conform · validate · paths · doctor, and a hand check still
// found six faults; Dept_HR found four more. Every one was a fact a machine can read: a case on disk the index does not
// list, a status the index and the spec disagree on, a file a VM task keeps on the PC, a launcher no task owns, a ledger
// headed with the repo's old name, ~120 mentions of harness files that no longer exist. Each function returns the samples
// for one conform item; an empty list means clean. Pure reads.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { archiveDirOf, harnessPathsAt } from "../core/config.js";
import { CONS_REPO_FILE, LEDGER, SHELF } from "./harness-names.js";
import { installsOf, isFolderHarness, listParts, listStructures, shelfDir } from "./store.js";

const rel = (root: string, abs: string): string => relative(root, abs).replace(/\\/g, "/");

function readText(p: string): string | null {
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
        if (!existsSync(join(root, target))) missing.add(target);
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
const SCAN_SKIP_DIRS = new Set([".git", "node_modules", "__pycache__", "attic", "data", "docs_template", "dist", "build", "external", "vendor"]);

/** Repo files the harness ships (skill and structure installs, the host's skill copies): changed in the store, not here. */
function shippedFiles(root: string, agent: string): Set<string> {
  const out = new Set<string>();
  for (const shelf of [SHELF.skills, SHELF.structure] as const) for (const p of listParts(agent, shelf)) for (const f of installsOf(p)) out.add(f);
  for (const s of listStructures(agent)) for (const f of installsOf(s)) out.add(f);
  return out;
}

export function retiredNameFindings(root: string): string[] {
  const hp = harnessPathsAt(root);
  if (!isFolderHarness(hp.agent)) return [];
  const agentRel = rel(root, hp.agent);
  const archiveRel = rel(root, archiveDirOf(hp.agent));
  const shelves = [SHELF.rules, SHELF.constitution, SHELF.structure, SHELF.skills].map((s) => rel(root, shelfDir(hp.agent, s)));
  const shipped = shippedFiles(root, hp.agent);
  const skillsRel = rel(root, hp.skills);
  const hits: string[] = [];
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
      const text = readText(p) ?? "";
      const names = new Set<string>();
      for (const m of text.matchAll(RETIRED_RE)) names.add(m[1] ?? "docs/hooks/");
      if (names.size) hits.push(`${r}: ${[...names].join(" · ")}`);
    }
  };
  walk(root);
  return hits.sort();
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
