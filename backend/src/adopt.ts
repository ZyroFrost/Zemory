// Adopt — idempotent, NON-DESTRUCTIVE harness setup. Used by `init`, `sync`,
// and the UI "Sync docs" button. It ensures .harness.json exists and gap-fills
// MISSING template docs only. It NEVER overwrites an existing file.
//
// Section-level reconciliation (a file exists but is missing parts) needs
// judgment, so it is NOT done here — that is the agent-assisted `migrate` path.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openBrain } from "./brain/db.js";
import { CONFIG_FILE, loadContext } from "./core/config.js";
import type { HarnessConfig } from "./core/types.js";
import { rememberProject } from "./registry.js";

const HERE = dirname(fileURLToPath(import.meta.url));
/** The shared harness STANDARD, shipped with zemory (separate from any project's
 *  docs/). This is what `init`/`sync` scaffold and the UI loads for reference. */
export const TEMPLATE_DIR = join(HERE, "..", "docs_template");

export interface AdoptResult {
  createdConfig: boolean;
  added: string[];
  present: string[];
  docsRel: string;
  /** Existing docs don't match the standard → an agent must reconcile them. */
  needsReconcile: boolean;
}

// The canonical agent docs (DB-source mirrors). Anything else in docs/agent =
// non-standard → flag for agent reconciliation rather than gap-filling (which
// would create duplicates). 01_CONSTITUTION (2026-07-14) is the per-app
// supreme layer — each app's own architectural invariants (like Spec Kit's
// constitution.md), read BEFORE the generic working rules.
const STANDARD_AGENT = ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_TODO.md", "05_CHANGES.md"];

// Projects adopted the harness under two older numberings:
//   gen-1 (pre 2026-07-09): 01_RULES / 02_TODO / 03_CHANGES (no STRUCTURE doc)
//   gen-2 (pre 2026-07-14): 01_RULES / 02_STRUCTURE / 03_TODO / 04_CHANGES
// The constitution insert (2026-07-14) shifted everything: RULES→02,
// STRUCTURE→03, TODO→04, CHANGES→05. A rename is purely mechanical (same
// content, same role) — do it automatically so old projects still gap-fill
// cleanly instead of being permanently flagged non-standard. Every target
// name is brand-new (never used by any earlier generation), so the renames
// can run in any order without collisions; the exists-guard below still
// protects the odd folder that carries two generations of the same doc.
const LEGACY_RENAME: Record<string, string> = {
  "04_CHANGES.md": "05_CHANGES.md",
  "03_CHANGES.md": "05_CHANGES.md", // gen-1
  "03_TODO.md": "04_TODO.md",
  "02_TODO.md": "04_TODO.md", // gen-1
  "02_STRUCTURE.md": "03_STRUCTURE.md",
  "01_RULES.md": "02_RULES.md",
};

const DEFAULT_CONFIG: HarnessConfig = {
  docs: "docs/agent",
  adapters: { memory: "global", search: "keyword" },
  thresholds: { changes_lines: 400, changes_keep: 240 },
};

/**
 * Ensure the project has a harness: create .harness.json if absent, then add
 * any template docs that are missing. Existing files are kept untouched.
 */
