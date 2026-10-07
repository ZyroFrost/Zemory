// `zemory init|sync|migrate|doctor|archive|validate|setup|structure|grill|reindex`
// — the per-project docs harness lifecycle.
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readSync, readdirSync } from "node:fs";
import { relative, resolve, join } from "node:path";
import { analyzeMigration } from "../docs/migrate.js";
import { currentMemoryDir, currentMemoryDb } from "../memory/db.js";
import { currentProjectRoot, findProjectRoot, harnessPathsAt, loadContext, readMarker } from "../core/config.js";
import { createRuntime } from "../core/runtime.js";
import { ensureHarness, entryStates, freshHarness, syncCheck } from "../docs/adopt.js";
import { archiveChanges, archiveTodo } from "../docs/archive.js";
import { runCheck } from "../checks.js";
import { gatherStatus } from "../status.js";
import { validate } from "../docs/validate.js";
import { formatTodoVerify, verifyTodo } from "../docs/todo-verify.js";
import { conform } from "../docs/conform.js";
import { applyFix, monitorPaths, monitorSummary, pathsFixProposals, pathsSummary } from "../docs/paths.js";
import { listKnownProjects } from "../projects.js";
import { UNSUPPORTED, agentTargets, inspectAgent, inspectProtocol, wireAgent, writeProtocol } from "../mcpsetup.js";
import { importDoc, pruneMissingDocs } from "../docs/plan.js";
import { importChangelog } from "../docs/changelog.js";
import { GUARD_MATCHER, guardDrift, guardMatcherGaps } from "../docs/guard-gen.js";
import { desktopShortcutStatus, judgeLaunch, launchFacts, setDesktopShortcut } from "../platform/autostart.js";
import { getShortcutPrompted, setShortcutPrompted } from "../config/settings.js";
import { backupStale } from "../memory/backup-rotate.js";
import { uiPort } from "../ui.js";
import { cloudSyncReport, formatCloudReport } from "../memory/cloudguard.js";
import { uplinkReport, uplinkStaleMs } from "../memory/uplinkguard.js";
import { getDriveDir } from "../config/settings.js";
import { sweepScratchpads } from "../jobs/scratchpad.js";
import { applySkills, applyStandard, isStandardSource, skillDiff, stampRepo, standardDiff } from "../docs/standard.js";

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
  // (docs_template/05_app vs 03_nonapp). ensureHarness persists profile:"non-app" into
  // the config (app stays the implicit default). --non-app follows the NON-APP
  // standard (BI/data/docs/design — deliverables, no backend/frontend).
  const profile = args.includes("--non-app") ? "non-app" : undefined;
  const r = ensureHarness(process.cwd(), profile);
  if (profile === "non-app") {
    console.log('  profile: "non-app" (NON-APP standard — BI/data/docs/design; scaffolded from the nonapp/ template)');
  }
  const parts: string[] = [];
  if (r.createdConfig) parts.push("created .harness.json");
  parts.push(`added ${r.added.length} doc(s)`);
  if (r.present.length) parts.push(`kept ${r.present.length} existing (not overwritten)`);
  console.log(`zemory init — ${parts.join(", ")}.`);
  if (r.added.length) console.log(`  + ${r.added.join(", ")}`);
  printAdoptNotices(r);
}

/** ADAPT v2 — hai thông báo mà im lặng chính là lỗi (N1 + 4.2), in chung cho init/sync.
 *  Không in gì khi rỗng: trường hợp thường phải yên tĩnh. */
function printAdoptNotices(r: { untouchedLegacyPlan: string[]; entriesUnlinked: Array<{ file: string; pointer: string }> }): void {
  if (r.untouchedLegacyPlan.length) {
    console.log(`  · found the repo's OWN plan folder (NOT touched): ${r.untouchedLegacyPlan.join(", ")}`);
    console.log("    → to merge it into the harness plan, a person/agent moves it; the tool never moves the repo's files.");
  }
  for (const e of r.entriesUnlinked) {
    console.log(`  ⚠ ${e.file} is the repo's own copy and does NOT point to the harness yet — the harness will NOT be loaded through this entry.`);
    console.log(`    → add (after the user approves) a pointer line to ${e.file}:`);
    console.log(`      ${e.pointer}`);
  }
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
    console.log(`zemory migrate — inspecting \`${rep.docsDir}\`:`);
    const missing = rep.roles.filter((r) => !r.present).map((r) => r.file);
    console.log(`  standard files: ${rep.roles.length - missing.length}/${rep.roles.length} present` + (missing.length ? ` · MISSING: ${missing.join(" · ")}` : ""));
    if (rep.extras.length) {
      console.log(`  unknown files (${rep.extras.length}) — guessed role:`);
      for (const e of rep.extras.slice(0, 12)) console.log(`    · ${e.file}${e.guessRole ? `  →  ${e.guessRole}` : "  →  (no guess)"}`);
    }
    console.log(`  plan: ${rep.plan.hasPlanDir ? "docs/plan/ present" : "no docs/plan/ yet"}` + (rep.plan.specs.length ? ` · ${rep.plan.specs.length} loose spec(s)` : ""));
    console.log("");
  }
  console.log("zemory migrate — reconcile old docs to the standard (the app does NOT edit them; the agent does).");
  console.log("Full steps: docs/agent/03_STRUCTURE.md §8. Summary:");
  console.log("  1. zemory docs ls          — see which ones are duplicate/redundant (in the search index)");
  console.log("  2. zemory plan show <#id>  — read the content BEFORE deciding");
  console.log("  3. merge todos → 05_TODO; DELETE duplicate/redundant .md files outright (ASK the user if they still hold content)");
  console.log("  4. zemory reindex → zemory doctor (green = done)");
}

/** Shared skills (2026-10-04): what `--standard` adds/replaces, and what it leaves because the repo edited it. */
function printSkillApply(sk: Array<{ skill: string; file: string; action: string }>, apply: boolean): void {
  if (!sk.length) return;
  for (const s of sk) {
    const what =
      s.action === "kept-local"
        ? "edited in this repo — NOT overwritten, compare by hand"
        : s.action === "added" || s.action === "would-add"
          ? `${apply ? "added" : "would add"} (missing here)`
          : `${apply ? "replaced" : "would replace"} (unchanged copy of an older standard)`;
    console.log(`  ${s.action === "kept-local" ? "!" : apply ? "✔" : "→"} skill ${s.skill}/${s.file} — ${what}`);
  }
  const w = sk.filter((s) => s.action !== "kept-local").length;
  const k = sk.length - w;
  console.log(`  skills: ${apply ? "wrote" : "would write"} ${w} · edited locally ${k}${apply ? "" : "  — add `--apply` to write"}`);
}

