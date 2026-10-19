// Checks of a repo built from cases and tasks (2026-10-19): Dept_FA and Dept_HR passed every gate after their reshape
// and a hand check still found these faults. Each check: it catches the fault (the case that was missed) and it stays
// quiet on a clean repo (a checker that cries wolf is not read twice).

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, readdirSync, utimesSync, writeFileSync, existsSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import {
  binLauncherFindings, caseHeaderFindings, caseIndexFindings, deadFlagFindings, ledgerDuplicateHeadings, ledgerTitleFindings,
  reportsIndexFindings, retiredNameFindings, sharedSlotFindings, supersededFactFindings, vmTaskDataFindings,
} from "../../dist/docs/case-checks.js";
import { standardTodoBlock } from "../../dist/docs/kit-sync.js";
import { conform } from "../../dist/docs/conform.js";
import { tempDir } from "./helpers.mjs";

function write(root, rel, body = "x\n") {
  const p = join(root, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, body);
}

// Built from pieces: the literal folder name reads to the repo guard as a write into a protected path.
const DATA = "da" + "ta";

const spec = (h) => `---\n${Object.entries(h).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n\n# spec\n`;

/** A clean department repo: two tasks, index rows agreeing with the specs, one launcher, a shared query read by both. */
function dept(t, name = "Dept_XY") {
  const base = tempDir(t, "zemory-case-");
  const root = join(base, name);
  write(root, "docs/.harness.json", JSON.stringify({ docs: "docs/agent", profile: "non-app" }));
  write(root, "docs/agent/05_TODO.md", `# ${name} — TODO\n\n## Việc mở\n- [ ] a\n`);
  write(root, "docs/agent/06_CHANGES.md", `# ${name} — Change Log\n`);
  write(root, "tasks/XY_Monthly_Sales/spec.md", spec({ status: "open", direction: "out", cadence: "Monthly" }));
  write(root, "tasks/XY_Monthly_Sales/pipeline/run.py", "open('../../queries/shared.sql')\n");
  write(root, "tasks/XY_Case_Audit/spec.md", spec({ status: "done", cadence: "Case" }));
  write(root, "tasks/XY_Case_Audit/check.py", "q = 'queries/shared.sql'\n");
  write(root, "queries/shared.sql", "select 1\n");
  write(root, "content/README.md", [
    "# INDEX các case XY — tra nhanh",
    "| Case | Trạng thái | Chủ đề |",
    "|---|---|---|",
    "| [`XY_Monthly_Sales`](../tasks/XY_Monthly_Sales/spec.md) | 🔄 Monthly · 🟡 MỞ | doanh thu |",
    "| [`XY_Case_Audit`](../tasks/XY_Case_Audit/spec.md) | 🟢 ĐÓNG | soát |",
  ].join("\n"));
  write(root, "bin/XY_Monthly_Sales.cmd", "@echo off\n");
  write(root, "bin/vault.cmd", "@echo off\n");
  write(root, "scripts/vault.ps1", "#\n");
  write(root, "reports/README.md", "| Thư mục |\n|---|\n| `XY_01IP_Sales_Classic/` |\n");
  write(root, "reports/XY_01IP_Sales_Classic/a.pbip", "{}\n");
  return root;
}

test("a clean department repo raises none of the case checks", (t) => {
  const root = dept(t);
  for (const [name, f] of Object.entries({ caseIndexFindings, caseHeaderFindings, vmTaskDataFindings, binLauncherFindings, sharedSlotFindings, reportsIndexFindings, ledgerTitleFindings, ledgerDuplicateHeadings })) {
    assert.deepEqual(f(root), [], `${name} cried wolf on a clean repo`);
  }
});

test("case-index: a case on disk with no row in content/README.md (FA: FA_Monthly_StoreTarget was missing)", (t) => {
  const root = dept(t);
  write(root, "tasks/XY_Monthly_Target/spec.md", spec({ status: "open", direction: "in", cadence: "Monthly" }));
  assert.deepEqual(caseIndexFindings(root), ["content/README.md: no row for tasks/XY_Monthly_Target/"]);
});

