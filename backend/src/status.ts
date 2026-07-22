// status() — the single data layer behind every status surface (doctor, ui,
// future VSCode extension). It lists zemory's FEATURES (the token-saving
// capabilities) and whether each is working — NOT internal repo/dep names.

import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { CONFIG_FILE, findProjectRoot, loadContext } from "./core/config.js";
import { type KnownProject, listKnownProjects, rememberProject } from "./registry.js";
import { tr } from "./settings.js";

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
  /** Other projects zemory knows about (for the picker); pinned first, then recent. */
  knownProjects: KnownProject[];
  /** docs/plan conformance signal — when it needs agent reconciliation. */
  plan: { exists: boolean; needsReconcile: boolean; detail: string };
  /** Onboarding signal: is the harness filled (done) or still skeleton (run setup). */
  setup: { complete: boolean; detail: string };
}

/**
 * Plan signal. The .md files ARE the source (file wins); global_memory.db is just the
 * derived search index, so the old overview-index reconcile is gone — we just report
 * whether plan docs exist.
 */
function planSignal(docsDir: string): StatusReport["plan"] {
  const planDir = join(dirname(docsDir), "plan");
  if (!existsSync(planDir)) return { exists: false, needsReconcile: false, detail: tr("chưa có plan/", "no plan/ yet") };
  const files = readdirSync(planDir).filter((f) => f.endsWith(".md"));
  return { exists: files.length > 0, needsReconcile: false, detail: tr(`${files.length} file`, `${files.length} file(s)`) };
}

// Canonical markdown docs the harness expects (the rest — plan/changelog — live
// in global_memory.db and render to mirrors). RULES is the one hand-source doc.
const REQUIRED_DOCS = ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md", "05_TODO.md", "06_CHANGES.md"];

/**
 * zemory's token-saving features. Each `state` flips to "on" as the feature
 * lands. These are CAPABILITIES (what it does for you), not implementation deps.
 */
function listFeatures(): FeatureStatus[] {
  // state "idle" = not yet tested; the real state comes from running checks.
  // ONE row per real capability — 'search' and 'memory' used to run the identical
  // code path and rendered as two rows; merged into one honest memory check.
  return [
    { key: "memory", group: "token", label: tr("Tìm & nhớ trong memory (FTS5)", "Search & recall in memory (FTS5)"), state: "idle", detail: "—",
      help: tr("Memory toàn cục: full-text (word + trigram tiếng Việt) trên mọi phiên đã lưu — agent tìm đúng đoạn và nhớ quyết định/gotcha phiên trước thay vì giải thích lại. `zemory memory search`.", "Global memory: full-text (word + Vietnamese trigram) over every stored session — the agent finds the exact bit and recalls past decisions/gotchas instead of re-explaining. `zemory memory search`.") },
    { key: "validate", group: "workflow", label: tr("Kiểm tra docs harness", "Validate docs harness"), state: "idle", detail: "—",
      help: tr("Kiểm link nội bộ trong docs/, độ dài changelog vs ngưỡng, sổ supersede, và cấu trúc repo theo 03_STRUCTURE. `zemory validate`.", "Check internal links across docs/, changelog length vs threshold, supersede bookkeeping, and repo structure against 03_STRUCTURE. `zemory validate`.") },
    { key: "grill", group: "workflow", label: tr("Grill trước khi build", "Grill before build"), state: "idle", detail: "—",
      help: tr("Bắt agent tra hỏi plan cùng bạn (từng câu một) TRƯỚC khi build, để build đúng thứ cần. Playbook: 04_SKILLS §grill.", "Make the agent interrogate the plan with you (one question at a time) BEFORE building. Playbook: 04_SKILLS §grill.") },
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
    setup: { complete: false, detail: tr("chưa cài đặt", "not set up") },
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
      detail: complete ? tr("xong", "done") : !docsOk ? tr("thiếu docs → zemory sync", "docs missing → zemory sync") : tr("chưa có plan", "no plan yet"),
    };
  } else {
    // Not set up yet — show the standard docs as missing so the UI invites Setup.
    report.docs = REQUIRED_DOCS.map((file) => ({ file, ok: false }));
  }
  report.knownProjects = listKnownProjects();

  return report;
}
