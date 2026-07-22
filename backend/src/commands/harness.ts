// `zemory init|sync|migrate|doctor|archive|validate|setup|structure|grill|reindex`
// — the per-project docs harness lifecycle.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findProjectRoot, loadContext } from "../core/config.js";
import { createRuntime } from "../core/runtime.js";
import { ensureHarness, freshHarness } from "../docs/adopt.js";
import { archiveChanges } from "../docs/archive.js";
import { runCheck } from "../checks.js";
import { gatherStatus } from "../status.js";
import { validate } from "../docs/validate.js";
import { importDoc } from "../docs/plan.js";
import { importChangelog } from "../docs/changelog.js";

export function cmdInit(args: string[]): void {
  if (args.includes("--fresh")) {
    const r = freshHarness(process.cwd());
    if (r.renamedTo) console.log(`zemory init --fresh — kept old docs → ${r.renamedTo}`);
    if (r.renamedPlanTo) console.log(`  kept old plan → ${r.renamedPlanTo}`);
    console.log(
      `  scaffolded fresh: added ${r.added.length} doc(s)${r.createdConfig ? " + .harness.json" : ""}.`,
    );
    return;
  }
  const r = ensureHarness(process.cwd());
  // --non-app: this project follows the §7 standard (BI/data/docs/design) —
  // record it so validate/structure check the right requirements.
  if (args.includes("--non-app")) {
    const cfgPath = join(process.cwd(), "docs", ".harness.json");
    try {
      const cfg = JSON.parse(readFileSync(cfgPath, "utf8")) as Record<string, unknown>;
      if (cfg.profile !== "non-app") {
        cfg.profile = "non-app";
        writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
      }
      console.log('  profile: "non-app" (03_STRUCTURE §7 — BI/data/docs/design)');
    } catch {
      console.log("  ⚠ could not set profile in docs/.harness.json — add `\"profile\": \"non-app\"` by hand");
    }
  }
  const parts: string[] = [];
  if (r.createdConfig) parts.push("created .harness.json");
  parts.push(`added ${r.added.length} doc(s)`);
  if (r.present.length) parts.push(`kept ${r.present.length} existing (not overwritten)`);
  console.log(`zemory init — ${parts.join(", ")}.`);
  if (r.added.length) console.log(`  + ${r.added.join(", ")}`);
}

// Reconcile guide now lives in docs/agent/03_STRUCTURE.md §8 (single source). Print a short pointer.
export function cmdMigrate(): void {
  console.log("zemory migrate — reconcile docs cũ về chuẩn (App KHÔNG tự sửa; agent làm).");
  console.log("Các bước đầy đủ: docs/agent/03_STRUCTURE.md §8. Tóm tắt:");
  console.log("  1. zemory docs ls          — xem cái nào trùng/thừa (trong search index)");
  console.log("  2. zemory plan show <#id>  — đọc nội dung TRƯỚC khi quyết");
  console.log("  3. gộp todo → 05_TODO; XOÁ THẲNG file .md trùng/thừa (HỎI user nếu còn nội dung)");
  console.log("  4. zemory reindex → zemory doctor (xanh = xong)");
}

export function cmdSync(): void {
  const root = findProjectRoot() ?? process.cwd();
  const r = ensureHarness(root);
  console.log(`zemory sync — ${root}`);
  if (r.createdConfig) console.log("  + created .harness.json");
  if (r.added.length) console.log(`  + added missing: ${r.added.join(", ")}`);
  if (r.present.length) console.log(`  · kept existing: ${r.present.join(", ")}`);
  if (r.needsReconcile) {
    console.log("  ⚠ existing docs are non-standard — NOT auto-modified.");
    console.log("    → AGENT reconcile (các bước: docs/agent/03_STRUCTURE.md §8, hoặc `zemory migrate`):");
    console.log("      zemory docs ls  (xem index) · xoá thẳng file .md trùng/obsolete (00_INDEX, 02_CONTEXT…)");
    console.log("      zemory reindex  (dựng lại search index từ .md)");
  } else if (!r.added.length && !r.createdConfig) {
    console.log("  ✓ already in sync (nothing to add).");
  }
}

