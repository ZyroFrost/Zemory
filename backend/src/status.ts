// status() — the single data layer behind every status surface (doctor, ui,
// future VSCode extension). It lists zemory's FEATURES (the token-saving
// capabilities) and whether each is working — NOT internal repo/dep names.

import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { CONFIG_FILE, findProjectRoot, loadContext } from "./core/config.js";
import { listKnownProjects, rememberProject } from "./registry.js";

export type FeatureState = "on" | "planned" | "off" | "idle";

export interface FeatureStatus {
  key: string;
  /** Plain-language: what this feature does. */
  label: string;
  /** "token" = token-saver · "workflow" = agent workflow (e.g. grill). */
  group: "token" | "workflow";
  state: FeatureState;
  /** Status line (e.g. "ready", "not built yet"). */
  detail: string;
  /** Longer explanation shown behind the "?" — what it does + why. */
  help: string;
}

export interface StatusReport {
  ts: string;
  /** Project setup layer (foundation) — separate from token-saving features. */
  project: { connected: boolean; name: string | null; root: string | null; docs: string | null };
  docs: { file: string; ok: boolean }[];
  /** Token-saving features layer. */
  features: FeatureStatus[];
  /** Other projects zemory knows about (for the picker). */
  knownProjects: { root: string; name: string }[];
  /** docs/plan conformance signal — when it needs agent reconciliation. */
  plan: { exists: boolean; needsReconcile: boolean; detail: string };
  /** Onboarding signal: is the harness filled (done) or still skeleton (run setup). */
  setup: { complete: boolean; detail: string };
}

/**
 * Plan signal. Plan now lives in global_memory.db (the .md are derived mirrors), so the
 * old overview-index reconcile is gone — we just report whether plan docs exist.
 */
function planSignal(docsDir: string): StatusReport["plan"] {
  const planDir = join(dirname(docsDir), "plan");
  if (!existsSync(planDir)) return { exists: false, needsReconcile: false, detail: "no plan/ yet" };
  const files = readdirSync(planDir).filter((f) => f.endsWith(".md"));
  return { exists: files.length > 0, needsReconcile: false, detail: `${files.length} file(s)` };
}

// Canonical markdown docs the harness expects (the rest — plan/changelog — live
// in global_memory.db and render to mirrors). RULES is the one hand-source doc.
const REQUIRED_DOCS = ["01_RULES.md", "02_TODO.md", "03_CHANGES.md"];

/**
 * zemory's token-saving features. Each `state` flips to "on" as the feature
 * lands. These are CAPABILITIES (what it does for you), not implementation deps.
 */
function listFeatures(): FeatureStatus[] {
  // state "idle" = not yet tested; the real state comes from running checks.
  return [
    { key: "search", group: "token", label: "Find in brain (FTS5)", state: "idle", detail: "—",
      help: "Full-text search (word + Vietnamese trigram) across all stored sessions so the agent finds the exact bit instead of re-reading. `zemory brain search`." },
    { key: "memory", group: "token", label: "Remember across sessions", state: "idle", detail: "—",
      help: "Global brain: recall decisions/gotchas from past sessions of every agent & project, so you don't re-explain. Agent calls recall on demand." },
    { key: "validate", group: "workflow", label: "Validate docs harness", state: "idle", detail: "—",
      help: "Check generated docs, internal links, changelog retention, and supersede bookkeeping. `zemory validate`." },
    { key: "grill", group: "workflow", label: "Grill before build", state: "idle", detail: "—",
      help: "Make the agent interrogate the plan with you (one question at a time) BEFORE building, so it builds the right thing." },
  ];
}

/**
 * Gather the full status report. `rootArg` targets a specific project (from the
 * UI picker); otherwise the launch directory's project is used.
 */
export async function gatherStatus(rootArg?: string): Promise<StatusReport> {
  // Always have a target: explicit picker root → found project → the launch folder.
  const root = rootArg ?? findProjectRoot() ?? process.cwd();
  const connected = existsSync(join(root, CONFIG_FILE));
  const report: StatusReport = {
    ts: new Date().toISOString(),
    project: { connected, name: basename(root), root, docs: "docs/agent" },
    docs: [],
    features: listFeatures(),
    knownProjects: [],
    plan: { exists: false, needsReconcile: false, detail: "—" },
    setup: { complete: false, detail: "not set up" },
  };

  if (connected) {
    rememberProject(root);
    const ctx = loadContext(root);
    report.project.docs = ctx.config.docs;
    report.docs = REQUIRED_DOCS.map((file) => ({
      file,
      ok: existsSync(join(ctx.docsDir, file)),
    }));
    report.plan = planSignal(ctx.docsDir);

    // Onboarding: done when the required docs are present and plan exists.
    const docsOk = report.docs.every((d) => d.ok);
    const complete = docsOk && report.plan.exists;
    report.setup = {
      complete,
      detail: complete ? "done" : !docsOk ? "docs missing → zemory sync" : "no plan yet",
    };
  } else {
    // Not set up yet — show the standard docs as missing so the UI invites Setup.
    report.docs = REQUIRED_DOCS.map((file) => ({ file, ok: false }));
  }
  report.knownProjects = listKnownProjects();

  return report;
}