export function cmdSync(args: string[] = process.argv): void {
  const ri = args.indexOf("--root");
  const root = ri >= 0 && args[ri + 1] ? resolve(args[ri + 1]) : currentProjectRoot();
  // `--standard` = áp BẢN SỬA của chuẩn vào file ĐÃ CÓ (plan/26 bước ③). Không phải lệnh mới:
  // HP điều 17 cấm hai lệnh cho một chức năng, và "đưa repo về đúng chuẩn" vốn đã là việc của `sync`.
  // MẶC ĐỊNH DRY-RUN — `--apply` mới ghi. Ghi vào repo khác chỉ xảy ra khi có CẢ `--root` lẫn `--apply`.
  // `--stamp` = MỒI: đóng dấu cho repo đã có harness mà chưa có dấu. Ngày trong dấu là ngày của bản
  // template mà file BÁM SÁT NHẤT, đo trên lịch sử git — không phải ngày hôm nay. Chỉ thêm một dòng
  // chú thích cuối file, không đụng nội dung.
  if ((args.includes("--stamp") || args.includes("--standard")) && isStandardSource(root)) {
    // Nói ra, đừng im: "không có gì để áp" ở repo nguồn nghe như "đã khớp", mà sự thật là KHÔNG ĐO.
    console.log(`zemory sync — ${root}`);
    console.log("  · this is the template SOURCE repo: the standard flows OUT from here, never back in (plan/26 §8).");
    return;
  }
  if (args.includes("--stamp")) {
    const apply = args.includes("--apply");
    const rep = stampRepo(root, { apply });
    console.log(`zemory sync --stamp${apply ? " --apply" : " (DRY-RUN)"} — ${root}`);
    // `stampRepo` reports its action as a Vietnamese phrase (docs/standard.ts, shared with the UI). The keys
    // below must match those values byte for byte; only the printed label is English.
    const stampLabel: Record<string, string> = {
      "không có file": "no file",
      "đã có dấu": "already stamped",
      "không bám bản chuẩn nào — phải xử tay": "follows no standard version — handle by hand",
      "đã đóng dấu": "stamped",
      "sẽ đóng dấu": "would stamp",
    };
    for (const r of rep) console.log(`  ${r.action === "đã đóng dấu" ? "✔" : r.action.startsWith("sẽ") ? "→" : "·"} ${r.file.padEnd(20)} ${stampLabel[r.action] ?? r.action}${r.date ? ` ${r.date}` : ""}${r.own !== undefined ? `  (own ${r.own} · missing vs base ${r.miss})` : ""}`);
    const n = rep.filter((r) => r.action.startsWith("sẽ") || r.action === "đã đóng dấu").length;
    console.log(`  ${apply ? `stamped ${n}` : `would stamp ${n}`}` + (apply ? "" : " — add `--apply` to write"));
    return;
  }
  if (args.includes("--standard")) {
    const apply = args.includes("--apply");
    const rep = applyStandard(root, { apply });
    const sk = applySkills(root, { apply });
    console.log(`zemory sync --standard${apply ? " --apply" : " (DRY-RUN)"} — ${root}`);
    printSkillApply(sk, apply);
    if (!rep.length) {
      console.log("  ✓ no file needs applying.");
      return;
    }
    for (const r of rep) {
      if (r.action === "skipped") console.log(`  ✗ ${r.file.padEnd(20)} SKIPPED — ${r.reason}`);
      else console.log(`  ${apply ? "✔" : "→"} ${r.file.padEnd(20)} ${r.verdict === "clean" ? "replace whole file" : "merge"} · +${r.added} −${r.removed}` +
            (r.superseded ? ` · ${r.superseded} spot(s) where the repo carries an OLD standard ⇒ take the new one` : ""));
    }
    const w = rep.filter((r) => r.action !== "skipped").length;
    const s = rep.filter((r) => r.action === "skipped").length;
    console.log(`\n  ${apply ? `wrote ${w}` : `would write ${w}`} · skipped ${s}` + (apply ? "" : "  — add `--apply` to really write"));
    if (s) console.log("  ✗ skipped files must be fixed BY HAND in that repo — the tool does not guess (plan/26 §4 layer C).");
    return;
  }
  // `--check` = DRY-RUN "chấm than update" (2026-08-21): chỉ ĐO repo này cũ chỗ nào so với
  // bộ chuẩn hiện hành, KHÔNG ghi gì. Cùng một phép đo với hook mỗi-phiên và /harness-updates.
  if (args.includes("--check")) {
    const sc = syncCheck(root);
    console.log(`zemory sync --check — ${root}`);
    if (!sc.connected) {
      console.log("  ✗ not connected — no .harness.json found.");
      process.exitCode = 1;
      return;
    }
    if (sc.appUpdate) {
      // Nói ĐÚNG nguồn đã trả lời: git (commit) hay tem kênh chung (máy đóng dấu). Câu cũ ghi
      // cứng "trên kênh chung" cho mọi ca ⇒ sau 15/09 nó sẽ khai sai nguồn.
      const u = sc.appUpdate;
      const where = u.source === "git" ? `on git (commit ${u.from || "?"})` : `on the shared channel (stamped by ${u.from} at ${u.at})`;
      console.log(`  ⚠ zemory ${u.have} — a NEWER version ${u.latest} is ${where}. Apply: \`zemory selfupdate\``);
    }
    if (sc.missing.length) {
      console.log(`  ⚠ ${sc.missing.length} file(s) of the current standard NOT received yet (run \`zemory sync\` to gap-fill):`);
      for (const f of sc.missing) console.log(`      + ${f}`);
    }
    if (sc.guardStale.length) {
      console.log(`  ⚠ guard OUT OF DATE: ${sc.guardStale.join(" · ")} — run \`zemory hook guard\` again`);
    }
    // Lệch CHỮ — file CÓ nhưng nội dung cũ (plan/26). Gap-fill không với tới ca này: `ensureHarness`
    // chỉ bù file THIẾU và không bao giờ ghi đè, nên một bản sửa chuẩn nằm mãi ở template. Báo ở ĐÂY
    // chứ không đẻ lệnh riêng — hỏi "repo này lệch chuẩn chỗ nào" thì chỉ nên có MỘT chỗ trả lời.
    const verdicts = standardDiff(root).files; // một lượt — mỗi file là một lời gọi git, đừng đo hai lần
    const drift = verdicts.filter((f) => f.verdict === "clean" || f.verdict === "local");
    const unsure = verdicts.filter((f) => f.verdict === "unknown");
    if (drift.length) {
      console.log(`  ⚠ ${drift.length} file(s) PRESENT but with outdated text (gap-fill does NOT reach them):`);
      for (const f of drift) {
        const how = f.verdict === "clean" ? "replaceable" : `${f.localLines} locally edited line(s)`;
        console.log(`      ~ ${f.file}  ${f.repoStamp} → ${f.tplStamp}  (${how} · standard changed ${f.standardLines} line(s))`);
      }
    }
    if (unsure.length) {
      console.log(`  ? ${unsure.length} file(s) not concluded yet: ${unsure.map((f) => f.file).join(" · ")}`);
      console.log(`      (${unsure[0].reason} — no base to compare against yet, see plan/26 §3)`);
    }
    // ✓ chỉ được in khi KHÔNG còn ô nào chưa đo được. "5 file chưa kết luận" đứng cạnh "đang khớp"
    // là một câu tự chống lại mình, và người đọc sẽ tin vế xanh (`02_RULES §Hành xử` — chưa xác minh
    // thì chưa phải sự thật).
    const skills = skillDiff(root).filter((s) => s.verdict !== "current");
    if (skills.length) {
      const byKind = (k: string): number => skills.filter((s) => s.verdict === k).length;
      console.log(
        `  ⚠ shared skills behind the standard: ${byKind("clean")} replaceable · ${byKind("absent")} missing · ${byKind("local")} edited locally (report only)`,
      );
      console.log("      → `zemory sync --standard` to see them, `--apply` to write");
    }
    const clean = !sc.missing.length && !sc.guardStale.length && !drift.length && !skills.some((s) => s.verdict !== "local");
    if (clean && !unsure.length) console.log("  ✓ no standard revision is waiting to be applied.");
    else if (clean) console.log("  · what could be measured matches; the part above is not concluded yet.");
    else process.exitCode = 1;
    return;
  }
  const r = ensureHarness(root);
  console.log(`zemory sync — ${root}`);
  if (r.createdConfig) console.log("  + created .harness.json");
  if (r.added.length) console.log(`  + added missing: ${r.added.join(", ")}`);
  if (r.present.length) console.log(`  · kept existing: ${r.present.join(", ")}`);
  // "kept existing" nói file CÒN, không nói nó còn ĐÚNG. Nếu chữ trong đó đã cũ thì phải nói ra ngay
  // tại đây, nếu không người chạy sync sẽ đọc dòng trên thành "xong rồi" (plan/26 §0).
  const behind = standardDiff(root).files.filter((f) => f.verdict === "clean" || f.verdict === "local");
  if (behind.length) {
    console.log(`  ⚠ ${behind.length} of those file(s) have outdated TEXT — gap-fill does not edit content.`);
    console.log(`    → details: \`zemory sync --check\``);
  }
  if (r.needsReconcile) {
    console.log("  ⚠ existing docs are non-standard — NOT auto-modified.");
    console.log("    → AGENT reconcile (steps: docs/agent/03_STRUCTURE.md §8, or `zemory migrate`):");
    console.log("      zemory docs ls  (view the index) · delete duplicate/obsolete .md files outright (00_INDEX, 02_CONTEXT…)");
    console.log("      zemory reindex  (rebuild the search index from .md)");
  } else if (!r.added.length && !r.createdConfig) {
    console.log("  ✓ already in sync (nothing to add).");
  }
  printAdoptNotices(r);
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
  console.log(`  ⚠ two config files: using ${live}`);
  console.log(`      orphan copy (NOT read): ${home} — delete it by hand if not needed`);
}