export async function cmdDoctor(): Promise<void> {
  const s = await gatherStatus();
  if (!s.project.connected) {
    console.log("zemory doctor: ✗ not connected — no .harness.json found.");
    console.log("  run `zemory init` (or `zemory sync`) in your project root.");
    process.exitCode = 1;
    return;
  }
  console.log(`zemory doctor — project: ${s.project.name}`);
  console.log(`  ✓ connected · ${s.project.root} · docs: ${s.project.docs}`);
  console.log(
    `  setup: ${s.setup.complete ? "✓ done" : `○ ${s.setup.detail} (first-time → \`zemory setup\`)`}`,
  );

  const missing = s.docs.filter((d) => !d.ok);
  console.log(`  docs: ${missing.length === 0 ? "✓ all present" : `✗ ${missing.length} missing (run \`zemory sync\`)`}`);
  for (const d of missing) console.log(`      ✗ ${d.file}`);

  console.log(
    `  plan: ${
      s.plan.needsReconcile
        ? `⚠ ${s.plan.detail} → agent reconcile (docs/agent/03_STRUCTURE.md §8 / \`zemory migrate\`)`
        : s.plan.exists
          ? `✓ ${s.plan.detail}`
          : "○ none yet"
    }`,
  );

  let failed = missing.length > 0 || !s.setup.complete;
  try {
    const runtime = createRuntime(loadContext(s.project.root!));
    console.log("  providers:");
    for (const provider of runtime.registry.all()) {
      console.log(`    ✓ ${provider.provides} → ${provider.name}`);
    }
  } catch (error) {
    failed = true;
    console.log(`  providers: ✗ ${error instanceof Error ? error.message : "invalid configuration"}`);
  }

  console.log("  features (tested):");
  for (const f of s.features) {
    const c = await runCheck(f.key);
    const mark = c.state === "on" ? "✓" : c.state === "off" ? "✗" : "○";
    console.log(`    ${mark} [${f.group}] ${f.label} — ${c.detail}`);
    if (!c.ok) failed = true;
  }
  if (failed) process.exitCode = 1;
}

export function cmdArchive(): void {
  const root = findProjectRoot();
  if (!root) {
    console.log("zemory archive: not connected — run `zemory init` first.");
    process.exitCode = 1;
    return;
  }
  const ctx = loadContext(root);
  const r = archiveChanges(ctx);
  if (r.moved === 0) {
    console.log(
      `zemory archive: nothing to do (06_CHANGES.md = ${r.activeLines} lines, under threshold).`,
    );
  } else {
    console.log(`zemory archive: marked ${r.moved} old entr(ies) archived in global_memory.db.`);
    console.log(`  active 06_CHANGES.md now ${r.activeLines} lines (history remains searchable).`);
  }
}

export function cmdValidate(): void {
  const root = findProjectRoot();
  if (!root) {
    console.log("zemory validate: not connected — run `zemory init` first.");
    process.exitCode = 1;
    return;
  }
  const rep = validate(loadContext(root));
  console.log(`zemory validate — docs harness (${root})`);
  if (!rep.issues.length) {
    console.log("  ✓ no issues.");
    return;
  }
  for (const i of rep.issues) {
    const mark = i.level === "error" ? "✗" : i.level === "warn" ? "⚠" : "·";
    console.log(`  ${mark} ${i.msg}`);
  }
  if (!rep.ok) process.exitCode = 1;
}

// AGENTS.md = router thuần (điều hướng). Luật/quy trình sống ở docs/agent/*. Print short install steps + pointer.
export function cmdSetup(): void {
  console.log("zemory setup — cài & dùng:");
  console.log("  1. npm i -g zemory                 — cài global (lệnh `zemory`)");
  console.log("  2. cd <project> && zemory init     — scaffold harness (hoặc `zemory ui` → Setup)");
  console.log("  3. zemory doctor");
  console.log("Điều hướng mở phiên: AGENTS.md ở root. Luật + quy trình (sửa docs · reconcile · grill): docs/agent/* (02_RULES + 03_STRUCTURE §8).");
}

export function cmdStructure(): void {
  console.log(
    [
      "zemory — repo structure standard. FULL spec (per-line tree + routing + convention): docs/agent/03_STRUCTURE.md",
      "",
      "  TWO standards — pick by project type (set `\"profile\"` in docs/.harness.json):",
      "  ① APP (runnable code, default) — §1–6. Required (4): backend/(code) · frontend/ · docs/ · AGENTS.md.",
      "  ② NON-APP (deliverable assets: BI/report · data · docs-only · design, e.g. powerbi_*) — §7.",
      "     Required (3): docs/ · AGENTS.md · ≥1 deliverable (reports/|models/|content/|design/). No backend/frontend.",
      "  Everything else is [opt] — create when the concern exists (never a pile of empty folders).",
      "  6 non-code kinds (never mix): assets=media · resources=bundled-tracked · config=operator-files · data=runtime-gitignored · external=cloned-code · attic=backup.",
      "  3 'connections': api/=you expose · integrations/=external SaaS · store/=DATABASE (remote/cloud/internal). external/=cloned code.",
      "  1 NAME per concern (own standard: store/ not db|models); only a framework may force a name (Next pages/, Django models/).",
      "  Source = git tracked; output / runtime / secret = GITIGNORED.",
      "",
      "  Full per-line tree + routing table + all conventions → docs/agent/03_STRUCTURE.md",
      "  Refactor an app to this → docs/agent/03_STRUCTURE.md §8 (Reconcile)   ·   drift check → `zemory validate`",
      "",
      "docs harness (.md is the SOURCE — file wins; DB doc/section/changelog = derived search index):",
      "  docs/agent/01_CONSTITUTION.md — per-app constitution: architectural invariants (user-owned)",
      "  docs/agent/02_RULES.md      — work rules, generic across projects",
      "  docs/agent/03_STRUCTURE.md  — repo structure standard (+ §8 Reconcile)",
      "  docs/agent/04_SKILLS.md     — playbooks: grill · chốt phiên · reconcile",
      "  docs/agent/05_TODO.md       — backlog",
      "  docs/agent/06_CHANGES.md    — changelog",
      "  docs/plan/*.md              — specs (00_overview + numbered specs)",
      "  ~/.zemory/global_memory.db          — memory (episodic sessions) + derived docs INDEX (rebuilt from .md)",
      "",
      "  Index: `zemory docs ls` · `plan ls` · `plan search` · `changelog ls`.",
    ].join("\n"),
  );
}