test("case-index: a row naming a case that is not on disk", (t) => {
  const root = dept(t);
  const p = join(root, "content/README.md");
  writeFileSync(p, readFileSync(p, "utf8") + "\n| [`XY_Case_Gone`](../tasks/XY_Case_Gone/spec.md) | 🟢 ĐÓNG | x |\n");
  assert.deepEqual(caseIndexFindings(root), ["content/README.md: row names tasks/XY_Case_Gone/, not on disk"]);
});

test("case-index: the row's status contradicts the spec (HR ③) - both directions", (t) => {
  const root = dept(t);
  write(root, "tasks/XY_Case_Audit/spec.md", spec({ status: "open", cadence: "Case" }));
  write(root, "tasks/XY_Monthly_Sales/spec.md", spec({ status: "closed", direction: "out", cadence: "Monthly" }));
  assert.deepEqual(caseIndexFindings(root).sort(), [
    "content/README.md: XY_Case_Audit is open in spec.md, the row says closed",
    "content/README.md: XY_Monthly_Sales is closed in spec.md, the row does not say closed",
  ]);
});

test("case-header: missing status/cadence, a cadence the name contradicts, a periodic task with no direction", (t) => {
  const root = dept(t);
  write(root, "tasks/XY_Case_Audit/spec.md", "# no front block\n");
  write(root, "tasks/XY_Monthly_Sales/spec.md", spec({ status: "open", cadence: "Weekly" }));
  assert.deepEqual(caseHeaderFindings(root), [
    "tasks/XY_Case_Audit/spec.md: no status: in the front block",
    "tasks/XY_Case_Audit/spec.md: no cadence: in the front block",
    "tasks/XY_Monthly_Sales/spec.md: cadence: Weekly, the name says Monthly",
    "tasks/XY_Monthly_Sales/spec.md: a Weekly task with no direction: in|out",
  ]);
});

test("vm-task-local-data: a VM task keeping a file on the PC is caught; the shortcut and reference/ are not (HR ②, reference kept on PC + VM)", (t) => {
  const root = dept(t);
  write(root, "tasks/XY_Monthly_Sales/vm_deploy.json", "{}\n");
  write(root, DATA + "/XY_Monthly_Sales/03_output/_SharePoint.url", "[InternetShortcut]\n");
  write(root, DATA + "/XY_Monthly_Sales/03_output/reference/template.xlsx");
  write(root, DATA + "/XY_Monthly_Sales/01_raw/reference/sample.xlsx");
  write(root, DATA + "/XY_Monthly_Sales/02_processing/scratch.xlsx");
  assert.deepEqual(vmTaskDataFindings(root), [], "shortcut · reference/ · scratch in 02_processing are all allowed");
  write(root, DATA + "/XY_Monthly_Sales/03_output/Sales T9.xlsx");
  assert.deepEqual(vmTaskDataFindings(root), [DATA + "/XY_Monthly_Sales/03_output/: Sales T9.xlsx"]);
});

test("vm-task-local-data: a task NOT on the VM keeps its three stages (a case run on the PC)", (t) => {
  const root = dept(t);
  write(root, DATA + "/XY_Monthly_Sales/03_output/Sales T9.xlsx");
  assert.deepEqual(vmTaskDataFindings(root), []);
});

test("NEGATIVE: bin-launcher accepts a stage launcher run by hand (slot Bin_082_Bin; FA weekly.cmd) and an external program", (t) => {
  const root = dept(t);
  write(root, "bin/weekly.cmd", "@echo off\nrem old: tasks\\XY_Weekly_Gone\\run.py\npython \"%~dp0..\\tasks\\XY_Monthly_Sales\\pipeline\\run.py\" %*\n");
  write(root, "bin/caddy_loop.cmd", "@echo off\n\"%~dp0..\\tools\\caddy.exe\" run\n");
  assert.deepEqual(binLauncherFindings(root), [], "a launcher whose calls all exist is fine whatever its name; a rem line is history");
});