/**
 * Daemon 4444 đang ở trạng thái nào — hỏi bằng chính bề mặt của nó, không suy từ file/lockfile.
 *
 * 🔴 BA trạng thái, KHÔNG phải hai (vá 2026-09-02). Bản cũ trả `boolean` với timeout **600 ms** và
 * gộp mọi lỗi thành "không sống" ⇒ doctor in *"daemon KHÔNG chạy … Bật `zemory ui`"* **trong khi
 * daemon đang chạy thật** (quan sát 2026-09-02: `/ping` trả `pid 9144` ngay trước và ngay sau lượt
 * doctor đó). Lời khuyên sai còn tệ hơn im lặng.
 * Vì sao 600 ms chắc chắn trượt: `plan/14 §8` đã ĐO `/ping` lượt lạnh **12.347 ms** → 1.496 → 131.
 * Chính repo này đã viết đúng luật ở `ui.ts probeZemoryUi` (*"Timeout ≠ absent"*, trần 2.500 ms, ba
 * trạng thái) — vì ở ĐÓ đoán sai nghĩa là dựng daemon thứ hai và hỏng kho. Cùng một sự thật thì
 * phải cùng một câu, nên đường doctor nay theo cùng luật.
 * `absent` chỉ khi CHỐI KẾT NỐI (không ai lắng nghe — sự thật chắc chắn); hết giờ/lỗi khác ⇒
 * `unknown` (không biết), và bề mặt phải nói "không biết" chứ không được phán "đã chết".
 */
type DaemonLiveness = "alive" | "absent" | "unknown";

const PING_TIMEOUT_MS = 3_000;

async function daemonLiveness(): Promise<DaemonLiveness> {
  try {
    const r = await fetch(`http://127.0.0.1:${uiPort()}/ping`, { signal: AbortSignal.timeout(PING_TIMEOUT_MS) });
    const b = (await r.json()) as { app?: string };
    return b?.app === "zemory" ? "alive" : "unknown";
  } catch (error) {
    // CHỐI KẾT NỐI = không ai lắng nghe cổng đó ⇒ vắng mặt THẬT. Hết giờ / lỗi khác ⇒ có thể có
    // ai đó ở đó nhưng đang bận; gọi nó là "đã chết" chính là bề mặt nói dối.
    const code = (error as { cause?: { code?: string } })?.cause?.code;
    return code === "ECONNREFUSED" ? "absent" : "unknown";
  }
}

