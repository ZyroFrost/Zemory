#!/usr/bin/env node
// zemory CLI — Phase 1: init, sync, doctor, ui, archive, --version.
// init/sync are NON-DESTRUCTIVE (never overwrite existing docs).

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findProjectRoot, loadContext } from "./core/config.js";
import { createRuntime } from "./core/runtime.js";
import { ensureHarness, freshHarness } from "./docs/adopt.js";
import { archiveChanges } from "./docs/archive.js";
import { runCheck } from "./checks.js";
import { gatherStatus } from "./status.js";
import { startUi } from "./ui.js";
import { handleHook, installCodexHooks, installHooks } from "./memory/capture-hook.js";
import { validate } from "./docs/validate.js";
import { runMcpStdio } from "./mcp.js";
import { importDoc, listDocs, listToc, searchSections, showSection } from "./docs/plan.js";
import { importChangelog, listEntries, searchChangelog } from "./docs/changelog.js";
import { cmdGraph } from "./commands/graph.js";
import { cmdMemory } from "./commands/memory.js";
import { readStdin } from "./commands/_shared.js";
const VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
) as { version: string };

function cmdInit(args: string[]): void {
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
function cmdMigrate(): void {
  console.log("zemory migrate — reconcile docs cũ về chuẩn (App KHÔNG tự sửa; agent làm).");
  console.log("Các bước đầy đủ: docs/agent/03_STRUCTURE.md §8. Tóm tắt:");
  console.log("  1. zemory docs ls          — xem cái nào trùng/thừa (trong search index)");
  console.log("  2. zemory plan show <#id>  — đọc nội dung TRƯỚC khi quyết");
  console.log("  3. gộp todo → 05_TODO; XOÁ THẲNG file .md trùng/thừa (HỎI user nếu còn nội dung)");
  console.log("  4. zemory reindex → zemory doctor (xanh = xong)");
}

function cmdSync(): void {
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

async function cmdDoctor(): Promise<void> {
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

function cmdArchive(): void {
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

function cmdValidate(): void {
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
function cmdSetup(): void {
  console.log("zemory setup — cài & dùng:");
  console.log("  1. npm i -g zemory                 — cài global (lệnh `zemory`)");
  console.log("  2. cd <project> && zemory init     — scaffold harness (hoặc `zemory ui` → Setup)");
  console.log("  3. zemory doctor");
  console.log("Điều hướng mở phiên: AGENTS.md ở root. Luật + quy trình (sửa docs · reconcile · grill): docs/agent/* (02_RULES + 03_STRUCTURE §8).");
}

function cmdStructure(): void {
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

function cmdGrill(): void {
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

async function cmdHook(args: string[]): Promise<void> {
  const sub = args[0];
  if (sub === "install") {
    const scoped = args.includes("--project");
    const hi = args.indexOf("--host");
    const host = hi >= 0 ? args[hi + 1] : "all";
    if (!host || !["all", "claude", "codex"].includes(host)) {
      console.log("usage: zemory hook install [--host all|claude|codex] [--project]");
      process.exitCode = 1;
      return;
    }
    const root = findProjectRoot() ?? process.cwd();
    const where = scoped ? "project" : "global";
    if (host === "all" || host === "claude") {
      const path = scoped ? join(root, ".claude", "settings.json") : undefined;
      const result = installHooks(path);
      const state = result.added.length ? "installed" : "already present";
      console.log(`zemory hook: Claude Stop ${state} (${where}) → ${result.path}`);
    }
    if (host === "all" || host === "codex") {
      const hooksPath = scoped ? join(root, ".codex", "hooks.json") : undefined;
      const configPath = scoped ? join(root, ".codex", "config.toml") : undefined;
      const result = installCodexHooks(hooksPath, configPath);
      const state = result.added.length ? "installed" : "already present";
      console.log(`zemory hook: Codex Stop ${state} (${where}) → ${result.path}`);
      console.log(`  codex_hooks ${result.featureEnabled ? "enabled" : "already enabled"} → ${result.configPath}`);
    }
    console.log("  (capture only — auto-ingest on session end; recall stays agent-driven. Remove the entry to undo.)");
    return;
  }
  if (sub !== "session-start" && sub !== "stop" && sub !== "session-end") {
    console.log("usage: zemory hook <session-start|stop|install>");
    return;
  }
  const raw = await readStdin();
  let payload: Record<string, unknown>;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }
  if (!payload.cwd) payload.cwd = process.cwd();
  const out = handleHook(sub, payload);
  if (out) process.stdout.write(out);
}

async function cmdPlan(args: string[]): Promise<void> {
  const sub = args[0];
  const root = findProjectRoot() ?? process.cwd();

  if (sub === "ls") {
    const docPath = args[1] ? args[1] : join("docs", "plan", "00_overview.md");
    const toc = listToc(docPath, root);
    if (!toc.length) {
      console.log(`zemory plan: no sections for ${docPath} (index rỗng — chạy \`zemory reindex\`; hoặc đọc thẳng file .md).`);
      return;
    }
    console.log(`zemory plan ls — ${docPath}`);
    for (const t of toc) console.log(`  ${"  ".repeat(t.level - 1)}#${t.id} ${t.heading}`);
    return;
  }
  if (sub === "show") {
    const m = showSection(Number(args[1])) as { path: string; level: number; heading: string | null; body: string } | undefined;
    if (!m) {
      console.log(`zemory plan: no section #${args[1]}`);
      return;
    }
    console.log(`#${args[1]} ${m.path} — ${"#".repeat(m.level)} ${m.heading ?? "(preamble)"}`);
    console.log("---");
    console.log(m.body);
    return;
  }
  if (sub === "search") {
    const rest = args.slice(1);
    const all = rest.includes("--all");
    const q = rest.filter((a) => !a.startsWith("--")).join(" ");
    if (!q) {
      console.log("usage: zemory plan search <query> [--all]");
      return;
    }
    const hits = searchSections(q, { project: all ? undefined : root });
    console.log(`zemory plan search — "${q}" (${all ? "all projects" : "this project"})`);
    if (!hits.length) {
      console.log("  no matches.");
      return;
    }
    for (const h of hits) console.log(`  #${h.id} [${h.path}] ${h.heading ?? ""}\n     ${h.snippet}`);
    return;
  }
  console.log(
    [
      "zemory plan <subcommand>   (.md là NGUỒN; DB = index dẫn xuất — dựng lại bằng `zemory reindex`)",
      "",
      "  ls [doc]           table of contents (from the search index)",
      "  show <#id>         print a section's body",
      "  search <q> [--all] FTS over sections (heading-weighted)",
    ].join("\n"),
  );
}

async function cmdDocs(args: string[]): Promise<void> {
  const sub = args[0];
  const root = findProjectRoot() ?? process.cwd();
  if (sub === "ls") {
    const docs = listDocs(root);
    console.log(`zemory docs — ${docs.length} doc(s) trong search index`);
    for (const d of docs) console.log(`  #${d.id} [${d.kind}] ${d.path} (${d.sections} sections)`);
    return;
  }
  console.log(
    [
      "zemory docs <subcommand>   (.md là NGUỒN, file wins; DB = search index dẫn xuất)",
      "",
      "  ls       list docs currently in the search index (kind · sections)",
      "  (thêm/sửa/xoá docs = sửa file .md trực tiếp; `zemory reindex` dựng lại index)",
    ].join("\n"),
  );
}

async function cmdChangelog(args: string[]): Promise<void> {
  const sub = args[0];
  const root = findProjectRoot() ?? process.cwd();
  if (sub === "ls") {
    const rows = listEntries(root);
    console.log(`zemory changelog — ${rows.length} entr(ies)`);
    for (const r of rows) {
      const relation = r.supersedes_id ? ` → supersedes #${r.supersedes_id}` : "";
      console.log(`  #${r.id} [${r.date ?? "—"}] ${r.title}${r.archived ? " (archived)" : ""}${relation}`);
    }
    return;
  }
  if (sub === "search") {
    const rest = args.slice(1);
    const all = rest.includes("--all");
    const q = rest.filter((a) => !a.startsWith("--")).join(" ");
    if (!q) {
      console.log("usage: zemory changelog search <query> [--all]");
      return;
    }
    const hits = searchChangelog(q, { project: all ? undefined : root });
    console.log(`zemory changelog search — "${q}"`);
    for (const h of hits) console.log(`  #${h.id} [${h.date ?? "—"}] ${h.title}\n     ${h.snippet}`);
    if (!hits.length) console.log("  no matches.");
    return;
  }
  console.log(
    [
      "zemory changelog <subcommand>   (.md là NGUỒN; DB = search index dẫn xuất)",
      "",
      "  ls               list entries in the index (newest first)",
      "  search <q> [--all] FTS over entries",
      "  (thêm entry = sửa 06_CHANGES.md trực tiếp; `zemory reindex` dựng lại index)",
    ].join("\n"),
  );
}

/** Rebuild the docs search index from the .md files (FILE WINS — read-only,
 *  never writes .md). Indexes docs/plan/*.md sections + 06_CHANGES.md entries. */
function cmdReindex(): void {
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

function cmdHelp(): void {
  console.log(
    [
      "zemory <command>",
      "",
      "  init      set up the harness here (non-destructive; --fresh keeps old docs aside)",
      "  sync      gap-fill missing template docs vs the standard",
      "  migrate   analyze existing docs for brownfield adopt (no changes)",
      "  doctor    quick check (text): wired? docs? features?",
      "  ui        open a small status window (app-mode, on-demand)",
      "  archive   move old 06_CHANGES blocks to docs/agent/archive/ when over threshold",
      "  validate  check docs (.md), links, changelog retention, and supersede",
      "  reindex   rebuild the docs search index from .md (read-only; never writes .md)",
      "  docs      docs search-index: ls (.md is the SOURCE — edit files, then reindex)",
      "  plan      search project specs (.md is source; DB = index): ls · show · search",
      "  changelog changelog (.md is source; DB = index): ls · search",
      "  memory     scan/search the global memory (memory scan | search | show)",
      "  mcp       run the local MCP stdio server (memory_search/show, plan_search/show)",
      "  hook      runtime hooks: install for Claude/Codex · session-start · stop",
      "  grill     interrogate the plan before building (workflow)",
      "  graph     code-graph queries: impact <file> · callers <symbol> · fitness [--gate]",
      "  structure print the standard harness structure (target to conform to)",
      "  setup     print the full setup & completion runbook",
      "  --version print version",
    ].join("\n"),
  );
}

const [cmd, ...args] = process.argv.slice(2);
try {
  await main();
} catch (error) {
  // One catch for every command: a thrown Error prints as a clean one-liner and
  // exit 1, never a raw UnhandledRejection stack (e.g. export with a bad path).
  console.error(`zemory ${cmd ?? ""}: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

async function main(): Promise<void> {
switch (cmd) {
  case "init":
    cmdInit(args);
    break;
  case "sync":
    cmdSync();
    break;
  case "migrate":
    cmdMigrate();
    break;
  case "doctor":
    await cmdDoctor();
    break;
  case "ui":
    await startUi();
    break;
  case "archive":
    cmdArchive();
    break;
  case "validate":
    cmdValidate();
    break;
  case "reindex":
    cmdReindex();
    break;
  case "plan":
    await cmdPlan(args);
    break;
  case "docs":
    await cmdDocs(args);
    break;
  case "changelog":
    await cmdChangelog(args);
    break;
  case "memory":
    await cmdMemory(args);
    break;
  case "mcp":
    await runMcpStdio();
    break;
  case "hook":
    await cmdHook(args);
    break;
  case "grill":
    cmdGrill();
    break;
  case "structure":
    cmdStructure();
    break;
  case "graph":
    await cmdGraph(args);
    break;
  case "setup":
    cmdSetup();
    break;
  case "--version":
  case "-v":
    console.log(`zemory ${VERSION.version}`);
    break;
  default:
    cmdHelp();
}
}