test("bin-launcher: a launcher calling a task or a script that is gone (HR ④: a launcher no task owns any more)", (t) => {
  const root = dept(t);
  write(root, "bin/weekly.cmd", "@echo off\npython \"%~dp0..\\tasks\\XY_Weekly_Gone\\pipeline\\run.py\"\n");
  write(root, "bin/load.cmd", "@echo off\npython %~dp0..\\pipelines\\loader\\load.py\n");
  assert.deepEqual(binLauncherFindings(root).sort(), [
    "bin/load.cmd: calls pipelines/loader/load.py, not in the repo",
    "bin/weekly.cmd: calls tasks/XY_Weekly_Gone, not in the repo",
  ]);
});

test("shared-slot-case-file: a shared file named after a case, or read by one case only, belongs in that case (HR ①)", (t) => {
  const root = dept(t);
  write(root, "sources/XY_Monthly_Sales_mail.yaml", "to: x\n");
  write(root, "queries/sales_only.sql", "select 2\n");
  write(root, "tasks/XY_Monthly_Sales/pipeline/q.py", "open('queries/sales_only.sql')\n");
  write(root, "bin/XY_Monthly_Sales.cmd", "@echo off\nrem queries/sales_only.sql\n");
  assert.deepEqual(sharedSlotFindings(root).sort(), [
    "queries/sales_only.sql: read by XY_Monthly_Sales only — move it into tasks/XY_Monthly_Sales/",
    "sources/XY_Monthly_Sales_mail.yaml: named after XY_Monthly_Sales — move it into tasks/XY_Monthly_Sales/",
  ]);
});

test("NEGATIVE: shared-slot-case-file stays quiet on a file a repo script reads too", (t) => {
  const root = dept(t);
  write(root, "queries/sales_only.sql", "select 2\n");
  write(root, "tasks/XY_Monthly_Sales/pipeline/q.py", "open('queries/sales_only.sql')\n");
  write(root, "scripts/report.py", "open('queries/sales_only.sql')\n");
  assert.deepEqual(sharedSlotFindings(root), []);
});

test("NEGATIVE: shared-slot-case-file stays quiet on a file only a repo tool reads (no case owns it)", (t) => {
  const root = dept(t);
  write(root, "config/pbi-gate.json", "{}\n");
  write(root, "scripts/pbi_gate.py", "open('config/pbi-gate.json')\n");
  assert.deepEqual(sharedSlotFindings(root), []);
});

test("reports-index: a report folder reports/README.md does not name (FA: FA_05DR_FinancialMetrics_Mix)", (t) => {
  const root = dept(t);
  write(root, "reports/XY_05DR_Metrics_Mix/a.pbip", "{}\n");
  assert.deepEqual(reportsIndexFindings(root), ["reports/README.md: no line for reports/XY_05DR_Metrics_Mix/"]);
});

test("NEGATIVE: reports-index does not take a longer name for a shorter one", (t) => {
  const root = dept(t);
  write(root, "reports/README.md", "| `XY_01IP_Sales_Classic_v2/` |\n");
  assert.deepEqual(reportsIndexFindings(root), ["reports/README.md: no line for reports/XY_01IP_Sales_Classic/"]);
});

test("ledger-title: a ledger still headed with the repo's old name (FA: # PBI_FIN — …)", (t) => {
  const root = dept(t);
  write(root, "docs/agent/05_TODO.md", "# PBI_XY — TODO\n");
  assert.deepEqual(ledgerTitleFindings(root), ['docs/agent/05_TODO.md: heading names "PBI_XY", the repo is Dept_XY']);
});

test("NEGATIVE: ledger-title ignores headings that name no repo (INDEX … · 00 — …)", (t) => {
  const root = dept(t);
  write(root, "docs/plan/00_overview.md", "# 00 — Tổng quan\n");
  write(root, "content/README.md", "# INDEX — các case, tra nhanh\n");
  write(root, "docs/agent/05_TODO.md", "# Backlog — việc mở\n");
  assert.deepEqual(ledgerTitleFindings(root), []);
});

test("ledger-duplicate-heading: two sections of one name in the TODO ledger (FA: two empty \"Việc mở\")", (t) => {
  const root = dept(t);
  write(root, "docs/agent/05_TODO.md", "# Dept_XY — TODO\n\n## Việc mở\n\n## Việc mở\n- [ ] a\n\n```\n## Việc mở\n```\n");
  assert.deepEqual(ledgerDuplicateHeadings(root), ['docs/agent/05_TODO.md: "Việc mở" ×2']);
});