/** `_scratch_*` / `.tmp_*` files left in the repo — untracked or git-ignored — as repo-relative paths. Fail-open. */
export function scratchLeftovers(root: string | null | undefined): string[] {
  if (!root) return [];
  try {
    const run = (...a: string[]): string[] =>
      String(execFileSync("git", ["-C", root, "ls-files", "-o", ...a], { encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 }))
        .split(/\r?\n/)
        .filter(Boolean);
    const all = [...run("--exclude-standard"), ...run("-i", "--exclude-standard")];
    return [...new Set(all)].filter((p) => /(^|\/)(_scratch_|\.tmp_)[^/]*$/.test(p));
  } catch {
    return [];
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
  warnStrayConfig();
  console.log(
    `  setup: ${s.setup.complete ? "✓ done" : `○ ${s.setup.detail} (first-time → \`zemory setup\`)`}`,
  );

  // Leftover scratch files (02_RULES §Hành xử: `_scratch_*` / `.tmp_*` are deleted in the same turn; `.gitignore` HIDES,
  // it does not CLEAN). Untracked AND ignored files both count — that is where 1.56 GB once sat unseen.
  const junk = scratchLeftovers(s.project.root);
  if (junk.length) {
    console.log(`  scratch: ⚠ ${junk.length} leftover scratch file(s) — delete them (02_RULES §Hành xử): ${junk.slice(0, 5).join(" · ")}${junk.length > 5 ? " · …" : ""}`);
  }

  // Install / launch: right name and logo everywhere, no leftover launchers (user 2026-10-07).
  const lf = launchFacts();
  if (lf) {
    const bad = judgeLaunch(lf);
    if (bad.length) {
      console.log(`  launch: ✗ ${bad.length} problem(s) with how Zemory is installed or started`);
      for (const b of bad) console.log(`      ✗ ${b}`);
      process.exitCode = 1;
    } else {
      console.log(`  launch: ✓ daemon + launchers run as zemory.exe (name and logo), no leftover launcher files`);
    }
  }

  const missing = s.docs.filter((d) => !d.ok);
  console.log(`  docs: ${missing.length === 0 ? "✓ all present" : `✗ ${missing.length} missing (run \`zemory sync\`)`}`);
  for (const d of missing) console.log(`      ✗ ${d.file}`);

  // ADAPT v2 · 4.2 — trạng thái CỬA VÀO, ba mức chứ không phải hai. "Repo có bản riêng
  // chưa nối" phải nhìn thấy được: entry không trỏ tới harness thì mọi luật phía trong
  // thành vô hình, và trước đây trạng thái đó bị gộp im lặng vào "đã có".
  if (s.project.root) {
    const hp = harnessPathsAt(s.project.root);
    const agentRel = relative(s.project.root, hp.agent).replace(/\\/g, "/");
    const label = { linked: "linked", unlinked: "own copy, NOT linked", missing: "missing" } as const;
    const states = entryStates(s.project.root, hp.agent, hp.entries);
    const anyLinked = states.some((e) => e.state === "linked");
    const line = states.map((e) => `${e.file} (${label[e.state]})`).join(" · ");
    if (anyLinked) {
      console.log(`  entry: ✓ ${line}`);
    } else {
      console.log(`  entry: ⚠ ${line}`);
      console.log(`      → the harness is NOT loaded through any entry — add a pointer line to \`${agentRel}/\` (see \`zemory sync\`)`);
    }

    // ADAPT v2 · §4b ⓐ — "luật lớp ① chưa được cưỡng chế" phải có máy nhắc, đừng dựa
    // agent nhớ. Repo đã KHAI đường cấm (khoá `protected` trong marker) tức là đã nhận
    // mình có luật bất-khả-đảo — mà chưa sinh chốt thì luật đó chỉ có chữ gác, đúng lỗ
    // đã làm lộ secret 04/08. Chỉ BÁO; sinh hay không là quyết định của user.
    try {
      const mj = readMarker(s.project.root)?.data as { protected?: unknown } | undefined;
      const declared = Array.isArray(mj?.protected) && mj.protected.length > 0;
      const guardPath = join(hp.agent, "..", "hooks", "guard.cjs");
      if (declared && !existsSync(guardPath)) {
        console.log("  guard: ⚠ the marker declares `protected` but there is NO machine guard yet — layer ① rules are guarded by words only");
        console.log("      → run `zemory hook guard` to generate policy + guard from the marker (02_RULES §Guardrail layer ①)");
      } else if (existsSync(guardPath)) {
        // Guard KHÔNG tự làm mới — mỗi lần zemory vá guard, repo đã cắm giữ bản HỞ cho tới
        // khi ai đó NHỚ chạy lại `hook guard`. Đề xuất 05_TODO, thành máy sau ngày có HAI
        // vòng vá guard (2026-08-20). Chỉ báo file mang dấu zemory mà lệch bản sinh hôm nay.
        const stale = guardDrift(s.project.root);
        if (stale.length) {
          console.log(`  guard: ⚠ guard OUT OF DATE vs today's \`hook guard\` output: ${stale.join(" · ")}`);
          console.log("      → run `zemory hook guard` again (the guard does not refresh itself; the matcher is kept)");
        } else {
          console.log(`  guard: ✓ ${relative(s.project.root, guardPath).replace(/\\/g, "/")} (runtime wiring: see \`zemory hook guard\`)`);
        }
        // The WIRING, not just the files: a tool missing from the matcher never reaches the guard at all (2026-10-07).
        const settingsPath = join(s.project.root, ".claude", "settings.json");
        const gaps = guardMatcherGaps(existsSync(settingsPath) ? readFileSync(settingsPath, "utf8") : null);
        if (gaps === null) {
          console.log("  guard wiring: ⚠ .claude/settings.json does not run guard.cjs — the guard exists but nothing calls it");
          console.log(`      → PreToolUse matcher ${GUARD_MATCHER} → node ${relative(s.project.root, guardPath).replace(/\\/g, "/")}`);
        } else if (gaps.length) {
          console.log(`  guard wiring: ✗ the PreToolUse matcher skips ${gaps.join(" · ")} — those tools bypass every layer-① rule`);
          console.log(`      → set the matcher to ${GUARD_MATCHER} in .claude/settings.json`);
          process.exitCode = 1;
        } else {
          console.log("  guard wiring: ✓ every guarded tool goes through guard.cjs");
        }
      }
    } catch {
      /* marker hỏng — validate/conform đã có chỗ báo, doctor không lặp */
    }
  }

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

  // Kho ↔ vùng đồng bộ đám mây — BẢN ĐẦY ĐỦ chỉ đường (check `storage-safety` ở trên chỉ
  // in một dòng). `formatCloudReport` viết sau sự cố 04/08 (Drive cuốn cả kho + chìa lên
  // mây dạng TRẦN) nhưng nằm mồ côi 0 lời gọi từ đó (đo 2026-08-15 + 20) — lưới đỡ cho sự
  // cố ĐÃ XẢY RA THẬT mà không ai in ra. Nối tại đây; sạch thì im (không thêm dòng thừa).
  try {
    const cloud = formatCloudReport(cloudSyncReport(currentMemoryDir(), { dbPath: currentMemoryDb() }));
    if (cloud.trim()) for (const line of cloud.split("\n")) console.log(`  ${line}`);
  } catch {
    /* fail-open — check storage-safety phía trên đã có chỗ báo lỗi */
  }

  // Thư mục nháp — người dùng không có chỗ nào NHÌN THẤY nó chiếm bao nhiêu (đo 2026-08-20:
  // 2,9 GB tích lại trong khi scratchTick chưa chạy vì daemon còn mã cũ). `dryRun` chỉ báo.
  try {
    const sw = sweepScratchpads({ dryRun: true });
    if (sw.root) {
      const gb = (n: number): string => (n / 1024 ** 3).toFixed(2) + " GB";
      if (sw.removed.length) {
        const doomed = sw.removed.reduce((a, r) => a + r.bytes, 0);
        console.log(`  scratch: ○ ${gb(sw.totalBytes)} in scratch folders — scratchTick will clean ${sw.removed.length} session(s) (${gb(doomed)}) at the next 6-hour tick`);
      } else {
        console.log(`  scratch: ✓ ${gb(sw.totalBytes)} in scratch folders (within the cap)`);
      }
    }
  } catch {
    /* fail-open — báo cáo phụ, không được làm doctor chết */
  }

  // Tuổi bản sao lưu — mặt CUỐI CÙNG chưa có ai canh (audit 2026-08-21). Đo được ngày đó:
  // **27,0 giờ** không có bản mới vì job re-embed kho SONG SONG giữ khoá ghi của cả thư mục
  // `data/`, và `backupTick` nhường im lặng. Không bề mặt nào báo — `doctor` vẫn in toàn ✓.
  //
  // BA MỨC, không phải hai (audit 2026-08-23 — cùng mặt, lỗ khác): bản chỉ-có-✓-hoặc-✗ ở trần
  // 2 chu kỳ nghĩa là **trọn một ngày không backup vẫn hiện ✓**, tức chính `doctor` nói dối.
  //   ✓ trong chu kỳ · ○ quá 1 chu kỳ (chậm nhịp, THẤY ĐƯỢC nhưng không đỏ) · ✗ quá 2 (hỏng).
  // Và ca DAEMON TẮT phải nói riêng: lúc đó backup không "chậm", nó KHÔNG TỒN TẠI — đồng hồ
  // `backupTick` nằm trong daemon, daemon chết là không còn ai chép, bất kể tuổi bản hiện tại.
  try {
    const st = backupStale(currentMemoryDb());
    const hours = st.ageMs === null ? null : (st.ageMs / 3_600_000).toFixed(1);
    const age = hours === null ? "NO backup yet" : `newest backup is ${hours} h old`;
    const live = await daemonLiveness();
    if (st.stale) {
      failed = true;
      console.log(
        `  backup: ✗ ${age} — overdue (cap ${(st.limitMs / 3_600_000).toFixed(0)} h).` +
          ` Is another store writer holding the lock? Look for \`[scheduler] backup nhường …\` in logs/daemon.log`,
      );
    } else if (st.late) {
      console.log(
        `  backup: ○ ${age} — missed a tick (cycle ${(st.everyMs / 3_600_000).toFixed(0)} h).` +
          ` Not broken yet, but someone held the lock or the daemon was just down.`,
      );
    } else if (hours !== null) {
      console.log(`  backup: ✓ ${age}`);
    }
    // BA CÂU cho BA trạng thái. "Không trả lời" KHÔNG được nói thành "không chạy": lời khuyên
    // *Bật `zemory ui`* cho một daemon đang chạy là sai việc, và nó dạy người đọc nghi ngờ doctor.
    if (live === "absent") {
      console.log(
        "  backup: ○ daemon is NOT running (port refused the connection) ⇒ no clock is taking new backups." +
          " The age above is a snapshot of the past, not proof you are still protected. Start `zemory ui`.",
      );
    } else if (live === "unknown") {
      console.log(
        `  backup: ○ daemon did NOT ANSWER within ${(PING_TIMEOUT_MS / 1000).toFixed(0)}s — it may be BUSY, this is not proof it is dead` +
          " (measured in `plan/14 §8`: cold /ping 12.3s). Cannot tell yet whether anything is still taking new backups.",
      );
    }
  } catch {
    /* fail-open — báo cáo phụ, không được làm doctor chết */
  }

  // Bundle đã RỜI KHỎI MÁY chưa — sự cố 2026-08-11: client Drive kẹt hàng đợi, gói 317 MB +
  // bản bàn giao 1,63 GB nằm im 3 NGÀY trong khi `memory sync` vẫn báo "đã xuất" thành công.
  // "Đã ghi vào thư mục Drive" ≠ "đã lên mây"; khoảng giữa hai câu đó hỏng im lặng nên phải
  // có người canh (plan/18 mặt ⑨). Đọc SỔ của client (chỉ-đọc, fail-open) — user gật 24/08.
  try {
    const dd = getDriveDir();
    if (dd) {
      const up = uplinkReport(dd);
      const hrs = (ms: number): string => (ms / 3_600_000).toFixed(1);
      if (up.stuck.length) {
        failed = true;
        const worst = up.stuck[0];
        console.log(
          `  uplink: ✗ ${up.stuck.length} bundle(s) have NOT left this machine for over ${(uplinkStaleMs() / 60_000).toFixed(0)} min` +
            ` — oldest ${hrs(worst.ageMs)} h: ${worst.file} (${(worst.sizeBytes / 1024 ** 2).toFixed(1)} MB).` +
            ` The sync client's queue is stuck; the other machine receives NOTHING. Open the Drive client to check/restart it.`,
        );
      } else if (!up.journalFound) {
        console.log(`  uplink: ○ could not check — ${up.inconclusive[0] ?? "cannot read the DriveFS journal"}`);
      } else if (up.pending.length) {
        console.log(`  uplink: ○ ${up.pending.length} bundle(s) uploading (younger than the threshold — normal)`);
      } else if (up.departed > 0) {
        console.log(`  uplink: ✓ every bundle on Drive has reached the cloud (${up.departed} file(s) confirmed by the client journal)`);
      }
    }
  } catch {
    /* fail-open — sổ là của client, đọc lỗi không được làm doctor chết */
  }

  if (failed) process.exitCode = 1;
}

