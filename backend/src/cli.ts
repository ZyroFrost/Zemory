#!/usr/bin/env node
// zemory CLI — Phase 1: init, sync, doctor, ui, archive, --version.
// init/sync are NON-DESTRUCTIVE (never overwrite existing docs).

import { readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findProjectRoot, loadContext } from "./core/config.js";
import { createRuntime } from "./core/runtime.js";
import { ensureHarness, freshHarness } from "./adopt.js";
import { archiveChanges } from "./archive.js";
import { runCheck } from "./checks.js";
import { gatherStatus } from "./status.js";
import { startUi } from "./ui.js";
import { type ScanReport, brainHostTree, brainInfo, scan } from "./brain/ingest.js";
import { type Digest, digestBackfill, getDigest, searchDigests } from "./brain/digest.js";
import { dropVectorIndex, embedPending, vectorCount, vectorIndexInfo, vectorRemaining } from "./brain/vectors.js";
import { runRagBench } from "./brain/ragbench.js";
import { scanWeb } from "./brain/scanweb.js";
import { relocateBrain, storageInfo } from "./brain/relocate.js";
import { type SearchHit, getMessage, hybridEnabled, rerankEnabled, search, searchHybrid } from "./brain/search.js";
import { exportBrainBundle, importBrainBundle, mergeBrainBundle, resolveShareKey, syncDrive, writeBrainShareKey } from "./brain/share.js";
import { type ScopeNode, scopeTree, toggleLane } from "./brain/scope.js";
import { getDriveDir, getScopeExclude, setScopeExclude, type ScopeLane } from "./settings.js";
import { backupBrain, forgetBrain, reRedactBrain, restoreBrainBackup, vacuumBrain } from "./brain/privacy.js";
import { handleHook, installCodexHooks, installHooks } from "./hooks.js";
import { validate } from "./validate.js";
import { runMcpStdio } from "./mcp.js";
import { createDoc, importAll, importDoc, listDocs, listToc, removeDoc, renderAll, renderDoc, resolveDocPath, searchSections, setBody, setHeading, showSection } from "./docs/plan.js";
import { addEntry, importChangelog, listEntries, renderChangelog, searchChangelog, setEntryDate } from "./docs/changelog.js";
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
      console.log('  profile: "non-app" (02_STRUCTURE §7 — BI/data/docs/design)');
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