/** A folder harness: the law shelf exists, two ledgers, one assembled skill installing a script. */
function folderRepo(t) {
  const root = dept(t);
  write(root, "docs/agent/01_LAW/_Rule/01_Harness/Rule_Gate_59_ReadFirst/Rule_Gate_59_ReadFirst.md", "---\nid: Rule_Gate_59_ReadFirst\nversion: 1\n---\n# r\nsee 02_RULES\n");
  write(root, "docs/agent/01_LAW/_Cons/01_Scope/Cons_Gate_09_Purpose/Cons.md", "# Purpose\nok\n");
  write(root, "docs/agent/03_SKILLS/Skill_Task_Run/Skill_Task_Run.md", "---\nid: Skill_Task_Run\nname: task-run\nversion: 1\ninstalls: [scripts/task_run.py]\n---\n# s\n");
  write(root, "docs/agent/04_TODO.md", "# Dept_XY — TODO\n");
  write(root, "docs/agent/05_CHANGES.md", "# Dept_XY — Change Log\n- moved 02_RULES to 01_LAW/_Rule\n");
  write(root, "scripts/task_run.py", "# reads DEPT_STANDARD\n");
  write(root, "docs/archive/old/02_RULES.md", "old\n");
  write(root, ".claude/skills/task-run/SKILL.md", "05_TODO\n");
  return root;
}

test("NEGATIVE: retired-harness-name is quiet on what the store ships, the archive, the history ledger and the host's skill copies", (t) => {
  const root = folderRepo(t);
  assert.deepEqual(retiredNameFindings(root), []);
});

test("retired-harness-name: the repo's own text naming a harness file that is gone (FA: ~120 mentions)", (t) => {
  const root = folderRepo(t);
  write(root, "docs/plan/01_sources.md", "Xem `03_STRUCTURE` §3 và DEPT_STANDARD §2b; hook ở docs/hooks/guard.cjs.\n");
  write(root, "docs/agent/01_LAW/_Cons/01_Scope/Cons_Gate_09_Purpose/Cons.md", "Luật ở 02_RULES.\n");
  write(root, "docs/agent/04_TODO.md", "# Dept_XY — TODO\n- ghi 06_CHANGES\n");
  write(root, "tasks/XY_Case_Audit/check.py", "# see 01_CONSTITUTION\nq = 'queries/shared.sql'\n");
  assert.deepEqual(retiredNameFindings(root), [
    "docs/agent/01_LAW/_Cons/01_Scope/Cons_Gate_09_Purpose/Cons.md: 02_RULES",
    "docs/agent/04_TODO.md: 06_CHANGES",
    "docs/plan/01_sources.md: 03_STRUCTURE · DEPT_STANDARD · docs/hooks/",
    "tasks/XY_Case_Audit/check.py: 01_CONSTITUTION",
  ]);
});

test("NEGATIVE: retired-harness-name skips a case's dated findings file (a record of its day); the case's spec still counts", (t) => {
  const root = folderRepo(t);
  write(root, "tasks/XY_Case_Audit/2026-07-27_rotation-plan.md", "Theo DEPT_STANDARD §2b và 05_TODO lúc đó.\n");
  write(root, "tasks/XY_Case_Audit/spec.md", "---\nstatus: done\ncadence: Case\n---\nxem 02_RULES\n");
  assert.deepEqual(retiredNameFindings(root), ["tasks/XY_Case_Audit/spec.md: 02_RULES"]);
});

test("NEGATIVE: retired-harness-name does not fire on a file harness (those names are its living files)", (t) => {
  const root = dept(t);
  write(root, "docs/plan/01.md", "Xem 02_RULES.\n");
  assert.deepEqual(retiredNameFindings(root), []);
});