/**
 * `zemory archive [--dry-run]` — dọn hai file sổ.
 *
 * 🔴 CỜ LẠ BỊ TỪ CHỐI, KHÔNG BỎ QUA. Trước 2026-08-22 hàm này **không nhận đối số nào**, nên mọi
 * cờ rơi vào hư không và lệnh CHẠY THẬT — bẫy đúng hai lần trong một phiên: `archive --help` dời
 * 5 entry + 6 mục (người gõ tưởng đang đọc trợ giúp), rồi `archive --dry-run` in *"moved 2 closed
 * item(s)"* và **dời thật** (người gõ tưởng đang xem trước). Đây là lệnh DỜI NỘI DUNG giữa hai
 * file, nên hướng an toàn là **fail-closed**: không hiểu thì đừng làm gì.
 */
export function cmdArchive(args: string[] = []): void {
  const flags = args.filter((a) => a.startsWith("-"));
  const unknown = flags.filter((f) => f !== "--dry-run");
  if (unknown.length) {
    console.log(`zemory archive: unknown flag: ${unknown.join(" ")}`);
    console.log("  usage: zemory archive [--dry-run]");
    console.log("  (--dry-run only counts, it writes nothing. This command MOVES content between two files,");
    console.log("   so an unknown flag is refused rather than ignored.)");
    process.exitCode = 1;
    return;
  }
  const dryRun = flags.includes("--dry-run");
  const root = findProjectRoot();
  if (!root) {
    console.log("zemory archive: not connected — run `zemory init` first.");
    process.exitCode = 1;
    return;
  }
  const ctx = loadContext(root);
  if (dryRun) console.log("zemory archive — DRY RUN: nothing will be written.");
  // Both per-session logs get trimmed: 06_CHANGES by oldest ENTRY, 05_TODO by
  // closed ITEM. They fill up at different rates, so each has its own threshold.
  const r = archiveChanges(ctx, currentMemoryDb(), { dryRun });
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
    // 🔴 Xem trước phải nói "SẼ", không nói "đã" — audit 25/09: dry-run in "marked … archived" trong khi
    // không ghi gì, đúng kiểu bề mặt nói dối mà cờ này sinh ra để tránh.
    console.log(
      dryRun
        ? `zemory archive: would archive ${r.moved} old entr(ies).`
        : `zemory archive: marked ${r.moved} old entr(ies) archived in global_memory.db.`,
    );
    console.log(`  active 06_CHANGES.md ${dryRun ? "would be" : "now"} ${r.activeLines} lines (history remains searchable).`);
  }
  const t = archiveTodo(ctx, currentMemoryDb(), { dryRun });
  if (t.moved === 0) {
    console.log(`  05_TODO.md = ${t.activeLines} lines, 0 closed item(s) to move (this file has no threshold).`);
  } else {
    console.log(`  ${dryRun ? "would move" : "moved"} ${t.moved} closed item(s) to docs/agent/archive/05_TODO.md.`);
    console.log(`  active 05_TODO.md ${dryRun ? "would be" : "now"} ${t.activeLines} lines (open work only).`);
  }
  // NEVER silent (2026-10-04): a 1,328-line ledger once answered "0 closed items" while holding 10+
  // closed hand-off blocks, and every agent read that as "clean". Say what was left and why.
  const leftClosed = t.flagged ?? [];
  if (leftClosed.length) {
    console.log(`  ${leftClosed.length} block(s) look closed but were NOT moved — close them by hand after checking:`);
    for (const fl of leftClosed.slice(0, 20)) {
      const why = fl.reason === "has-open-items" ? "still contains an open [ ] / [~] item" : "marked only with ✅ (numbered item or heading) — use [x] if it is really done";
      console.log(`    line ${fl.line}: ${why} — ${fl.text}`);
    }
    if (leftClosed.length > 20) console.log(`    … and ${leftClosed.length - 20} more`);
  }
  if ((t.handoffs ?? 0) > 1) {
    console.log(`  ${t.handoffs} hand-off blocks are still in 05_TODO.md — only the latest should remain; close or remove the older ones.`);
  }
}

/**
 * `zemory conform [--json] [--gate]` — chấm ĐỘ BÁM CHUẨN của repo.
 *
 * Khác `validate` (bộ docs harness có đúng khuôn không): lệnh này hỏi CODE + DOCS có bám
 * chuẩn đã KHAI không. Máy chấm miễn phí, ra bảng lệch ngắn để agent đọc (~vài trăm token)
 * thay vì nạp cả graph (~56k token). `--gate` → exit 1 khi có mục `blocking`, dùng cho CI.
 */
/** `zemory paths check [--gate] [--strict] [--json] [--root <dir>] [--reset-baseline]` and
 *  `zemory paths sweep [--root <dir>]… [--json]` — plan/21.
 *  `check`: one project, full report + monitor. `--gate` flips the exit code on NEWLY dead (what the
 *  official UI row reports); `--strict` on any dead. `history`/`unresolved` never change the exit code.
 *  `sweep`: every connected project in the registry (or the given roots), monitor only, never exits ≠0 —
 *  this is what the scheduler runs every maintain chain so rot is caught when it happens. */