export function cmdGrill(): void {
  console.log(
    [
      "zemory grill — interrogate the plan BEFORE building (workflow feature).",
      "",
      "  Rules:",
      "    1. Ask ONE question at a time; wait for the answer.",
      "    2. Each question carries the agent's recommended answer.",
      "    3. Walk every branch of the decision tree; resolve dependencies.",
      "    4. If the codebase/docs answer it, read — don't ask.",
      "    5. Build only when the tree is clean. Record durable decisions.",
    ].join("\n"),
  );
}

export function cmdReindex(): void {
  const root = findProjectRoot() ?? process.cwd();
  const planDir = join(root, "docs", "plan");
  let files: string[] = [];
  try {
    files = readdirSync(planDir).filter((f) => f.endsWith(".md"));
  } catch {
    /* no docs/plan */
  }
  let sections = 0;
  for (const f of files) {
    const r = importDoc(join(planDir, f), join("docs", "plan", f), root, "plan");
    sections += r.sections;
    if (!r.roundTrip) console.log(`  ⚠ ${f} — round-trip diff (cấu trúc lạ; vẫn index)`);
  }
  const chPath = join(root, "docs", "agent", "06_CHANGES.md");
  const ch = existsSync(chPath) ? importChangelog(chPath, root, undefined, { replace: true }) : 0;
  console.log(
    `zemory reindex — ${files.length} plan doc(s) · ${sections} section(s) · ${ch} changelog entr(ies) → search index (đọc .md, KHÔNG ghi ngược).`,
  );
}

// zemory graph — file-level graph queries (plan 13 §9 Phase A/B).
//   impact <file>   ADVISORY blast-radius: importers (direct + transitive) + hub flag.
//   fitness [--gate] deterministic health metrics; --gate exits 1 on failure (CI).