export function ensureHarness(projectRoot: string): AdoptResult {
  const projectName = basename(projectRoot);
  // Config lives INSIDE docs/ (docs/.harness.json) so the project root stays clean.
  const configPath = join(projectRoot, CONFIG_FILE);
  let createdConfig = false;
  if (!existsSync(configPath)) {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
    createdConfig = true;
  }
  const config = loadContext(projectRoot).config;
  const docsRel = config.docs ?? DEFAULT_CONFIG.docs;
  const docsDir = join(projectRoot, docsRel);
  const planDir = join(dirname(docsDir), "plan");

  mkdirSync(docsDir, { recursive: true });
  mkdirSync(planDir, { recursive: true });

  // MERGE any legacy plan/planning folder INTO docs/plan: move each file that
  // isn't already there (never overwrite), then remove the legacy dir if empty.
  // Handles the case where docs/plan already exists but docs/planning still has
  // old content — so the old plan files actually get synced in.
  for (const legacy of [
    join(dirname(docsDir), "planning"), // docs/planning (legacy)
    join(projectRoot, "plan"),
    join(projectRoot, "planning"),
  ]) {
    if (!existsSync(legacy) || legacy === planDir) continue;
    for (const file of readdirSync(legacy)) {
      const dst = join(planDir, file);
      if (!existsSync(dst)) renameSync(join(legacy, file), dst);
    }
    try {
      if (readdirSync(legacy).length === 0) rmdirSync(legacy);
    } catch {
      /* leave non-empty legacy dir (name conflicts) for the agent to resolve */
    }
  }

  const added: string[] = [];
  const present: string[] = [];
  const fill = (srcDir: string, destDir: string, prefix: string) => {
    if (!existsSync(srcDir)) return;
    for (const file of readdirSync(srcDir)) {
      const target = join(destDir, file);
      if (existsSync(target)) {
        present.push(prefix + file); // NEVER overwrite
        continue;
      }
      const content = readFileSync(join(srcDir, file), "utf8").replace(/<PROJECT>/g, projectName);
      writeFileSync(target, content);
      added.push(prefix + file);
    }
  };

  // Normalize legacy filenames first (mechanical rename, same content) so an
  // old-numbered project doesn't get permanently flagged non-standard below.
  // These docs are DB-source (rendered from global_memory.db by project_root +
  // path) — renaming the file alone would leave the DB row pointing at a path
  // that no longer exists, so the doc.path row moves too, in the same step.
  if (existsSync(docsDir)) {
    const renamed: Array<[string, string]> = [];
    for (const [oldName, newName] of Object.entries(LEGACY_RENAME)) {
      const oldPath = join(docsDir, oldName);
      const newPath = join(docsDir, newName);
      if (existsSync(oldPath) && !existsSync(newPath)) {
        renameSync(oldPath, newPath);
        renamed.push([oldName, newName]);
      }
    }
    if (renamed.length > 0) {
      const db = openBrain();
      for (const [oldName, newName] of renamed) {
        db.prepare(
          `UPDATE doc SET path=? WHERE project_root=? AND path=?
             AND NOT EXISTS (SELECT 1 FROM doc WHERE project_root=? AND path=?)`,
        ).run(join(docsRel, newName), projectRoot, join(docsRel, oldName), projectRoot, join(docsRel, newName));
      }
      db.close();
    }
  }

  // App = mechanical only. Decide scaffold vs flag-for-agent:
  //   • empty docs           → scaffold the standard template (fresh).
  //   • only standard files  → gap-fill any missing standard ones (safe).
  //   • non-standard present → DON'T touch — flag needsReconcile; the agent
  //     reads AGENTS.md §5 and reconciles to standard
  //     (docs sync → rm dupes → render). Avoids the duplicate mess.
  const agentMd = existsSync(docsDir) ? readdirSync(docsDir).filter((f) => f.endsWith(".md")) : [];
  const nonStandard = agentMd.filter((f) => !STANDARD_AGENT.includes(f));
  let needsReconcile = false;
  if (agentMd.length === 0) {
    fill(join(TEMPLATE_DIR, "agent"), docsDir, ""); // fresh scaffold
    fill(join(TEMPLATE_DIR, "plan"), planDir, "plan/");
  } else if (nonStandard.length === 0) {
    fill(join(TEMPLATE_DIR, "agent"), docsDir, ""); // all-standard → gap-fill missing only
  } else {
    needsReconcile = true; // existing non-standard docs → agent must reconcile
    for (const f of agentMd) present.push(f);
  }

  // Root entry: ONLY AGENTS.md (thin — setup desc + pointer into docs/). Nothing
  // else lives at root; the whole harness is contained in docs/.
  const agentsSrc = join(TEMPLATE_DIR, "AGENTS.md");
  const agentsDst = join(projectRoot, "AGENTS.md");
  if (existsSync(agentsSrc)) {
    const fresh = readFileSync(agentsSrc, "utf8").replace(/<PROJECT>/g, projectName);
    if (!existsSync(agentsDst)) {
      writeFileSync(agentsDst, fresh);
      added.push("AGENTS.md");
    } else {
      const cur = readFileSync(agentsDst, "utf8");
      // Refresh ONLY our own generated file (marker comment); never a user-authored one.
      if (cur.startsWith("<!-- zemory") && cur !== fresh) {
        writeFileSync(agentsDst, fresh);
        added.push("AGENTS.md (refreshed)");
      } else {
        present.push("AGENTS.md");
      }
    }
  }

  rememberProject(projectRoot);
  return { createdConfig, added, present, docsRel, needsReconcile };
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export interface FreshResult extends AdoptResult {
  renamedTo: string | null;
  renamedPlanTo: string | null;
}

/**
 * Fresh adopt (option C): if the docs dir already has content, RENAME it aside
 * to `<docs>.old-<timestamp>` (nothing lost), then scaffold a clean standard set.
 * Use when you want a clean standard start but keep the originals around.
 */
export function freshHarness(projectRoot: string): FreshResult {
  let docsRel = DEFAULT_CONFIG.docs;
  const configPath = join(projectRoot, CONFIG_FILE);
  if (existsSync(configPath)) {
    docsRel = loadContext(projectRoot).config.docs ?? docsRel;
  }
  const docsDir = join(projectRoot, docsRel);
  const planDir = join(dirname(docsDir), "plan");

  let renamedTo: string | null = null;
  let renamedPlanTo: string | null = null;
  const suffix = stamp();
  if (existsSync(docsDir) && readdirSync(docsDir).length > 0) {
    renamedTo = `${docsDir}.old-${suffix}`;
    renameSync(docsDir, renamedTo);
  }
  if (existsSync(planDir) && readdirSync(planDir).length > 0) {
    renamedPlanTo = `${planDir}.old-${suffix}`;
    renameSync(planDir, renamedPlanTo);
  }
  const r = ensureHarness(projectRoot);
  return { ...r, renamedTo, renamedPlanTo };
}