// Reconcile guide now lives in AGENTS.md §5 (single source). Print a short pointer.
function cmdMigrate(): void {
  console.log("zemory migrate — reconcile docs cũ về chuẩn (App KHÔNG tự sửa; agent làm).");
  console.log("Các bước đầy đủ: AGENTS.md §5. Tóm tắt:");
  console.log("  1. zemory docs sync        — import HẾT .md vào brain (không đụng file)");
  console.log("  2. zemory docs ls          — xem cái nào trùng/thừa");
  console.log("  3. zemory plan show <#id>  — đọc nội dung TRƯỚC khi quyết");
  console.log("  4. gộp todo → 03_TODO; zemory docs rm <path> cho bản trùng/thừa (HỎI user nếu còn nội dung)");
  console.log("  5. zemory docs render → zemory doctor (xanh = xong)");
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
    console.log("    → AGENT reconcile (các bước: AGENTS.md §5, hoặc `zemory migrate`):");
    console.log("      zemory docs sync   (import all → global_memory.db)");
    console.log("      zemory docs ls / rm  (drop dups + obsolete: 00_INDEX, 02_CONTEXT, overview)");
    console.log("      zemory docs render (regenerate clean mirrors)");
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
        ? `⚠ ${s.plan.detail} → agent reconcile (AGENTS.md §5 / \`zemory migrate\`)`
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
      `zemory archive: nothing to do (04_CHANGES.md = ${r.activeLines} lines, under threshold).`,
    );
  } else {
    console.log(`zemory archive: marked ${r.moved} old entr(ies) archived in global_memory.db.`);
    console.log(`  active 04_CHANGES.md now ${r.activeLines} lines (history remains searchable).`);
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

// Setup guide now lives in AGENTS.md (single source). Print short install steps + pointer.
function cmdSetup(): void {
  console.log("zemory setup — cài & dùng:");
  console.log("  1. npm i -g zemory                 — cài global (lệnh `zemory`)");
  console.log("  2. cd <project> && zemory init     — scaffold harness (hoặc `zemory ui` → Setup)");
  console.log("  3. zemory docs sync && zemory doctor");
  console.log("Mọi hướng dẫn (mở phiên, tra cứu, sửa docs, reconcile, grill): đọc AGENTS.md ở root.");
}

function cmdStructure(): void {
  console.log(
    [
      "zemory — repo structure standard. FULL spec (per-line tree + routing + convention): docs/agent/02_STRUCTURE.md",
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
      "  Full per-line tree + routing table + all conventions → docs/agent/02_STRUCTURE.md",
      "  Refactor an app to this → AGENTS.md   ·   drift check → `zemory validate`",
      "",
      "docs harness (.md; some are DB-render mirrors):",
      "  docs/agent/01_RULES.md      — work rules (markdown source)",
      "  docs/agent/02_STRUCTURE.md  — repo structure standard (markdown source)",
      "  docs/agent/03_TODO.md       — backlog (mirror)",
      "  docs/agent/04_CHANGES.md    — changelog (mirror, source = changelog table)",
      "  docs/plan/*.md              — specs (mirror, source = doc/section tables)",
      "  ~/.zemory/global_memory.db          — SOURCE: sessions · doc/section · changelog",
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

function fmtDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "—";
}

function printDigest(d: Digest): void {
  const n = (v: number) => v.toLocaleString();
  console.log(`session ${d.session_id}  [${d.meta.source} · ${d.meta.host}] · ${d.kind}`);
  console.log(
    `  project: ${d.meta.project_root ?? "(unknown)"} · ${n(d.meta.messages)} msg · ${fmtDate(d.meta.from)} → ${fmtDate(d.meta.to)}`,
  );
  const block = (label: string, items: { text: string; id: number }[]) => {
    if (!items.length) return;
    console.log(`  ${label}:`);
    for (const it of items) console.log(`    · ${it.text}  (#${it.id})`);
  };
  block("tasks", d.tasks);
  block("decisions", d.decisions);
  block("errors", d.errors);
  if (d.paths.length) console.log(`  paths touched: ${d.paths.join(" · ")}`);
  if (d.outcome) console.log(`  outcome: ${d.outcome}`);
}

function printScanReport(r: ScanReport): void {
  console.log(`zemory brain scan — global brain at ${r.dbPath}`);
  console.log(
    `  mode: ${r.deep ? `deep (walked ${r.roots.length} root(s))` : "fast (known locations)"}`,
  );
  console.log(`  scanned ${r.scannedFiles} file(s), ${r.changedFiles} with new data`);
  console.log("");
  console.log(`  agents (${r.agents.length}):`);
  for (const a of r.agents) {
    console.log(
      `    · ${a.source} — ${a.sessions} session(s), ${a.messages} message(s), ${fmtDate(a.from)} → ${fmtDate(a.to)}`,
    );
  }
  console.log("");
  console.log(`  changed sessions (${r.sessions.length}):`);
  for (const s of r.sessions) {
    const label = (s.id.length > 12 ? s.id.slice(0, 8) : s.id).padEnd(8);
    const proj = s.project.replace(/\\/g, "/").split("/").slice(-2).join("/");
    const added = s.newMessages > 0 ? ` (+${s.newMessages} new)` : "";
    console.log(
      `    · ${label} [${s.source}] ${fmtDate(s.from)}→${fmtDate(s.to)} · ${s.messages} lines${added} · ${proj}`,
    );
  }
  console.log("");
  const t = r.totals;
  console.log(
    `  ✓ loaded into global brain: +${t.newMessages} message(s) across ${r.changedFiles} session(s) this scan`,
  );
  console.log(
    `    total now: ${t.sessions} session(s) · ${t.messages} message(s) · ${t.agents} agent(s) · ${fmtDate(t.from)} → ${fmtDate(t.to)}`,
  );
  if (r.unknown.length) {
    console.log("");
    console.log(`  ⚠ ${r.unknown.length} unrecognized transcript store(s) — no adapter yet:`);
    for (const u of r.unknown.slice(0, 20)) {
      console.log(`    · ${u.path} (${u.files} file(s), e.g. ${u.sample})`);
    }
    console.log("    → add an adapter to ingest these agents.");
  }
}

function printHits(query: string, scopeLabel: string, hits: SearchHit[]): void {
  console.log(`zemory brain search — "${query}"  (${scopeLabel})`);
  if (!hits.length) {
    console.log("  no matches.");
    return;
  }
  for (const h of hits) {
    const proj = h.project.replace(/\\/g, "/").split("/").slice(-1)[0];
    console.log(
      `  #${h.id} [${h.source}] ${proj} · ${fmtDate(h.timestamp)} · ${h.role}`,
    );
    console.log(`     ${h.snippet}`);
  }
  console.log("");
  console.log(`  ${hits.length} hit(s) — \`zemory brain show <#id>\` for full message.`);
}

function flagValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function positionalArgs(args: string[], valueFlags = new Set(["--db", "--key-file"])): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (valueFlags.has(a)) {
      i++;
      continue;
    }
    if (!a.startsWith("--")) out.push(a);
  }
  return out;
}

async function cmdBrain(args: string[]): Promise<void> {
  const sub = args[0];
  if (sub === "scan") {
    const deep = args.includes("--deep");
    printScanReport(scan({ deep }));
    return;
  }
  if (sub === "scan-web") {
    const platform = flagValue(args, "--platform") ?? "chatgpt";
    const refresh = args.includes("--refresh");
    const limitRaw = flagValue(args, "--limit");
    const limit = limitRaw !== undefined ? Number(limitRaw) : undefined;
    if (limitRaw !== undefined && (!Number.isFinite(limit) || (limit as number) <= 0)) {
      console.log("  ✗ --limit expects a positive number.");
      process.exitCode = 1;
      return;
    }
    // --delay <seconds> between per-conversation fetches. Higher = stays under
    // ChatGPT's 429 window (default 1.5s is fine for small pulls; use 30–60s for
    // a big unattended backfill so it never trips the rate limit).
    const delayRaw = flagValue(args, "--delay");
    const delayMs = delayRaw !== undefined ? Math.round(Number(delayRaw) * 1000) : undefined;
    if (delayRaw !== undefined && (!Number.isFinite(delayMs) || (delayMs as number) < 0)) {
      console.log("  ✗ --delay expects a non-negative number of seconds.");
      process.exitCode = 1;
      return;
    }
    console.log(`zemory brain scan-web — ${platform} (web-chat capture, origin=web)`);
    const r = await scanWeb({ platform, refresh, limit, delayMs }, (m) => console.log("  " + m));
    if (r.status === "no-browser") {
      console.log("  ✗ no Edge/Chrome found. Set ZEMORY_BROWSER=<path to msedge.exe/chrome.exe> and retry.");
      process.exitCode = 1;
      return;
    }
    if (r.status === "no-tab") {
      console.log(`  ✗ window opened but no ${platform} tab reachable on the debug port yet — wait for it to load, then re-run.`);
      process.exitCode = 1;
      return;
    }
    if (r.status === "need-login") {
      console.log(`  → A dedicated browser window is open at ${r.url}. Log in to YOUR account there (one time — password stays in the browser, never touches zemory), then re-run \`zemory brain scan-web\`.`);
      return;
    }
    console.log(`  ✓ signed in as ${r.email ?? "?"} · ${r.total} conversation(s) on the account`);
    console.log(`  ↓ pulled ${r.pulled} new · skipped ${r.skipped} (already ingested) · failed ${r.failed}`);
    if (r.scan) {
      const web = r.scan.agents.find((a) => a.source.endsWith("-web"));
      if (web) console.log(`  ⤷ brain now holds ${web.source}: ${web.sessions} session(s), ${web.messages} message(s)`);
      console.log("  → vectorize the new ones: `zemory brain embed --all`");
    }
    if (r.interrupted) console.log("  ⚠ connection dropped mid-run — pulled batches are saved. Re-run `zemory brain scan-web` to resume the rest.");
    if (r.failed) console.log("  note: some failed (rate-limit?) — just re-run to resume; it skips what's already in.");
    return;
  }
  if (sub === "scope") {
    // Provenance tree + exclude lanes from sync/recall (spec: plan 08). A filter,
    // never a delete — excluded lanes stay in the local DB, just hidden/unsynced.
    const action = args[1];
    const laneFromFlags = (): ScopeLane => {
      const l: ScopeLane = {};
      const o = flagValue(args, "--origin");
      const h = flagValue(args, "--host");
      const s = flagValue(args, "--source");
      if (o !== undefined) l.origin = o;
      if (h !== undefined) l.host = h;
      if (s !== undefined) l.source = s;
      return l;
    };
    if (action === "exclude" || action === "include") {
      const lane = laneFromFlags();
      if (lane.origin === undefined && lane.host === undefined && lane.source === undefined) {
        console.log("usage: zemory brain scope exclude|include [--origin local|web] [--host <machine>] [--source <agent>]");
        process.exitCode = 1;
        return;
      }
      setScopeExclude(toggleLane(getScopeExclude(), lane, action === "exclude"));
      console.log(`zemory brain scope — ${action}d ${JSON.stringify(lane)}`);
      // fall through to print the tree
    } else if (action === "clear") {
      setScopeExclude([]);
      console.log("zemory brain scope — cleared all exclusions");
    } else if (action && action !== "ls") {
      console.log("usage: zemory brain scope [ls] | exclude <sel> | include <sel> | clear");
      console.log("  selector flags: --origin local|web  --host <machine>  --source <agent>");
      return;
    }
    const tree = scopeTree();
    const excluded = getScopeExclude();
    console.log(`zemory brain scope — Local/Web × machine × agent (${excluded.length} lane(s) excluded)`);
    const printNode = (n: ScopeNode, depth: number) => {
      const pad = "  ".repeat(depth + 1);
      const mark = n.excluded ? " ✗ EXCLUDED" : n.effectiveExcluded ? " ✗ excluded (covered by a broader rule)" : "";
      console.log(`${pad}${n.label} — ${n.sessions} session(s), ${n.messages} msg${mark}`);
      for (const c of n.children ?? []) printNode(c, depth + 1);
    };
    for (const n of tree) printNode(n, 0);
    if (!tree.length) console.log("  (brain empty — run `zemory brain scan` first)");
    console.log("  toggle: `zemory brain scope exclude --source codex` · `… include …` · `… clear`");
    return;
  }
  if (sub === "search") {
    const rest = args.slice(1);
    const all = rest.includes("--all");
    const forceFts = rest.includes("--fts");
    const forceHybrid = rest.includes("--hybrid");
    const forceRerank = rest.includes("--rerank");
    const forceNoRerank = rest.includes("--no-rerank");
    const originOpt = flagValue(rest, "--origin"); // 'local' | 'web' | undefined
    // Drop --flags AND the value token that follows --origin so it never leaks into the query.
    const query = rest.filter((a, i) => !a.startsWith("--") && rest[i - 1] !== "--origin").join(" ");
    if (!query) {
      console.log(
        "usage: zemory brain search <query> [--all] [--origin local|web] [--digest] [--hybrid|--fts] [--rerank|--no-rerank] [--no-recency]   (default mode: ZEMORY_HYBRID / ZEMORY_RERANK; recency blend on)",
      );
      return;
    }
    const recencyOpt = rest.includes("--no-recency") ? false : undefined;
    if (rest.includes("--digest")) {
      // Recall "digest lane": session-level hits (read the thin digest first,
      // drill into messages via `brain digest <session>` / `brain show <#id>`).
      const proj = all ? undefined : (findProjectRoot() ?? process.cwd());
      const dhits = searchDigests(query, { project: proj, recency: recencyOpt });
      console.log(`zemory brain search — "${query}" · digest lane (${all ? "whole brain" : "this project"})`);
      if (!dhits.length) {
        console.log("  no session digests match. (Run `zemory brain digest --all` if you haven't built them.)");
        return;
      }
      for (const h of dhits) {
        console.log(`  ▪ ${h.session_id}  [${h.meta.source} · ${h.meta.host}]  ${fmtDate(h.meta.to)}`);
        console.log(`     ${h.snippet}`);
      }
      console.log("  → open one: `zemory brain digest <session_id>`");
      return;
    }
    const project = findProjectRoot() ?? process.cwd();
    const useHybrid = forceHybrid || (!forceFts && hybridEnabled());
    const rerankOpt = forceRerank ? true : forceNoRerank ? false : undefined;
    // Rerank rides the hybrid pipeline; on the plain FTS path it has no effect.
    const useRerank = useHybrid && rerankEnabled(rerankOpt);
    const hits = useHybrid
      ? await searchHybrid(query, { project, all, origin: originOpt, rerank: rerankOpt, recency: recencyOpt })
      : search(query, { project, all, origin: originOpt, recency: recencyOpt });
    printHits(
      query,
      (all ? "whole brain" : `project: ${project}`) +
        (originOpt ? ` · origin=${originOpt}` : "") +
        (useHybrid ? " · hybrid (FTS+vector)" : " · FTS") +
        (useRerank ? " · rerank (cross-encoder)" : "") +
        (recencyOpt === false ? "" : " · recency"),
      hits,
    );
    return;
  }
  if (sub === "keygen") {
    const out = positionalArgs(args.slice(1))[0];
    if (!out) {
      console.log("usage: zemory brain keygen <key-file> [--force]");
      console.log("  Keep this file OUT of git. Share it out-of-band with trusted machines only.");
      return;
    }
    writeBrainShareKey(out, { force: args.includes("--force") });
    console.log(`zemory brain keygen — wrote ${out}`);
    console.log("  Keep this key file out of git; encrypted bundles are useless without it.");
    return;
  }
  if (sub === "export") {
    const out = positionalArgs(args.slice(1))[0];
    if (!out) {
      console.log("usage: zemory brain export <out.zemory.enc> [--key-file <path>] [--db <path>] [--force]");
      console.log("  Key source: --key-file <path> or env ZEMORY_SHARE_KEY. Raw DB is never written to the repo.");
      return;
    }
    const r = await exportBrainBundle({
      outPath: out,
      dbPath: flagValue(args, "--db"),
      keyFile: flagValue(args, "--key-file"),
      force: args.includes("--force"),
    });
    console.log(`zemory brain export — wrote ${r.outPath}`);
    console.log(`  encrypted ${r.sourceBytes} byte(s) from ${r.sourcePath} → ${r.bundleBytes} byte bundle`);
    return;
  }
  if (sub === "import") {
    const bundle = positionalArgs(args.slice(1))[0];
    if (!bundle) {
      console.log("usage: zemory brain import <in.zemory.enc> [--merge] [--key-file <path>] [--db <path>] [--force]");
      console.log("  default: REPLACE the DB (refuses without --force; old DB renamed to .bak-*).");
      console.log("  --merge: ADD sessions/messages into the existing DB (INSERT OR IGNORE; nothing overwritten).");
      return;
    }
    if (args.includes("--merge")) {
      const r = await mergeBrainBundle({
        bundlePath: bundle,
        dbPath: flagValue(args, "--db"),
        keyFile: flagValue(args, "--key-file"),
      });
      console.log(`zemory brain import --merge — ${r.dbPath}`);
      console.log(
        `  +${r.sessionsAdded} session(s) · +${r.messagesAdded} message(s)  (now ${r.sessionsAfter} sessions · ${r.messagesAfter} messages)`,
      );
      const remaining = vectorRemaining(r.dbPath);
      if (remaining) console.log(`  ${remaining} message(s) need embedding → run \`zemory brain embed --all\` to vectorize the new ones.`);
      return;
    }
    const r = await importBrainBundle({
      bundlePath: bundle,
      dbPath: flagValue(args, "--db"),
      keyFile: flagValue(args, "--key-file"),
      force: args.includes("--force"),
    });
    console.log(`zemory brain import — restored ${r.dbPath}`);
    console.log(`  decrypted ${r.bytes} byte(s) from ${r.bundlePath}`);
    if (r.backupPath) console.log(`  previous DB backup: ${r.backupPath}`);
    return;
  }
  if (sub === "sync") {
    const driveDir = (flagValue(args, "--dir") ?? getDriveDir()).trim();
    if (!driveDir) {
      console.log("usage: zemory brain sync [--dir <folder>] [--key-file <path>]");
      console.log("  Push this machine's bundle to the synced Drive FOLDER + merge every other machine's bundle there.");
      console.log("  Link the folder once in `zemory ui`, or pass --dir. Needs the share key (--key-file / ZEMORY_SHARE_KEY / share/share.key).");
      return;
    }
    const root = findProjectRoot() ?? process.cwd();
    const keyFile = resolveShareKey(root, flagValue(args, "--key-file"));
    console.log(`zemory brain sync — ${driveDir}`);
    try {
      const r = await syncDrive({ driveDir, keyFile });
      console.log(`  ↻ scanned this machine — +${r.scanned.newMessages} new message(s) captured before export`);
      console.log(`  ↑ exported ${r.exported} (${r.exportedBytes} bytes)`);
      if (!r.merged.length) console.log("  · no other machines' bundles in the folder yet.");
      for (const m of r.merged) {
        console.log(m.error ? `  ⚠ ${m.file}: ${m.error}` : `  ↓ merged ${m.file}: +${m.sessionsAdded} session(s) · +${m.messagesAdded} message(s)`);
      }
      console.log(`  ⚙ embedded ${r.embedded} new vector(s) (semantic index)`);
      if (r.vectorRemaining) console.log(`  ${r.vectorRemaining} message(s) still need embedding → \`zemory brain embed --all\` (model unavailable?)`);
    } catch (error) {
      console.log(`  error: ${error instanceof Error ? error.message : "sync failed"}`);
      process.exitCode = 1;
    }
    return;
  }
  if (sub === "backup") {
    const out = positionalArgs(args.slice(1))[0];
    const r = await backupBrain({
      dbPath: flagValue(args, "--db"),
      outPath: out,
      force: args.includes("--force"),
    });
    console.log(`zemory brain backup — wrote ${r.outPath}`);
    console.log(`  copied ${r.bytes} byte(s) from ${r.dbPath}`);
    console.log("  note: this is a raw local SQLite backup. Use `brain export` for encrypted sharing.");
    return;
  }
  if (sub === "vacuum") {
    console.log("zemory brain vacuum — reclaiming freed pages (this rewrites the whole DB file, may take a while)…");
    const r = vacuumBrain();
    const beforeMB = (r.bytesBefore / 1024 / 1024).toFixed(1);
    const afterMB = (r.bytesAfter / 1024 / 1024).toFixed(1);
    const savedMB = ((r.bytesBefore - r.bytesAfter) / 1024 / 1024).toFixed(1);
    console.log(`zemory brain vacuum — ${beforeMB}MB → ${afterMB}MB (freed ${savedMB}MB)`);
    return;
  }
  if (sub === "restore") {
    const backup = positionalArgs(args.slice(1))[0];
    if (!backup) {
      console.log("usage: zemory brain restore <backup.db> [--db <path>] [--force]");
      console.log("  Refuses to overwrite an existing DB unless --force is present; existing DB is renamed to .bak-*.");
      return;
    }
    const r = await restoreBrainBackup({
      backupPath: backup,
      dbPath: flagValue(args, "--db"),
      force: args.includes("--force"),
    });
    console.log(`zemory brain restore — restored ${r.dbPath}`);
    console.log(`  copied ${r.bytes} byte(s) from ${r.backupPath}`);
    if (r.previousBackupPath) console.log(`  previous DB backup: ${r.previousBackupPath}`);
    return;
  }
  if (sub === "forget") {
    const hasSelector = ["--session", "--project", "--source", "--agent", "--before", "--message"].some((flag) => args.includes(flag));
    if (!hasSelector) {
      console.log("usage: zemory brain forget [--session <id>] [--project <path>] [--source <agent>] [--before <date>] [--message <#id>] [--force]");
      console.log("  Dry-run by default. Re-run with --force to delete matched brain DB rows.");
      console.log("  Deletion creates a local backup unless --no-backup is present.");
      return;
    }
    const project = flagValue(args, "--project");
    const message = flagValue(args, "--message");
    const r = await forgetBrain({
      dbPath: flagValue(args, "--db"),
      session: flagValue(args, "--session"),
      project: project ? resolve(project) : undefined,
      source: flagValue(args, "--source") ?? flagValue(args, "--agent"),
      before: flagValue(args, "--before"),
      message: message ? Number(message) : undefined,
      force: args.includes("--force"),
      skipBackup: args.includes("--no-backup"),
      backupPath: flagValue(args, "--backup"),
    });
    console.log(
      `zemory brain forget — ${r.dryRun ? "dry-run" : "deleted"} ${r.messages} message(s), ${r.sessions} session(s), ${r.vectors} vector row(s), ${r.digests} session digest(s)`,
    );
    console.log(`  selectors: ${r.selectors.join(" · ")}`);
    if (r.sampleSessions.length) console.log(`  sessions: ${r.sampleSessions.join(", ")}${r.sessions > r.sampleSessions.length ? " ..." : ""}`);
    if (r.backupPath) console.log(`  backup: ${r.backupPath}`);
    if (r.dryRun) console.log("  re-run with --force to delete these rows.");
    console.log("  note: agent transcript source files are not deleted. If a whole-file transcript changes later, it can be re-ingested.");
    return;
  }
  if (sub === "redact") {
    const r = await reRedactBrain({
      dbPath: flagValue(args, "--db"),
      force: args.includes("--force"),
      skipBackup: args.includes("--no-backup"),
      backupPath: flagValue(args, "--backup"),
    });
    console.log(
      `zemory brain redact — ${r.dryRun ? "dry-run" : "updated"} ` +
        `${r.changed.messages} message(s), ${r.changed.artifactCommands} artifact command(s), ${r.changed.artifactIndex} artifact index row(s), ${r.changed.sessionDigests} session digest(s)`,
    );
    console.log(
      `  scanned: ${r.scanned.messages} message(s), ${r.scanned.artifactCommands} artifact command(s), ${r.scanned.artifactIndex} artifact index row(s), ${r.scanned.sessionDigests} session digest(s)`,
    );
    if (r.backupPath) console.log(`  backup: ${r.backupPath}`);
    if (r.dryRun) console.log("  re-run with --force to apply redactions.");
    return;
  }
  if (sub === "embed") {
    // Incremental semantic backfill: embed messages with no vector yet.
    // Plain `embed` does one batch; `--all` loops until the corpus is caught up.
    // `--rebuild` drops the whole derived index first — the only way to switch
    // embed profile (e.g. adopting the EmbeddingGemma query/document prompts).
    const li = args.indexOf("--limit");
    const limit = li >= 0 ? Number(args[li + 1]) : undefined;
    const rebuild = args.includes("--rebuild");
    const all = args.includes("--all") || rebuild;
    if (rebuild) {
      dropVectorIndex();
      console.log("zemory brain embed --rebuild — vector index dropped; re-embedding the whole corpus…");
    }
    const idx = vectorIndexInfo();
    console.log(`zemory brain embed — building the vector index (EmbeddingGemma, local, profile ${idx.profile} · ${idx.dims}d)…`);
    let total = 0;
    // A long `--all` run shares the DB with other zemory processes (Stop-hook
    // auto-capture, `zemory ui`, another shell). Each vector write auto-commits
    // individually (no long-held transaction), so a SQLITE_BUSY mid-pass costs
    // at most the in-flight message, not the run — but left uncaught it kills
    // an unattended multi-hour job. Retry the pass with backoff instead of dying.
    const isBusy = (e: unknown): boolean => e instanceof Error && /database is locked|SQLITE_BUSY/i.test(e.message);
    const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
    for (let pass = 0; pass < 100000; pass++) {
      let lastProgress = 0;
      let r: Awaited<ReturnType<typeof embedPending>> | undefined;
      for (let attempt = 0; ; attempt++) {
        try {
          r = await embedPending({
            limit,
            onProgress: (p) => {
              if (p.done === p.total || p.done - lastProgress >= 25) {
                lastProgress = p.done;
                process.stdout.write(`  pass ${pass + 1}: ${p.done}/${p.total} scanned · ${p.embedded} embedded\r`);
                if (p.done === p.total) process.stdout.write("\n");
              }
            },
          });
          break;
        } catch (error) {
          if (!isBusy(error) || attempt >= 8) throw error;
          const backoffMs = Math.min(2000 * 2 ** attempt, 60000);
          process.stdout.write(`\n  ⚠ database busy (another zemory process is writing) — retry ${attempt + 1}/8 in ${Math.round(backoffMs / 1000)}s…\n`);
          await sleep(backoffMs);
        }
      }
      total += r.embedded;
      process.stdout.write(`  +${r.embedded} embedded · remaining ${r.remaining}${r.dims ? ` · ${r.dims}d` : ""}\n`);
      if (!all || r.embedded === 0 || r.remaining === 0) break;
    }
    console.log(`zemory brain embed — done: +${total} this run · ${vectorCount()} vector(s) in index.`);
    if (total === 0) console.log("  (nothing embedded — model unavailable? recall still works via FTS.)");
    return;
  }
  if (sub === "bench") {
    const withRerank = args.includes("--rerank");
    console.log(
      `zemory brain bench — RAG gate: FTS-only vs hybrid (FTS+vector)${withRerank ? " vs hybrid+rerank" : ""} on a labeled paraphrase corpus…`,
    );
    const r = await runRagBench({ rerank: withRerank });
    if (r.embedded === 0 && r.hybridHit === 0) {
      console.log("  (embed model unavailable — cannot benchmark hybrid; FTS-only still works.)");
      return;
    }
    for (const p of r.perQuery) {
      const rerCol = r.rerankRan ? ` R${p.rerankFound ? "✓" : "✗"}` : "";
      const rerTop = r.rerankRan ? ` rr#${p.rerankTop ?? "-"}` : "";
      console.log(
        `  H${p.hybridFound ? "✓" : "✗"} F${p.ftsFound ? "✓" : "✗"}${rerCol}  want#${p.expect}  fts#${p.ftsTop ?? "-"} hyb#${p.hybridTop ?? "-"}${rerTop}  "${p.q.slice(0, 42)}"`,
      );
    }
    const pct = (x: number): string => `${(x * 100).toFixed(0)}%`;
    console.log("");
    console.log(`  FTS    recall@3 = ${pct(r.ftsRecall)} (${r.ftsHit}/${r.n}) · ${r.ftsMsAvg.toFixed(0)} ms/q`);
    console.log(`  Hybrid recall@3 = ${pct(r.hybridRecall)} (${r.hybridHit}/${r.n}) · ${r.hybridMsAvg.toFixed(0)} ms/q`);
    if (r.rerankRan) {
      console.log(`  Rerank recall@3 = ${pct(r.rerankRecall)} (${r.rerankHit}/${r.n}) · ${r.rerankMsAvg.toFixed(0)} ms/q`);
      if (r.rerankHit === r.hybridHit && r.rerankMsAvg === 0) {
        console.log("  (rerank model unavailable — fell back to hybrid order.)");
      }
    }
    const verdict = r.hybridRecall > r.ftsRecall ? "HYBRID WINS" : r.hybridRecall === r.ftsRecall ? "TIE" : "FTS WINS";
    console.log(`  → ${verdict}. Gate: chỉ bật hybrid mặc định khi thắng net (giờ vẫn opt-in qua --hybrid).`);
    if (!withRerank) console.log("  tip: add --rerank to measure the cross-encoder lane (downloads the reranker once).");
    return;
  }
  if (sub === "hosts") {
    const tree = brainHostTree();
    if (!tree.length) {
      console.log("zemory brain hosts — no sessions captured yet. Run `zemory brain scan`.");
      return;
    }
    const n = (v: number) => v.toLocaleString();
    const projName = (p: string) => (p === "(unknown)" ? p : p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p);
    console.log("zemory brain hosts — sessions by PC → source → project");
    for (const h of tree) {
      console.log(`\n● ${h.host}   ${n(h.sessions)} sess · ${n(h.messages)} msg`);
      for (const s of h.sources) {
        console.log(`  ├─ ${s.source.padEnd(14)} ${n(s.sessions)} sess · ${n(s.messages)} msg`);
        for (const p of s.projects) {
          console.log(`  │    · ${projName(p.project).padEnd(22)} ${n(p.sessions)} sess · ${n(p.messages)} msg`);
        }
      }
    }
    return;
  }
  if (sub === "digest") {
    const rest = args.slice(1);
    const sid = rest.find((a) => !a.startsWith("--"));
    if (sid) {
      const d = getDigest(undefined, sid);
      if (!d) {
        console.log(`zemory brain digest: no digest for session "${sid}". Build with \`zemory brain digest --all\`.`);
        return;
      }
      printDigest(d);
      return;
    }
    // No session id → (re)build digests (hash-guarded; unchanged are skipped).
    const r = digestBackfill();
    console.log(`zemory brain digest — built/updated ${r.built} of ${r.scanned} session(s) [extractive]`);
    return;
  }
  if (sub === "info") {
    const info = brainInfo();
    console.log(`zemory brain — ${info.dbPath} (${info.sizeKB} KB)`);
    for (const t of info.tables) {
      console.log(`  ${t.name.padEnd(13)} ${String(t.rows).padStart(7)}${t.detail ? "   · " + t.detail : ""}`);
    }
    const remaining = vectorRemaining();
    console.log(
      `  ${"vec_chunks".padEnd(13)} ${String(vectorCount()).padStart(7)}   · semantic embeddings (RAG)${remaining ? ` · ${remaining} remaining` : ""}`,
    );
    return;
  }
  if (sub === "show") {
    const id = Number(args[1]);
    if (!id) {
      console.log("usage: zemory brain show <#id>");
      return;
    }
    const m = getMessage(id) as
      | { source: string; project_root: string | null; role: string; timestamp: string | null; content: string; title: string | null }
      | undefined;
    if (!m) {
      console.log(`zemory brain: no message #${id}.`);
      return;
    }
    console.log(`#${id} [${m.source}] ${m.project_root ?? "(unknown)"} · ${fmtDate(m.timestamp)} · ${m.role}`);
    if (m.title) console.log(`session: ${m.title}`);
    console.log("---");
    console.log(m.content);
    return;
  }
  if (sub === "where") {
    const s = storageInfo();
    console.log(`zemory brain where — ${s.dbPath}`);
    console.log(
      `  folder: ${s.dir}  (${s.source === "env" ? "GLOBAL_MEMORY_DB env" : s.source === "pointer" ? "saved pointer" : "default ~/.zemory"})`,
    );
    console.log(`  size: ${s.exists ? `${(s.sizeKB / 1024).toFixed(1)} MB` : "(no DB yet)"}  ·  pointer: ${s.pointer}`);
    if (s.onCloud) console.log("  ⚠ this folder looks cloud-synced — a live DB here can corrupt. Prefer a plain local folder.");
    if (s.pinnedByEnv) console.log("  note: GLOBAL_MEMORY_DB pins the location; `brain relocate` is disabled until you unset it.");
    return;
  }
  if (sub === "relocate") {
    const dir = positionalArgs(args.slice(1))[0];
    if (!dir) {
      console.log("usage: zemory brain relocate <folder> [--force]");
      console.log("  Move the brain DB (+ settings) to <folder>, off the system drive. Keeps a .bak of the old DB.");
      console.log("  --force: allow a cloud-synced / already-occupied target (risky).");
      return;
    }
    try {
      const r = relocateBrain(dir, { force: args.includes("--force") });
      if (r.pointerOnly) {
        console.log(`zemory brain relocate — storage folder set → ${r.to} (no DB to move yet; it will be created there).`);
        return;
      }
      console.log(`zemory brain relocate — moved brain → ${r.dbPath}`);
      console.log(
        `  ${(r.movedBytes / 1048576).toFixed(1)} MB · ${r.messages} message(s) verified · settings ${r.configMoved ? "moved" : "not found"}`,
      );
      if (r.backup) console.log(`  old DB kept as backup: ${r.backup}\n  (delete it once you've confirmed everything works — frees the old drive)`);
    } catch (error) {
      console.log(`zemory brain relocate: ${error instanceof Error ? error.message : "failed"}`);
      process.exitCode = 1;
    }
    return;
  }
  console.log(
    [
      "zemory brain <subcommand>",
      "",
      "  scan              ingest agent transcripts from known locations into the",
      "                    global brain (~/.zemory/global_memory.db) — fast, incremental.",
      "  scan --deep       walk the whole machine to find agents ANYWHERE.",
      "  scan-web [--platform chatgpt] [--limit N] [--refresh]",
      "                    capture web-chat (ChatGPT) via a login-once browser window",
      "                    (origin=web). Ingests in batches + resumes; --limit N pulls",
      "                    the N newest for a quick verify.",
      "  search <q> [--all] recall across the brain (scope: current project; --all = everywhere).",
      "  embed [--limit N] [--all] [--rebuild]",
      "                    build the semantic vector index (RAG, local EmbeddingGemma).",
      "                    Default: one 500-message batch with progress; --all catches up the corpus.",
      "                    --rebuild drops + re-embeds everything under the current embed profile",
      "                    (asymmetric Gemma query/document prompts; long messages chunked).",
      "  vacuum            reclaim freed pages (rewrites the whole DB file — run after structural surgery).",
      "  keygen <key-file> create a local share key (keep OUT of git).",
      "  backup [out.db]    raw local SQLite backup (use export for encrypted sharing).",
      "  restore <backup.db> [--force]",
      "                    restore a raw local SQLite backup; renames the previous DB aside.",
      "  export <out.zemory.enc> [--key-file <path>]",
      "                    encrypt global_memory.db into a shareable bundle.",
      "  import <in.zemory.enc> [--key-file <path>] [--force]",
      "                    decrypt a shared bundle into the local brain DB.",
      "  forget [selectors] [--force]",
      "                    dry-run/delete brain rows by --session, --project, --source, --before, or --message.",
      "  redact [--force]   re-apply secret redaction to already ingested brain rows.",
      "  bench             RAG gate benchmark: FTS-only vs hybrid recall on a labeled corpus.",
      "  show <#id>        print the full message for a search hit.",
      "  info              table row-counts of global_memory.db.",
      "  where             show where the brain DB lives (folder + size + pointer).",
      "  relocate <dir>    move the brain DB off C:\\ into <dir> (verified; keeps a .bak).",
      "  hosts             sessions by PC → source → project (per-machine provenance).",
      "  scope [ls|exclude|include|clear]",
      "                    provenance tree (Local/Web × machine × agent); exclude a lane",
      "                    from sync + recall (a filter, never a delete). Flags: --origin",
      "                    local|web  --host <machine>  --source <agent>.",
      "  digest [--all]     (re)build per-session summary digests (cheap-token recall lens).",
      "  digest <session>   show one session's digest (drill to messages via #id).",
      "  search <q> --digest  recall the DIGEST lane (session-level hits) instead of messages.",
      "",
      "  Local-only: transcripts are read and stored locally, never transmitted.",
    ].join("\n"),
  );
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    let d = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (d += c));
    process.stdin.on("end", () => resolve(d));
    setTimeout(() => resolve(d), 800); // safety: don't hang if no EOF
  });
}