export function cmdPaths(args: string[]): void {
  if (args[0] === "sweep") return cmdPathsSweep(args.slice(1));
  if (args[0] === "fix") return cmdPathsFix(args.slice(1));
  if (args[0] !== "check") {
    console.log("usage: zemory paths check [--gate|--strict] [--json] [--root <dir>] [--reset-baseline]\n       zemory paths sweep [--root <dir>]... [--json]\n       zemory paths fix [--root <dir>] [--all] [--apply] [--json]   (default: dry-run, newly dead only)");
    process.exitCode = 1;
    return;
  }
  const ri = args.indexOf("--root");
  const root = ri >= 0 && args[ri + 1] ? resolve(args[ri + 1]) : findProjectRoot();
  if (!root) {
    console.log("zemory paths check: not connected — run `zemory init` first (or pass --root <dir>).");
    process.exitCode = 1;
    return;
  }
  const rep = monitorPaths(loadContext(root), { resetBaseline: args.includes("--reset-baseline") });
  const red = (args.includes("--gate") && rep.monitor.newlyDead.length > 0) || (args.includes("--strict") && !rep.ok);
  if (args.includes("--json")) {
    console.log(JSON.stringify(rep, null, 2));
    if (red) process.exitCode = 1;
    return;
  }
  console.log(`zemory paths check — dead paths in docs/config (${root})`);
  console.log(`  ${pathsSummary(rep)}`);
  console.log(`  monitor: ${monitorSummary(rep)}`);
  if (rep.monitor.newlyDead.length) {
    console.log(`\n  ✗ NEWLY DEAD (${rep.monitor.newlyDead.length}) — alive at the baseline, dead now (this is the rot signal):`);
    for (const h of rep.monitor.newlyDead.slice(0, 60)) console.log(`      ${h.file}:${h.line}  ${h.text}`);
  }
  console.log(`  roots judged: ${rep.roots.used.length}/${rep.roots.declared.length}` + (rep.roots.absent.length ? ` · absent here (skipped, not dead): ${rep.roots.absent.join(" · ")}` : ""));
  const CAP = 60;
  if (rep.dead.length) {
    console.log(`\n  ✗ DEAD (${rep.dead.length}) — under a declared root, target does not exist:`);
    for (const h of rep.dead.slice(0, CAP)) console.log(`      ${h.file}:${h.line}  ${h.text}`);
    if (rep.dead.length > CAP) console.log(`      … +${rep.dead.length - CAP}`);
  } else {
    console.log("\n  ✓ no dead paths.");
  }
  if (rep.history.length) {
    console.log(`\n  · historical (${rep.history.length}) — archive/attic/changelog/dated lines; a record, not a defect:`);
    for (const h of rep.history.slice(0, 8)) console.log(`      ${h.file}:${h.line}  ${h.text}`);
    if (rep.history.length > 8) console.log(`      … +${rep.history.length - 8}`);
  }
  if (rep.unresolved.length) {
    const byReason = new Map<string, number>();
    for (const h of rep.unresolved) byReason.set(h.reason ?? "?", (byReason.get(h.reason ?? "?") ?? 0) + 1);
    const parts = [...byReason.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`);
    console.log(`\n  · unresolved (${rep.unresolved.length}) — no verdict, by reason: ${parts.join(" · ")}`);
    for (const [reason] of [...byReason.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)) {
      const ex = rep.unresolved.filter((h) => h.reason === reason).slice(0, 2);
      for (const h of ex) console.log(`      [${reason}] ${h.file}:${h.line}  ${h.text || "(unreadable file)"}`);
    }
  }
  if (red) process.exitCode = 1;
}

/** `paths fix`: PROPOSE repairs (unique basename); write only with `--apply`. Dry-run is the default because a wrong
 *  rewrite is worse than a report — the same reason the UI needs a tick + click (plan/21 §5.6). */
function cmdPathsFix(args: string[]): void {
  const ri = args.indexOf("--root");
  const root = ri >= 0 && args[ri + 1] ? resolve(args[ri + 1]) : findProjectRoot();
  if (!root) {
    console.log("zemory paths fix: not connected — run `zemory init` first (or pass --root <dir>).");
    process.exitCode = 1;
    return;
  }
  const r = pathsFixProposals(loadContext(root), { newlyOnly: !args.includes("--all") });
  const apply = args.includes("--apply");
  const fixable = r.proposals.filter((p) => p.to);
  const results = apply ? fixable.map((p) => applyFix(root, { file: p.file, line: p.line, from: p.from, to: p.to as string })) : [];
  if (args.includes("--json")) {
    console.log(JSON.stringify({ root, proposals: r.proposals, applied: results }, null, 2));
    return;
  }
  console.log(`zemory paths fix — ${apply ? "APPLIED" : "dry-run"} (${root}) · ${args.includes("--all") ? "all dead" : "newly dead"}: ${r.proposals.length} · proposable ${fixable.length}`);
  for (const p of r.proposals) {
    const tag = p.to ? "→" : "—";
    console.log(`  ${p.to ? "✎" : "·"} ${p.file}:${p.line}  ${p.from}  ${tag}  ${p.to ?? p.reason + (p.candidates?.length ? " (" + p.candidates.join(" · ") + ")" : "")}`);
  }
  if (apply) {
    const ok = results.filter((x) => x.ok).length;
    console.log(`  applied ${ok}/${results.length}` + results.filter((x) => !x.ok).map((x) => `\n  ✗ ${x.file}:${x.line} ${x.error}`).join(""));
    if (ok !== results.length) process.exitCode = 1;
  } else if (fixable.length) {
    console.log("  (dry-run — pass --apply to write these; only that string on that line is replaced, EOL kept)");
  }
}

function cmdPathsSweep(args: string[]): void {
  const roots: string[] = [];
  for (let i = 0; i < args.length; i++) if (args[i] === "--root" && args[i + 1]) roots.push(resolve(args[++i]));
  const targets = roots.length ? roots : listKnownProjects().map((p) => p.root);
  const out: Array<{ root: string; newlyDead: number; dead: number; files: number; baselined: boolean; error?: string }> = [];
  for (const root of targets) {
    try {
      const r = monitorPaths(loadContext(root));
      out.push({ root, newlyDead: r.monitor.newlyDead.length, dead: r.dead.length, files: r.scanned.files, baselined: r.monitor.baselined });
    } catch (e) {
      // One broken project must not stop the sweep of the others (điều 9).
      out.push({ root, newlyDead: 0, dead: 0, files: 0, baselined: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  if (args.includes("--json")) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  console.log(`zemory paths sweep — ${out.length} project(s)`);
  for (const o of out) {
    const tag = o.error ? `✗ ${o.error}` : o.baselined ? `baseline · ${o.dead} legacy dead` : o.newlyDead ? `⚠ ${o.newlyDead} newly dead` : `✓ 0 newly dead`;
    console.log(`  ${tag.padEnd(28)} ${o.root}  (${o.files} files)`);
  }
}

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
  console.log(`zemory conform — conformance to the standard (${root})`);
  console.log(
    `  ${s.files} file(s) · slots used ${s.slotsUsed}/${s.slotsDeclared} · articles ${s.hpDieu} · skills ${s.skills}`,
  );
  if (!rep.items.length) {
    console.log("  ✓ no deviation from the standard.");
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

/**
 * LỐI TẮT LÚC CÀI — mô tả rõ, rồi HỎI (user chốt 2026-09-15).
 *
 * Vì sao phải hỏi ở đây *và* trong cửa sổ app: lệnh cài thường do agent/CI chạy, **không có
 * người gõ**. Một prompt ngồi chờ stdin ở đó là treo phiên — đúng kiểu hỏng `02_RULES` cấm. Nên:
 * có TTY thật thì hỏi ngay tại đây; không có thì **không hỏi**, chỉ nói ra là app sẽ hỏi lần mở
 * đầu, và nêu cờ để bản cài theo kịch bản tự quyết.
 *
 * Vì sao phải mô tả chứ không chỉ hỏi: trước đợt này zemory VẪN tạo mục Start Menu (từ lâu), mà
 * không bề mặt nào nói ra — nhãn duy nhất là *"Lối tắt Desktop"*. User đọc thành "chưa có chức
 * năng này". Thứ tồn tại mà không ai biết thì bằng không tồn tại.
 */
function printShortcutPlan(): void {
  const st = desktopShortcutStatus();
  console.log("  Shortcuts to create (open the app in one click, NO black console window):");
  if (!st.supported) {
    console.log(`    · this platform is not supported yet — ${st.detail ?? ""}`);
    return;
  }
  const line = (label: string, t?: { path: string; exists: boolean }): void => {
    if (!t) return;
    console.log(`    · ${label.padEnd(10)} ${t.path}${t.exists ? "   [exists]" : ""}`);
  };
  line("Start Menu", st.startMenu);
  line("Desktop", st.desktop);
  console.log("    Remove/recreate any time: ⚙ Settings → Shortcuts. No registry changes, no service installed.");
}

/** Hỏi Y/n trên TTY THẬT. Không phải TTY ⇒ trả `null` (chưa hỏi), KHÔNG chờ stdin. */
function askYesNo(question: string): boolean | null {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return null;
  try {
    // Đọc một dòng bằng fd 0 — `readline` cần vòng lặp sự kiện, mà lệnh này chạy đồng bộ.
    process.stdout.write(question);
    const buf = Buffer.alloc(64);
    const n = readSync(0, buf, 0, 64, null);
    const answer = buf.subarray(0, n).toString("utf8").trim().toLowerCase();
    return answer === "" || answer === "y" || answer === "yes" || answer === "c" || answer === "có";
  } catch {
    return null; // đọc hỏng ⇒ coi như chưa hỏi, để app hỏi lại. Không bao giờ chặn lượt cài.
  }
}

// AGENTS.md = router thuần (điều hướng). Luật/quy trình sống ở docs/agent/*. Print short install steps + pointer.
export function cmdSetup(args: string[] = []): void {
  if (args[0] === "mcp") {
    cmdSetupMcp(args.slice(1));
    return;
  }
  console.log("zemory setup — install & use:");
  console.log("  1. npm i -g zemory                 — global install (the `zemory` command)");
  console.log("  2. cd <project> && zemory init     — scaffold the harness (or `zemory ui` → Setup)");
  console.log("  3. zemory doctor");
  console.log("  4. zemory setup mcp                 — wire zemory into MCP-speaking agents (Claude Code/Desktop · Cursor · Windsurf · Gemini)");
  console.log("");
  printShortcutPlan();

  // Cờ cho bản cài theo kịch bản: quyết dứt khoát, không cần TTY.
  const forced = args.includes("--shortcut") ? true : args.includes("--no-shortcut") ? false : null;
  if (forced !== null) {
    const st = setDesktopShortcut(forced);
    setShortcutPrompted(true);
    console.log(`  → shortcuts ${forced ? "created" : "skipped"}${st.detail ? ` (⚠ ${st.detail})` : ""}`);
  } else if (getShortcutPrompted()) {
    console.log("  (already asked at a previous install — to change your mind, go to ⚙ Settings → Shortcuts)");
  } else {
    const yes = askYesNo("  Create Start Menu + Desktop shortcuts now? [Y/n] ");
    if (yes === null) {
      console.log("  (nobody is typing here ⇒ NOT asking — the app window will ask on first open.");
      console.log("   Scripted install: `zemory setup --shortcut` or `--no-shortcut`.)");
    } else {
      const st = setDesktopShortcut(yes);
      setShortcutPrompted(true);
      console.log(`  → shortcuts ${yes ? "created" : "skipped"}${st.detail ? ` (⚠ ${st.detail})` : ""}`);
    }
  }
  console.log("");
  console.log("Session entry point: AGENTS.md at the root (ask app/non-app before init). Rules + workflows (editing docs · reconcile · grill): docs/agent/* (02_RULES + 03_STRUCTURE Reconcile).");
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
    console.log("zemory setup mcp — wire zemory into MCP-speaking agents (LIST only; name an agent to write)");
    for (const t of targets) {
      const state = inspectAgent(t);
      const mark = state === "wired" ? "✓ wired" : state === "present-not-wired" ? "○ file present, not wired" : state === "bad-json" ? "⚠ broken JSON file" : t.path ? "· no file yet" : "· not installed";
      const memo: Record<string, string> = {
        installed: "✓ protocol installed",
        stale: "○ protocol outdated",
        absent: "○ no protocol yet",
        "no-file": "· no file yet",
        "broken-marker": "⚠ broken block",
        unsupported: "— not applicable",
      };
      console.log(`  ${mark.padEnd(26)} ${t.id.padEnd(15)} ${t.path ?? `(not found: ${t.candidates[0]})`}`);
      const memoWhere = t.memo ?? t.memoCandidates[0];
      console.log(
        `  ${" ".repeat(26)} ${"↳ protocol".padEnd(15)} ${memo[inspectProtocol(t)]}` +
          (memoWhere ? ` — ${memoWhere}` : t.memoWhy ? ` (${t.memoWhy})` : ""),
      );
    }
    console.log("");
    console.log("  write to one agent:  zemory setup mcp <agent> [--force]");
    console.log("  valid agents:        " + targets.map((t) => t.id).join(" · "));
    console.log("  each write does TWO things: declares the server + installs the PROTOCOL for when to call memory (`--no-protocol` skips the second)");
    console.log("  always backs up to .bak before writing · NEVER touches other servers in the file");
    console.log("  cannot be wired automatically yet (wire by hand): " + UNSUPPORTED.map((u) => `${u.id} — ${u.why}`).join(" · "));
    // 🔄 ĐẢO 2026-08-27 — đo trên máy thật thì vế cũ SAI.
    // Câu cũ: "Cowork KHÔNG dùng được MCP: nó chạy trong máy ảo riêng, không với tới `zemory`
    // trên máy thật." Nó viết CÙNG LÚC với lỗ đường dẫn MSIX (`mcpsetup.ts`), nên chưa bao giờ
    // thử được — và không ai thử lại. Nghiệm thu 27/08: nối MCP vào Claude Desktop (bản Store)
    // rồi hỏi trong một phiên COWORK ⇒ nó liệt kê đủ `mcp__zemory__memory_*` và `memory_stats`
    // trả về ĐÚNG kho chung: `messages` 303.977 — khớp tuyệt đối với số đo cùng thời điểm ở
    // máy thật, trong khi số đo 30 phút trước là 303.434. Trùng đúng con số ĐANG THAY ĐỔI là
    // bằng chứng nó đọc kho SỐNG, không phải bản sao.
    console.log("  ⓘ Cowork CAN use MCP through Claude Desktop (accepted 2026-08-27): wire `claude-desktop`");
    console.log("    and a Cowork session sees `mcp__zemory__memory_*` and reads the REAL shared store, not a copy.");
    return;
  }
  const target = targets.find((t) => t.id === pick);
  if (!target) {
    console.log(`zemory setup mcp: unknown agent "${pick}". Valid: ${targets.map((t) => t.id).join(" · ")}`);
    process.exitCode = 1;
    return;
  }
  const r = wireAgent(target, force);
  const why: Record<string, string> = {
    already: "already wired (use --force to overwrite)",
    "no-parent-dir": "config folder not found — this agent does not seem to be installed on this machine",
    "bad-json": "the config file is not valid JSON — NOT overwritten, fix it by hand first",
  };
  if (r.wrote) {
    console.log(`zemory setup mcp — ${r.reason === "replaced" ? "overwrote" : "wired"} zemory into ${target.label}`);
    console.log(`  server:   ${target.path}`);
    if (r.backup) console.log(`  backup:   ${r.backup}`);
  } else {
    console.log(`zemory setup mcp — server NOT written: ${why[r.reason] ?? r.reason}`);
    console.log(`  server:   ${target.path ?? `(not found: ${target.candidates[0]})`}`);
    if (r.reason === "bad-json") process.exitCode = 1;
  }

  // Vế hai: khai server chỉ cho agent CÓ tool; lời dặn mới làm nó BIẾT LÚC NÀO gọi.
  if (!args.includes("--no-protocol")) {
    const p = writeProtocol(target);
    const pw: Record<string, string> = {
      added: "protocol installed",
      updated: "protocol updated (the old copy was replaced in place)",
      already: "protocol is already the latest version",
      "broken-marker": "⚠ the old block is missing its closing marker — NOT written, fix it by hand and run again",
      "no-parent-dir": "folder not found — this agent does not seem to be installed",
      unsupported: `not applicable${target.memoWhy ? ` (${target.memoWhy})` : ""}`,
    };
    console.log(`  protocol: ${pw[p.reason] ?? p.reason}`);
    if (p.path) console.log(`            ${p.path}`);
    if (p.backup) console.log(`            backup: ${p.backup}`);
    if (p.reason === "broken-marker") process.exitCode = 1;
  }
  if (r.wrote) console.log("  → restart that agent so it loads the new server.");
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
      "  <repo>/data/global_memory.db        — memory (episodic sessions) + derived docs INDEX (rebuilt from .md)",
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
  // ADAPT v2 · N2 — nhà của harness lấy từ MARKER. Bản trước ghép cứng `docs/plan` và
  // `docs/agent`, nên repo đặt harness ở `harness/` chạy `reindex` được một chỉ mục RỖNG
  // mà không báo lỗi gì: lệnh in "0 plan doc" như thể repo không có spec nào. Đường ghi vào
  // index cũng phải là đường THẬT, không thì `plan search` trả về đường dẫn không tồn tại.
  const hp = harnessPathsAt(root);
  // KHÔNG chuẩn hoá sang `/`: index hiện lưu đường theo separator của OS (đo 2026-08-07 —
  // 23 doc row của repo này đều dạng `docs\agent\…`), và mọi chỗ TRA cũng ghép bằng `join`.
  // Đổi một đầu sang posix là đẻ doc row TRÙNG cho cùng một file, rồi `plan ls`/`plan search`
  // tra dạng này lại không khớp dạng kia. Muốn chuyển sang posix thì đó là một migration
  // riêng (đổi cả index cũ), không phải việc của đợt vét literal.
  const rel = (p: string) => relative(root, p);
  const planDir = hp.plan;
  let files: string[] = [];
  try {
    files = readdirSync(planDir).filter((f) => f.endsWith(".md"));
  } catch {
    /* no docs/plan */
  }
  let sections = 0;
  for (const f of files) {
    const r = importDoc(join(planDir, f), rel(join(planDir, f)), root, "plan");
    sections += r.sections;
    if (!r.roundTrip) console.log(`  ⚠ ${f} — round-trip diff (unusual structure; indexed anyway)`);
  }
  // Harness docs are searchable content too — the backlog especially. Before this,
  // `reindex` covered docs/plan/* and 06_CHANGES only, so 05_TODO (the biggest file
  // in docs/agent) was reachable by grep alone, and its archive doubly so. Indexed
  // under their own `kind` so they stay distinguishable from plan specs.
  // 06_CHANGES is excluded on purpose: it has a dedicated changelog lane and would
  // otherwise be indexed twice.
  const agentDir = hp.agent;
  const arcDir = hp.archive;
  const mdIn = (dir: string) => {
    try {
      return readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "06_CHANGES.md");
    } catch {
      return [];
    }
  };
  let agentDocs = 0;
  for (const f of mdIn(agentDir)) {
    importDoc(join(agentDir, f), rel(join(agentDir, f)), root, "agent");
    agentDocs++;
  }
  for (const f of mdIn(arcDir)) {
    importDoc(join(arcDir, f), rel(join(arcDir, f)), root, "agent-archive");
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

  const chPath = join(agentDir, "06_CHANGES.md");
  const ch = existsSync(chPath) ? importChangelog(chPath, root, undefined, { replace: true }) : 0;
  // The ARCHIVE is a source file too — outside the per-session read, but git-tracked
  // and rebuildable. Index it as its own tier so old decisions stay searchable
  // (plan/02 §3). Skipping this is why `changelog search` used to miss everything
  // older than the last trim.
  const chArc = join(arcDir, "06_CHANGES.md");
  const arc = existsSync(chArc)
    ? importChangelog(chArc, root, undefined, { replace: true, archived: true })
    : 0;
  console.log(
    `zemory reindex — ${files.length} plan doc(s) · ${agentDocs} harness doc(s) · ${deadDocs} dead plan(s) (attic/dead-plans) · ${sections} section(s) · ${ch} changelog entr(ies) + ${arc} archived → search index (reads .md, NEVER writes back).` +
      (pruned ? `\n  pruned ${pruned} orphan doc row(s) (the .md file is no longer on disk).` : ""),
  );
}

// zemory graph — file-level graph queries (plan 13 §9 Phase A/B).
//   impact <file>   ADVISORY blast-radius: importers (direct + transitive) + hub flag.
//   fitness [--gate] deterministic health metrics; --gate exits 1 on failure (CI).


/**
 * `zemory todo verify` — đo lại từng mục `05_TODO` bằng CODE, in bảng LỆCH.
 *
 * Gate: exit 1 khi có lệch, để nối được vào `npm run check` như mọi cổng khác. Luật
 * `02_RULES §Hành xử` đòi "soát sổ = đo lại"; lệnh này là phần MÁY của đòi hỏi đó.
 */
export function cmdTodoVerify(args: string[]): void {
  const sub = args[0];
  if (sub && sub !== "verify") {
    console.log("usage: zemory todo verify");
    console.log("  Re-measures every 05_TODO item against the code (do the files/symbols/endpoints it names really exist).");
    process.exitCode = 1;
    return;
  }
  const root = currentProjectRoot();
  try {
    const rep = verifyTodo(root);
    console.log(formatTodoVerify(rep));
    if (rep.findings.length) process.exitCode = 1;
  } catch (error) {
    console.log(`zemory todo verify: ${error instanceof Error ? error.message : "failed"}`);
    process.exitCode = 1;
  }
}
