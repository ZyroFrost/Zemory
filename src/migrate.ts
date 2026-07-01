// migrate — the MECHANICAL half of brownfield adopt. Scans an existing docs
// dir and reports what maps to the standard roles, what's missing, and which
// non-standard files are candidates to fold in. It changes NOTHING.
//
// The judgment half (read all docs, propose a refactor, ask, merge duplicates,
// preserve every original) is driven by the agent following the reconcile
// guide — see AGENTS.md §5.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { CONFIG_FILE } from "./core/config.js";
import type { HarnessConfig } from "./core/types.js";

const STANDARD = ["01_RULES.md", "02_TODO.md", "03_CHANGES.md"];

export interface MigrationReport {
  docsDir: string;
  roles: { file: string; present: boolean }[];
  extras: { file: string; guessRole: string | null }[];
  /** Plan = detailed content (the "book"). Detect existing to fold into docs/plan. */
  plan: { hasPlanDir: boolean; rootPlan: string | null; specs: string[] };
}

const SPEC_RE = /architecture|design|spec|plan|roadmap|contract|vision/i;

/** Heuristic: guess which standard role a non-standard file might map to. */
function guessRole(name: string): string | null {
  const n = name.toLowerCase();
  if (/change|log|history/.test(n)) return "03_CHANGES.md";
  if (/todo|backlog|task/.test(n)) return "02_TODO.md";
  if (/rule|policy|convention|agent/.test(n)) return "01_RULES.md";
  return null;
}

export function analyzeMigration(projectRoot: string): MigrationReport | null {
  let docsRel = "docs/agent";
  const cfgPath = join(projectRoot, CONFIG_FILE);
  if (existsSync(cfgPath)) {
    docsRel = (JSON.parse(readFileSync(cfgPath, "utf8")) as HarnessConfig).docs ?? docsRel;
  }
  const docsDir = join(projectRoot, docsRel);
  const files = existsSync(docsDir)
    ? readdirSync(docsDir).filter((f) => f.endsWith(".md"))
    : [];

  // Plan (detailed content) detection: docs/plan, or a top-level plan/ / planning/ (legacy),
  // plus spec-like .md at the project root (ARCHITECTURE/DESIGN/SPEC/...).
  const hasPlanDir = existsSync(join(dirname(docsDir), "plan"));
  const rootPlan = ["plan", "planning"]
    .map((d) => join(projectRoot, d))
    .find((p) => existsSync(p)) ?? null;
  const rootSpecs = existsSync(projectRoot)
    ? readdirSync(projectRoot).filter((f) => f.endsWith(".md") && SPEC_RE.test(f))
    : [];

  return {
    docsDir,
    roles: STANDARD.map((f) => ({ file: f, present: files.includes(f) })),
    extras: files
      .filter((f) => !STANDARD.includes(f))
      .map((f) => ({ file: f, guessRole: guessRole(f) })),
    plan: { hasPlanDir, rootPlan, specs: rootSpecs },
  };
}