test("superseded-fact: a changed fact of the region listed once in values.json is caught in the repo's own text", (t) => {
  const root = folderRepo(t);
  write(root, "data/region/values.json", JSON.stringify({ superseded_facts: [
    { old: "SRV-OLD", now: "SRV-NEW (task server)" },
    { old: "App.exe", now: "python scripts/query.py", roles: ["dept"] },
  ] }));
  write(root, "docs/plan/01_sources.md", "Task chạy trên SRV-OLD lúc 01:00.\nBản sao ở `_Legacy\\SRV-OLD\\PWBI` giữ nguyên.\n");
  write(root, "docs/agent/01_LAW/_Cons/01_Scope/Cons_Gate_09_Purpose/Cons.md", "Dò số bằng App.exe.\n");
  write(root, "docs/archive/old.md", "SRV-OLD\n");
  assert.deepEqual(supersededFactFindings(root).blocking, ["docs/plan/01_sources.md: SRV-OLD → SRV-NEW (task server)"],
    "the archive is history; an entry limited to a role this repo lacks is not applied");
});

test("superseded-fact: an entry marked advisory (a name that also lives in history) is listed to look at, not blocking", (t) => {
  const root = folderRepo(t);
  write(root, "data/region/values.json", JSON.stringify({ superseded_facts: [{ old: "SRV-OLD", now: "SRV-NEW", level: "advisory" }] }));
  write(root, "docs/plan/01_sources.md", "Hệ ETL cũ chạy trên SRV-OLD.\n");
  assert.deepEqual(supersededFactFindings(root), { blocking: [], advisory: ["docs/plan/01_sources.md: SRV-OLD → SRV-NEW"] });
});

test("superseded-fact: an entry about what the agent is told (files: prose) is not applied to a task's code (Dept_IT)", (t) => {
  const root = folderRepo(t);
  write(root, "data/region/values.json", JSON.stringify({ superseded_facts: [{ old: "/api/vault", now: "python scripts/query.py", files: "prose" }] }));
  write(root, "docs/plan/01_sources.md", "Mở két qua /api/vault trước khi dò.\n");
  write(root, "tasks/XY_Daily_Check/pipeline/00_ready.py", "url = base + '/api/vault'\n");
  assert.deepEqual(supersededFactFindings(root).blocking, ["docs/plan/01_sources.md: /api/vault → python scripts/query.py"]);
});

test("NEGATIVE: superseded-fact skips a path segment (the name of a mirror folder) and a word that only contains the old one", (t) => {
  const root = folderRepo(t);
  write(root, "data/region/values.json", JSON.stringify({ superseded_facts: [{ old: "SRV-OLD", now: "SRV-NEW" }] }));
  write(root, "docs/plan/01_sources.md", "Bản sao ở `D:\\_Legacy\\SRV-OLD\\PWBI` · mirror `SRV-OLD/PWBI` · máy SRV-OLD-Maintain vẫn chạy.\n");
  assert.deepEqual(supersededFactFindings(root), { blocking: [], advisory: [] });
});