// Body input: prefer `--file <path>` (read as UTF-8) over stdin. On Windows
// PowerShell, piping non-ASCII into a native exe's stdin corrupts UTF-8
// (diacritics → `?`), so `--file` is the safe path for Vietnamese content.
async function readBody(args: string[]): Promise<string> {
  const fi = args.indexOf("--file");
  if (fi >= 0 && args[fi + 1]) return readFileSync(args[fi + 1], "utf8");
  return readStdin();
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
  const planDir = join(root, "docs", "plan");

  if (sub === "import") {
    let files: string[];
    try {
      files = readdirSync(planDir).filter((f) => f.endsWith(".md"));
    } catch {
      console.log(`zemory plan: no ${planDir}`);
      return;
    }
    console.log(`zemory plan import — ${files.length} file(s) from docs/plan`);
    for (const f of files) {
      const r = importDoc(join(planDir, f), join("docs", "plan", f), root);
      console.log(`  ${r.roundTrip ? "✓" : "⚠"} ${f} — ${r.sections} sections${r.roundTrip ? "" : " · ROUND-TRIP DIFF (check)"}`);
    }
    return;
  }
  if (sub === "ls") {
    const docPath = args[1] ? args[1] : join("docs", "plan", "00_build_plan.md");
    const toc = listToc(docPath, root);
    if (!toc.length) {
      console.log(`zemory plan: no sections for ${docPath} — run \`zemory docs sync\` first (load docs → brain).`);
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
  if (sub === "render") {
    const docPath = args[1] ?? join("docs", "plan", "00_build_plan.md");
    const r = renderDoc(docPath, root);
    console.log(r ? `zemory plan render — wrote ${r.path} (${r.bytes} bytes)` : `zemory plan: no doc ${docPath}`);
    return;
  }
  if (sub === "set") {
    const id = Number(args[1]);
    if (!id) {
      console.log("usage: zemory plan set <#id> --file <path>   (or body via stdin)");
      console.log("         zemory plan set <#id> --heading \"<text>\"   (rename heading only)");
      console.log("  Windows: dùng --file (echo | pipe làm hỏng UTF-8 tiếng Việt).");
      return;
    }
    const hi = args.indexOf("--heading");
    if (hi >= 0) {
      // Heading-only edit: never touch stdin/body. argv is UTF-8 safe (title via argv works).
      const heading = args[hi + 1] ?? "";
      console.log(
        setHeading(id, heading, root)
          ? `zemory plan set — #${id} heading renamed + re-rendered`
          : `zemory plan: no section #${id} (or empty/multiline heading, or preamble)`,
      );
      return;
    }
    const body = await readBody(args);
    console.log(setBody(id, body, root) ? `zemory plan set — #${id} updated + re-rendered` : `zemory plan: no section #${id}`);
    return;
  }
  console.log(
    [
      "zemory plan <subcommand>   (plan lives in global_memory.db; .md is a render)",
      "",
      "  import            seed global_memory.db from docs/plan/*.md (one-time, fidelity-checked)",
      "  ls [doc]          table of contents (from db)",
      "  show <#id>        print a section's body",
      "  search <q> [--all] FTS over sections (heading-weighted)",
      "  set <#id>         replace a section body (--file/stdin), or rename heading (--heading)",
      "  render [doc]      regenerate the .md from db (db → md)",
    ].join("\n"),
  );
}

async function cmdDocs(args: string[]): Promise<void> {
  const sub = args[0];
  const root = findProjectRoot() ?? process.cwd();
  if (sub === "sync") {
    // Import ALL docs into global_memory.db (generic: classify by pattern; changelog
    // files routed to the changelog table). SAFE: writes DB only, .md untouched.
    const docs = importAll(root);
    console.log(`zemory docs sync — imported ${docs.length} file(s) → global_memory.db`);
    for (const d of docs) {
      const state = d.skipped ? "·" : d.roundTrip ? "✓" : "⚠";
      const action = d.skipped ? " — kept DB source" : d.kind === "changelog" ? "" : ` — ${d.sections} sections`;
      console.log(`  ${state} [${d.kind}] ${d.path}${action}`);
    }
    console.log("  (DB only — .md untouched. Prune with `docs rm`, regenerate with `docs render`.)");
    return;
  }
  if (sub === "ls") {
    const docs = listDocs(root);
    console.log(`zemory docs — ${docs.length} doc(s) in global_memory.db`);
    for (const d of docs) console.log(`  #${d.id} [${d.kind}] ${d.path} (${d.sections} sections)`);
    return;
  }
  if (sub === "add") {
    const rel = args[1];
    if (!rel || !rel.toLowerCase().endsWith(".md")) {
      console.log("usage: zemory docs add <docs/plan/name.md> --file <path> [--kind plan]");
      return;
    }
    const ki = args.indexOf("--kind");
    const kind = ki >= 0 ? args[ki + 1] : rel.replace(/\\/g, "/").startsWith("docs/plan/") ? "plan" : "doc";
    const body = await readBody(args);
    if (!body.trim()) {
      console.log("zemory docs add: body is empty (use --file).");
      process.exitCode = 1;
      return;
    }
    try {
      const result = createDoc(rel, body, root, kind);
      console.log(`zemory docs add — #${result.docId} [${kind}] ${result.path} (${result.sections} sections)`);
    } catch (error) {
      console.log(`zemory docs add: ${error instanceof Error ? error.message : "failed"}`);
      process.exitCode = 1;
    }
    return;
  }
  if (sub === "rm") {
    const rel = args[1];
    if (!rel) {
      console.log("usage: zemory docs rm <docs/...> [--keep-file]");
      return;
    }
    const removed = removeDoc(root, rel);
    let fileGone = false;
    if (!args.includes("--keep-file")) {
      try {
        unlinkSync(resolveDocPath(root, rel));
        fileGone = true;
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Unsafe docs path:")) throw error;
        /* file may not exist */
      }
    }
    console.log(
      removed || fileGone
        ? `zemory docs rm — ${rel}: ${removed ? "removed from DB" : "not in DB"}${fileGone ? " + deleted .md" : ""}`
        : `zemory docs rm — ${rel}: not found`,
    );
    return;
  }
  if (sub === "render") {
    const written = renderAll(root);
    const ch = renderChangelog(root, join(root, "docs", "agent", "04_CHANGES.md"));
    console.log(`zemory docs render — wrote ${written.length} doc mirror(s) + changelog (${ch} entries) [db → md]`);
    console.log("  ⚠ .md are now GENERATED mirrors — edit via `zemory plan set` / `changelog add`.");
    return;
  }
  console.log(
    [
      "zemory docs <subcommand>   (DB = source for all docs; .md = render mirror)",
      "",
      "  sync     import ALL docs (+changelog) from .md into global_memory.db (DB only, safe)",
      "  ls       list docs in global_memory.db (kind · sections)",
      "  add <p>  create a new DB-source markdown doc from --file",
      "  rm <p>   remove a doc from DB + delete its .md (--keep-file to keep)",
      "  render   (re)generate every .md mirror from global_memory.db (db → md, OVERWRITES)",
    ].join("\n"),
  );
}

async function cmdChangelog(args: string[]): Promise<void> {
  const sub = args[0];
  const root = findProjectRoot() ?? process.cwd();
  const mdPath = join(root, "docs", "agent", "04_CHANGES.md");

  if (sub === "import") {
    const replace = args.includes("--replace");
    const n = importChangelog(mdPath, root, undefined, { replace });
    console.log(
      `zemory changelog import — ${replace ? `replaced with ${n}` : `merged ${n} new`} entr(ies) from 04_CHANGES.md into global_memory.db`,
    );
    if (!replace) console.log("  (merge mode: existing entries + archived/supersede flags untouched; --replace to wipe-and-reseed)");
    return;
  }
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
  if (sub === "add") {
    const rest = args.slice(1);
    const fi = rest.indexOf("--file");
    if (fi >= 0) rest.splice(fi, 2); // drop --file <path> from the title
    const si = rest.indexOf("--supersedes");
    const supersedesId = si >= 0 ? Number(rest[si + 1]) : undefined;
    if (si >= 0) rest.splice(si, 2);
    const title = rest.join(" ");
    if (!title) {
      console.log("usage: zemory changelog add <title> [--file <path>] [--supersedes <#id>]");
      return;
    }
    const body = await readBody(args);
    try {
      const id = addEntry(root, title, body.trim(), undefined, undefined, supersedesId);
      renderChangelog(root, mdPath);
      console.log(`zemory changelog add — #${id} added + mirror rendered`);
    } catch (error) {
      console.log(`zemory changelog add: ${error instanceof Error ? error.message : "failed"}`);
      process.exitCode = 1;
    }
    return;
  }
  if (sub === "set") {
    const id = Number(args[1]);
    const di = args.indexOf("--date");
    const date = di >= 0 ? args[di + 1] : "";
    if (!id || !date) {
      console.log("usage: zemory changelog set <#id> --date YYYY-MM-DD");
      return;
    }
    if (!setEntryDate(root, id, date)) {
      console.log(`zemory changelog set: no scoped entry #${id}, or invalid date`);
      process.exitCode = 1;
      return;
    }
    renderChangelog(root, mdPath);
    console.log(`zemory changelog set — #${id} date=${date} + mirror rendered`);
    return;
  }
  if (sub === "render") {
    const out = args[1] ? join(root, args[1]) : mdPath;
    const n = renderChangelog(root, out);
    console.log(`zemory changelog render — wrote ${n} entr(ies) → ${out}`);
    return;
  }
  console.log(
    [
      "zemory changelog <subcommand>   (changelog lives in global_memory.db; .md is a render)",
      "",
      "  import           seed global_memory.db from docs/agent/04_CHANGES.md",
      "  ls               list entries (newest first)",
      "  search <q> [--all] FTS over entries",
      "  add <title>      add an entry (body from stdin)",
      "  set <#id>        update scoped metadata (--date YYYY-MM-DD)",
      "  render [out]     regenerate .md from db (db → md)",
    ].join("\n"),
  );
}

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
      "  archive   move old 04_CHANGES blocks to archive/ when over threshold",
      "  validate  check docs mirrors, links, changelog retention, and supersede",
      "  docs      ALL docs in global_memory.db: sync (import) · ls · render mirrors (db→md)",
      "  plan      doc sections in global_memory.db: ls · show · search · set · render (db→md)",
      "  changelog changelog in global_memory.db: import · ls · search · add · render (db→md)",
      "  brain     scan/search the global brain (brain scan | search | show)",
      "  mcp       run the local MCP stdio server (brain_search/show, plan_search/show)",
      "  hook      runtime hooks: install for Claude/Codex · session-start · stop",
      "  grill     interrogate the plan before building (workflow)",
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
  case "plan":
    await cmdPlan(args);
    break;
  case "docs":
    await cmdDocs(args);
    break;
  case "changelog":
    await cmdChangelog(args);
    break;
  case "brain":
    await cmdBrain(args);
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
