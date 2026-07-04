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
import { CONFIG_FILE, loadContext } from "./core/config.js";
import type { HarnessConfig } from "./core/types.js";
import { rememberProject } from "./registry.js";

const HERE = dirname(fileURLToPath(import.meta.url));
/** The shared harness STANDARD, shipped with zemory (separate from any project's
 *  docs/). This is what `init`/`sync` scaffold and the UI loads for reference. */
export const TEMPLATE_DIR = join(HERE, "..", "docs-template");

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
// would create duplicates).
const STANDARD_AGENT = ["01_RULES.md", "02_TODO.md", "03_CHANGES.md"];

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