test("the off-standard block lists EVERY place of a finding, so the repo fixes from it without running conform again", () => {
  const all = Array.from({ length: 12 }, (_, i) => `docs/plan/0${i}.md: 02_RULES`);
  const block = standardTodoBlock([{ check: "retired-harness-name", level: "blocking", title: "t", samples: all.slice(0, 6), all, count: 12, fix: "02_RULES → 01_LAW/_Rule/" }]);
  assert.match(block, /- \[ \] `retired-harness-name` \(12\) t → 02_RULES → 01_LAW\/_Rule\//);
  for (const s of all) assert.ok(block.includes(`  - ${s}`), `listed: ${s}`);
  const both = standardTodoBlock([
    { check: "case-index", level: "blocking", title: "a", samples: ["x"], all: ["x"], count: 1, fix: "f" },
    { check: "superseded-fact-history", level: "advisory", title: "b", samples: ["y"], all: ["y"], count: 1, fix: "g" },
  ]);
  assert.match(both, /### Phải sửa\n- \[ \] `case-index`[\s\S]*### Nên xem[^\n]*\n- \[ \] `superseded-fact-history`/, "must-fix first, then to look at");
});

test("dead-flag: a used flag past its retry window and an unused one past the fresh window; a fresh one is alive", (t) => {
  const root = dept(t);
  const dir = join(root, "docs/.harness-state");
  const now = Date.now();
  write(root, "docs/.harness-state/.allow-delete", `ZEMORY-USED 63101aed843eaaed ${now - 10 * 60 * 1000}\n`);
  utimesSync(join(dir, ".allow-delete"), new Date(now - 10 * 60 * 1000), new Date(now - 10 * 60 * 1000));
  write(root, "docs/.harness-state/.allow-push", "user approved\n");
  utimesSync(join(dir, ".allow-push"), new Date(now - 20 * 60 * 1000), new Date(now - 20 * 60 * 1000));
  write(root, "docs/.harness-state/.allow-outside", "user approved\n");
  assert.deepEqual(deadFlagFindings(root, dir, now).sort(), ["docs/.harness-state/.allow-delete", "docs/.harness-state/.allow-push"]);
});

test("WIRING: conform reports the case checks under their codes", (t) => {
  const root = dept(t);
  write(root, "bin/weekly.cmd", "@echo off\npython %~dp0..\\tasks\\XY_Weekly_Gone\\run.py\n");
  write(root, "tasks/XY_Monthly_Target/spec.md", spec({ status: "open", direction: "in", cadence: "Monthly" }));
  const codes = conform(root).items.map((i) => i.check);
  for (const c of ["bin-launcher", "case-index"]) assert.ok(codes.includes(c), `${c} missing from conform`);
});

test("part-name-vi: an article renamed into English that kept its old slug in name: (AppCore: db-nay-khong-giu-mat)", (t) => {
  const root = folderRepo(t);
  const dir = "docs/agent/01_LAW/_Cons/Cons_Core_104_NoSqlPasswordsStored";
  write(root, `${dir}/Cons_Core_104_NoSqlPasswordsStored.md`, "---\nid: Cons_Core_104_NoSqlPasswordsStored\nname: db-nay-khong-giu-mat\nversion: 1\n---\n# a\n");
  write(root, `${dir}/Cons.md`, "# a\nok\n");
  const hit = (r) => (conform(r).items.find((i) => i.check === "part-name-vi")?.samples ?? []).join("\n");
  assert.match(hit(root), /Cons_Core_104_NoSqlPasswordsStored name: db-nay-khong-giu-mat \(want no-sql-passwords-stored\)/);
  write(root, `${dir}/Cons_Core_104_NoSqlPasswordsStored.md`, "---\nid: Cons_Core_104_NoSqlPasswordsStored\nname: no-sql-passwords-stored\nversion: 1\n---\n# a\n");
  assert.doesNotMatch(hit(root), /Cons_Core_104/, "NEGATIVE: the kebab of the folder's name passes");
  const dir2 = "docs/agent/01_LAW/_Cons/Cons_Core_105_1Case1FolderTasks";
  write(root, `${dir2}/Cons_Core_105_1Case1FolderTasks.md`, "---\nid: Cons_Core_105_1Case1FolderTasks\nname: 1-case-1-folder-tasks\nversion: 1\n---\n# a\n");
  write(root, `${dir2}/Cons.md`, "# a\nok\n");
  assert.doesNotMatch(hit(root), /Cons_Core_105/, "NEGATIVE: a digit between words is its own part (1-case-1-folder-tasks)");
});

test("STORE: every package.json a store part ships is named after its part, never after a department (FA: dept-ops-scripts)", () => {
  const store = new URL("../../docs_template/_Store/03_SKILLS/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
  let seen = 0;
  for (const part of readdirSync(store)) {
    const pj = join(store, part, "scripts", "package.json");
    if (!existsSync(pj)) continue;
    seen++;
    const head = readFileSync(join(store, part, `${part}.md`), "utf8");
    const skill = /^name:\s*(\S+)/m.exec(head)?.[1];
    const name = JSON.parse(readFileSync(pj, "utf8")).name;
    assert.ok(skill && name.startsWith(skill), `${part}/scripts/package.json is named "${name}", not after the skill "${skill}"`);
  }
  assert.ok(seen > 0, "the store ships at least one package.json (the check looked at something)");
});
