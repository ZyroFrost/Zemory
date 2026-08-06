// `zemory init|sync|migrate|doctor|archive|validate|setup|structure|grill|reindex`
// — the per-project docs harness lifecycle.
import { homedir } from "node:os";
import { existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { analyzeMigration } from "../docs/migrate.js";
import { currentMemoryDir, currentMemoryDb } from "../memory/db.js";
import { currentProjectRoot, findProjectRoot, loadContext } from "../core/config.js";
import { createRuntime } from "../core/runtime.js";
import { ensureHarness, freshHarness } from "../docs/adopt.js";
import { archiveChanges, archiveTodo } from "../docs/archive.js";
import { runCheck } from "../checks.js";
import { gatherStatus } from "../status.js";
import { validate } from "../docs/validate.js";
import { conform } from "../docs/conform.js";
import { UNSUPPORTED, agentTargets, inspectAgent, inspectProtocol, wireAgent, writeProtocol } from "../mcpsetup.js";
import { importDoc, pruneMissingDocs } from "../docs/plan.js";
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
  // Decide the profile BEFORE scaffolding: it picks which template TREE we copy
  // (docs_template/app vs nonapp). ensureHarness persists profile:"non-app" into
  // the config (app stays the implicit default). --non-app follows the NON-APP
  // standard (BI/data/docs/design — deliverables, no backend/frontend).
  const profile = args.includes("--non-app") ? "non-app" : undefined;
  const r = ensureHarness(process.cwd(), profile);
  if (profile === "non-app") {
    console.log('  profile: "non-app" (chuẩn hệ NON-APP — BI/data/docs/design; scaffold từ template nonapp/)');
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
  // Audit 2026-07-27 (F2): `analyzeMigration()` là một năng lực THẬT (soi docs/ của repo
  // lạ: thiếu file chuẩn nào · file lạ đoán được vai trò gì · có sẵn plan/ chưa) nhưng
  // MỒ CÔI — đường duy nhất chạm tới nó là endpoint `/migrate` mà không FE nào gọi, còn
  // lệnh CLI cùng tên thì chỉ in hướng dẫn. Nay in bảng phân tích THẬT trước, rồi mới
  // tới các bước. Fail-open: repo chưa có docs/ thì bỏ qua phần bảng.
  const root = currentProjectRoot();
  const rep = analyzeMigration(root);
  if (rep) {
    console.log(`zemory migrate — soi \`${rep.docsDir}\`:`);
    const missing = rep.roles.filter((r) => !r.present).map((r) => r.file);
    console.log(`  file chuẩn: ${rep.roles.length - missing.length}/${rep.roles.length} có sẵn` + (missing.length ? ` · THIẾU: ${missing.join(" · ")}` : ""));
    if (rep.extras.length) {
      console.log(`  file lạ (${rep.extras.length}) — đoán vai trò:`);
      for (const e of rep.extras.slice(0, 12)) console.log(`    · ${e.file}${e.guessRole ? `  →  ${e.guessRole}` : "  →  (chưa đoán được)"}`);
    }
    console.log(`  plan: ${rep.plan.hasPlanDir ? "có docs/plan/" : "chưa có docs/plan/"}` + (rep.plan.specs.length ? ` · ${rep.plan.specs.length} spec rời` : ""));
    console.log("");
  }
  console.log("zemory migrate — reconcile docs cũ về chuẩn (App KHÔNG tự sửa; agent làm).");
  console.log("Các bước đầy đủ: docs/agent/03_STRUCTURE.md §8. Tóm tắt:");
  console.log("  1. zemory docs ls          — xem cái nào trùng/thừa (trong search index)");
  console.log("  2. zemory plan show <#id>  — đọc nội dung TRƯỚC khi quyết");
  console.log("  3. gộp todo → 05_TODO; XOÁ THẲNG file .md trùng/thừa (HỎI user nếu còn nội dung)");
  console.log("  4. zemory reindex → zemory doctor (xanh = xong)");
}

export function cmdSync(): void {
  const root = currentProjectRoot();
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

/**
 * Cảnh báo khi có HAI file `config.json`: bản THẬT nằm cạnh DB (`currentMemoryDir()`), còn
 * `~/.zemory/config.json` là bản CŨ còn sót sau khi `memory relocate` dời DB khỏi ổ hệ thống.
 *
 * Vì sao đáng cảnh báo: file mồ côi đó đọc được, trông hợp lệ, và nội dung LỆCH hẳn — audit
 * 2026-07-28 đã đọc nhầm nó rồi kết luận sai về một setting đang bật. Cùng họ lỗi "kho import
 * nằm cạnh DB mà discovery chỉ tìm ở home" (changelog 07-28c). Chỉ BÁO, không tự xoá — xoá
 * file của người dùng phải do người dùng quyết.
 */
function warnStrayConfig(): void {
  const live = resolve(currentMemoryDir(), "config.json");
  const home = resolve(homedir(), ".zemory", "config.json");
  if (live.toLowerCase() === home.toLowerCase()) return;
  if (!existsSync(home) || !existsSync(live)) return;
  console.log(`  ⚠ hai file config: đang dùng ${live}`);
  console.log(`      bản mồ côi (KHÔNG được đọc): ${home} — xoá tay nếu không cần`);
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
  warnStrayConfig();
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
  // Both per-session logs get trimmed: 06_CHANGES by oldest ENTRY, 05_TODO by
  // closed ITEM. They fill up at different rates, so each has its own threshold.
  const r = archiveChanges(ctx);
  if (r.moved === 0) {
    if (r.skipped === "no-entries") {
      // Do NOT say "under threshold" here — the file is OVER it; the headings are the problem.
      console.log(
        `zemory archive: 06_CHANGES.md = ${r.activeLines} lines (OVER threshold) but no dated entry was recognised.`,
      );
      console.log(
        "  Entry headings must look like `## [YYYY-MM-DD] — title` (square brackets). Fix them, then re-run.",
      );
    } else {
      console.log(
        `zemory archive: nothing to do (06_CHANGES.md = ${r.activeLines} lines, under threshold).`,
      );
    }
  } else {
    console.log(`zemory archive: marked ${r.moved} old entr(ies) archived in global_memory.db.`);
    console.log(`  active 06_CHANGES.md now ${r.activeLines} lines (history remains searchable).`);
  }
  const t = archiveTodo(ctx, currentMemoryDb());
  if (t.moved === 0) {
    console.log(`  05_TODO.md = ${t.activeLines} lines, under threshold — left alone.`);
  } else {
    console.log(`  moved ${t.moved} closed item(s) to docs/agent/archive/05_TODO.md.`);
    console.log(`  active 05_TODO.md now ${t.activeLines} lines (open work only).`);
  }
}

/**
 * `zemory conform [--json] [--gate]` — chấm ĐỘ BÁM CHUẨN của repo.
 *
 * Khác `validate` (bộ docs harness có đúng khuôn không): lệnh này hỏi CODE + DOCS có bám
 * chuẩn đã KHAI không. Máy chấm miễn phí, ra bảng lệch ngắn để agent đọc (~vài trăm token)
 * thay vì nạp cả graph (~56k token). `--gate` → exit 1 khi có mục `blocking`, dùng cho CI.
 */
export function cmdConform(args: string[]): void {
  const root = findProjectRoot();
  if (!root) {
    console.log("zemory conform: not connected — run `zemory init` first.");
    process.exitCode = 1;
    return;
  }
  const rep = conform(root);
  if (args.includes("--json")) {
    console.log(JSON.stringify(rep, null, 2));
    if (args.includes("--gate") && !rep.ok) process.exitCode = 1;
    return;
  }
  const s = rep.stats;
  console.log(`zemory conform — độ bám chuẩn (${root})`);
  console.log(
    `  ${s.files} file · slot dùng ${s.slotsUsed}/${s.slotsDeclared} · điều ${s.hpDieu} · skill ${s.skills}`,
  );
  if (!rep.items.length) {
    console.log("  ✓ không lệch chuẩn.");
    return;
  }
  for (const it of rep.items) {
    console.log(`\n  ${it.level === "blocking" ? "✗" : "·"} ${it.title} (${it.count}) [${it.check}]`);
    for (const sm of it.samples) console.log(`      ${sm}`);
    if (it.count > it.samples.length) console.log(`      … +${it.count - it.samples.length}`);
    console.log(`      → ${it.fix}`);
  }
  if (args.includes("--gate") && !rep.ok) process.exitCode = 1;
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
export function cmdSetup(args: string[] = []): void {
  if (args[0] === "mcp") {
    cmdSetupMcp(args.slice(1));
    return;
  }
  console.log("zemory setup — cài & dùng:");
  console.log("  1. npm i -g zemory                 — cài global (lệnh `zemory`)");
  console.log("  2. cd <project> && zemory init     — scaffold harness (hoặc `zemory ui` → Setup)");
  console.log("  3. zemory doctor");
  console.log("  4. zemory setup mcp                 — nối zemory vào agent nói MCP (Claude Code/Desktop · Cursor · Windsurf · Gemini)");
  console.log("Điều hướng mở phiên: AGENTS.md ở root (hỏi app/non-app trước khi init). Luật + quy trình (sửa docs · reconcile · grill): docs/agent/* (02_RULES + 03_STRUCTURE Reconcile).");
}

/** `zemory setup mcp [agent] [--force]` — khai zemory vào cấu hình MCP của agent.
 *
 *  Gọi TRẦN thì chỉ LIỆT KÊ, không ghi gì: các file này nằm ngoài project, mà `02_RULES
 *  §Phạm vi` đặt "ghi ra ngoài" ở mức cấm mặc định. Phải nêu đích danh agent mới ghi. */
function cmdSetupMcp(args: string[]): void {
  const root = currentProjectRoot();
  const targets = agentTargets(root);
  const force = args.includes("--force");
  const pick = args.find((a) => !a.startsWith("--"));
  if (!pick) {
    console.log("zemory setup mcp — nối zemory vào agent nói MCP (chỉ LIỆT KÊ; nêu tên agent mới ghi)");
    for (const t of targets) {
      const state = inspectAgent(t);
      const mark = state === "wired" ? "✓ đã khai" : state === "present-not-wired" ? "○ có file, chưa khai" : state === "bad-json" ? "⚠ file JSON hỏng" : t.path ? "· chưa có file" : "· chưa cài";
      const memo: Record<string, string> = {
        installed: "✓ có lời dặn",
        stale: "○ lời dặn bản cũ",
        absent: "○ chưa dặn",
        "no-file": "· chưa có file",
        "broken-marker": "⚠ khối hỏng",
        unsupported: "— không áp dụng",
      };
      console.log(`  ${mark.padEnd(22)} ${t.id.padEnd(15)} ${t.path ?? `(chưa thấy: ${t.candidates[0]})`}`);
      const memoWhere = t.memo ?? t.memoCandidates[0];
      console.log(
        `  ${" ".repeat(22)} ${"↳ chỉ dẫn".padEnd(15)} ${memo[inspectProtocol(t)]}` +
          (memoWhere ? ` — ${memoWhere}` : t.memoWhy ? ` (${t.memoWhy})` : ""),
      );
    }
    console.log("");
    console.log("  ghi vào một agent:  zemory setup mcp <agent> [--force]");
    console.log("  agent hợp lệ:       " + targets.map((t) => t.id).join(" · "));
    console.log("  mỗi lần ghi làm HAI việc: khai server + cài LỜI DẶN khi nào gọi trí nhớ (`--no-protocol` để bỏ vế sau)");
    console.log("  luôn sao lưu .bak trước khi ghi · KHÔNG đụng server khác trong file");
    console.log("  chưa khai tự động được (khai tay): " + UNSUPPORTED.map((u) => `${u.id} — ${u.why}`).join(" · "));
    console.log("  ⓘ Cowork KHÔNG dùng được MCP: nó chạy trong máy ảo riêng, không với tới `zemory` trên máy thật.");
    return;
  }
  const target = targets.find((t) => t.id === pick);
  if (!target) {
    console.log(`zemory setup mcp: không biết agent "${pick}". Hợp lệ: ${targets.map((t) => t.id).join(" · ")}`);
    process.exitCode = 1;
    return;
  }
  const r = wireAgent(target, force);
  const why: Record<string, string> = {
    already: "đã khai sẵn rồi (dùng --force để ghi đè)",
    "no-parent-dir": "chưa thấy thư mục cấu hình — agent này có vẻ chưa cài trên máy",
    "bad-json": "file cấu hình không parse được JSON — KHÔNG ghi đè, sửa tay trước",
  };
  if (r.wrote) {
    console.log(`zemory setup mcp — ${r.reason === "replaced" ? "ghi đè" : "đã khai"} zemory vào ${target.label}`);
    console.log(`  server:   ${target.path}`);
    if (r.backup) console.log(`  sao lưu:  ${r.backup}`);
  } else {
    console.log(`zemory setup mcp — server KHÔNG ghi: ${why[r.reason] ?? r.reason}`);
    console.log(`  server:   ${target.path ?? `(chưa thấy: ${target.candidates[0]})`}`);
    if (r.reason === "bad-json") process.exitCode = 1;
  }

  // Vế hai: khai server chỉ cho agent CÓ tool; lời dặn mới làm nó BIẾT LÚC NÀO gọi.
  if (!args.includes("--no-protocol")) {
    const p = writeProtocol(target);
    const pw: Record<string, string> = {
      added: "đã cài lời dặn",
      updated: "đã cập nhật lời dặn (bản cũ được thay đúng chỗ)",
      already: "lời dặn đã đúng bản mới nhất",
      "broken-marker": "⚠ khối cũ thiếu marker đóng — KHÔNG ghi, sửa tay rồi chạy lại",
      "no-parent-dir": "chưa thấy thư mục — agent này có vẻ chưa cài",
      unsupported: `không áp dụng${target.memoWhy ? ` (${target.memoWhy})` : ""}`,
    };
    console.log(`  chỉ dẫn:  ${pw[p.reason] ?? p.reason}`);
    if (p.path) console.log(`            ${p.path}`);
    if (p.backup) console.log(`            sao lưu: ${p.backup}`);
    if (p.reason === "broken-marker") process.exitCode = 1;
  }
  if (r.wrote) console.log("  → mở lại agent đó để nó nạp server mới.");
}

export function cmdStructure(): void {
  console.log(
    [
      "zemory — repo structure standard. FULL spec (per-line tree + routing + convention): docs/agent/03_STRUCTURE.md",
      "",
      "  TWO standards — pick by project type at init (recorded as `\"profile\"` in docs/.harness.json):",
      "  ① APP (runnable code you build & maintain, default) — `zemory init`. Required (4): backend/(code) · frontend/ · docs/ · AGENTS.md.",
      "  ② NON-APP (deliverable assets: BI/report · data · docs-only · design) — `zemory init --non-app`.",
      "     Required (3): docs/ · AGENTS.md · ≥1 deliverable (reports/|models/|content/|design/). No backend/frontend.",
      "     Adds tasks/ · templates/ · data/{extract,adhoc,<task>} · pull/fill/upload playbooks · 0 UI rules.",
      "  Each project's docs/agent/03_STRUCTURE.md IS its profile's standard (scaffolded from docs_template/{app,nonapp}/).",
      "  Everything else is [opt] — create when the concern exists (never a pile of empty folders).",
      "  6 non-code kinds (never mix): assets=media · resources=bundled-tracked · config=operator-files · data=runtime-gitignored · external=cloned-code · attic=backup.",
      "  3 'connections': api/=you expose · integrations/=external SaaS · store/=DATABASE (remote/cloud/internal). external/=cloned code.",
      "  1 NAME per concern (own standard: store/ not db|models); only a framework may force a name (Next pages/, Django models/).",
      "  Source = git tracked; output / runtime / secret = GITIGNORED.",
      "",
      "  Full per-line tree + routing table + all conventions → docs/agent/03_STRUCTURE.md",
      "  Refactor a repo to this → docs/agent/03_STRUCTURE.md (Reconcile section)   ·   drift check → `zemory validate`",
      "",
      "docs harness (.md is the SOURCE — file wins; DB doc/section/changelog = derived search index):",
      "  docs/agent/01_CONSTITUTION.md — per-app constitution: architectural invariants (user-owned)",
      "  docs/agent/02_RULES.md      — work rules, generic across projects",
      "  docs/agent/03_STRUCTURE.md  — repo structure standard (+ §8 Reconcile)",
      "  docs/agent/04_SKILLS.md     — skill REGISTRY (one line per skill); playbooks live in .claude/skills/",
      "  docs/agent/05_TODO.md       — backlog",
      "  docs/agent/06_CHANGES.md    — changelog",
      "  docs/plan/*.md              — specs (00_overview + numbered specs)",
      "  .claude/skills/<name>/SKILL.md — one playbook per folder, auto-loaded by its `description`",
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
  const root = currentProjectRoot();
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
  // Harness docs are searchable content too — the backlog especially. Before this,
  // `reindex` covered docs/plan/* and 06_CHANGES only, so 05_TODO (the biggest file
  // in docs/agent) was reachable by grep alone, and its archive doubly so. Indexed
  // under their own `kind` so they stay distinguishable from plan specs.
  // 06_CHANGES is excluded on purpose: it has a dedicated changelog lane and would
  // otherwise be indexed twice.
  const agentDir = join(root, "docs", "agent");
  const arcDir = join(agentDir, "archive");
  const mdIn = (dir: string) => {
    try {
      return readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "06_CHANGES.md");
    } catch {
      return [];
    }
  };
  let agentDocs = 0;
  for (const f of mdIn(agentDir)) {
    importDoc(join(agentDir, f), join("docs", "agent", f), root, "agent");
    agentDocs++;
  }
  for (const f of mdIn(arcDir)) {
    importDoc(join(arcDir, f), join("docs", "agent", "archive", f), root, "agent-archive");
    agentDocs++;
  }

  // Dead plans keep their searchability. Moving a DROPPED/superseded spec out of
  // docs/plan/ takes it off the per-session read, but the reasoning in it is still worth
  // finding — the same warm-tier deal already given to the changelog and the backlog.
  // Only this one folder is indexed, not attic/ at large (attic also holds retired
  // source, cockpit HTML, rescue dumps — none of that belongs in a docs search).
  const deadDir = join(root, "attic", "dead-plans");
  let deadDocs = 0;
  for (const f of mdIn(deadDir)) {
    importDoc(join(deadDir, f), join("attic", "dead-plans", f), root, "plan-archive");
    deadDocs++;
  }

  // Prune rows whose source .md no longer exists (điều 3 — FILE WINS: the index is
  // derived, so a row with no file behind it is a lie). Nothing did this before, so
  // moving the three dead plans to attic/ on 2026-07-29 left `plan search "quota-safe"`
  // answering with `docs\plan\03_….md` — a path that no longer existed. A stale hit is
  // worse than a miss: it sends the reader to a file that is not there.
  const pruned = pruneMissingDocs(root);

  const chPath = join(root, "docs", "agent", "06_CHANGES.md");
  const ch = existsSync(chPath) ? importChangelog(chPath, root, undefined, { replace: true }) : 0;
  // The ARCHIVE is a source file too — outside the per-session read, but git-tracked
  // and rebuildable. Index it as its own tier so old decisions stay searchable
  // (plan/02 §3). Skipping this is why `changelog search` used to miss everything
  // older than the last trim.
  const chArc = join(root, "docs", "agent", "archive", "06_CHANGES.md");
  const arc = existsSync(chArc)
    ? importChangelog(chArc, root, undefined, { replace: true, archived: true })
    : 0;
  console.log(
    `zemory reindex — ${files.length} plan doc(s) · ${agentDocs} harness doc(s) · ${deadDocs} plan chết (attic/dead-plans) · ${sections} section(s) · ${ch} changelog entr(ies) + ${arc} archived → search index (đọc .md, KHÔNG ghi ngược).` +
      (pruned ? `\n  dọn ${pruned} doc row mồ côi (file .md không còn trên đĩa).` : ""),
  );
}

// zemory graph — file-level graph queries (plan 13 §9 Phase A/B).
//   impact <file>   ADVISORY blast-radius: importers (direct + transitive) + hub flag.
//   fitness [--gate] deterministic health metrics; --gate exits 1 on failure (CI).

