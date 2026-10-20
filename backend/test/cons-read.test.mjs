// plan/29 §13b · §15 — the Cons.md a repo writes fills the frame HS holds: the guard reads the frame's tables (frame 10
// `Server`, frame 14 `File`), a section of the frame never goes missing, and a section HS adds later reaches the repo.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { addMissingSections, consColumn, frameShapeFindings, tableColumn } from "../../dist/docs/cons-read.js";
import { applyKit } from "../../dist/docs/kit-apply.js";
import { generateGuards } from "../../dist/docs/guard-gen.js";
import { conform } from "../../dist/docs/conform.js";
import { tempDir } from "./helpers.mjs";

function put(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

function deptRepo(t) {
  const root = tempDir(t, "zemory-cons-");
  execFileSync("git", ["init", "-q"], { cwd: root, windowsHide: true });
  applyKit(root, { kitRef: "05", apply: true });
  return root;
}
const CONS = "docs/agent/01_LAW/_Cons";
const f10 = `${CONS}/02_Data/Cons_Gate_10_ReadOnlySources/Cons.md`;
const f12 = `${CONS}/02_Data/Cons_Gate_12_SourceOfTruth/Cons.md`;
const f14 = `${CONS}/04_Security/Cons_Gate_14_Access/Cons.md`;

test("a table column is read cell by cell: several values, code marks dropped, placeholders and empty marks skipped", () => {
  const md = "x\n\n| Nguồn | Server | Loại |\n|---|---|---|\n| DW | `SRV-BI` · `SRV-DEV` | db |\n| share | — | folder |\n| <tên> | <máy chủ SQL, hoặc —> | <x> |\n\n| Other | Server |\n|---|---|\n| a | SRV-LOG, SRV-BI |\n";
  assert.deepEqual(tableColumn(md, "Server"), ["SRV-BI", "SRV-DEV", "SRV-LOG"]);
  assert.deepEqual(tableColumn(md, "server"), ["SRV-BI", "SRV-DEV", "SRV-LOG"], "the column name is not case-bound");
  assert.deepEqual(tableColumn(md, "File"), [], "no such column, nothing");
  // a note never becomes a value: the guard would let SQL reach "— (through a linked server)" as a server name
  const noted = "| Nguồn | Server |\n|---|---|\n| DW | 192.0.2.10 (DW) |\n| nguồn gốc | — (qua linked server) |\n| hệ cũ | - cùng instance |\n";
  assert.deepEqual(tableColumn(noted, "Server"), ["192.0.2.10"]);
});

test("the guard reads frame 10's Server and frame 14's File from the written Cons.md; a template is not read", (t) => {
  const root = deptRepo(t);
  const policy = () => JSON.parse(readFileSync(join(root, "docs", "agent", "01_LAW", "_Rule", "01_Harness", "Rule_Gate_59_ReadFirst", "policy.json"), "utf8"));
  generateGuards(root);
  assert.ok(!policy().allowed_sql_servers.includes("<máy chủ SQL, hoặc —>"), "a template's placeholder is no server");
  put(root, f10, "---\nframe: Cons_Gate_10_ReadOnlySources\nstatus: written\n---\n# Nguồn\n\n## Nguồn\n\n| Nguồn | Loại | Server | Cách đọc được phép |\n|---|---|---|---|\n| DW | cơ sở dữ liệu | `SRV-BI` | chỉ SELECT |\n\n## Ngoại lệ ghi\nkhông có\n");
  put(root, f14, "---\nframe: Cons_Gate_14_Access\nstatus: written\n---\n# Truy cập\n\n## Người dùng\nphòng\n\n## Gác ở\nmáy chủ · mặc định chặn\n\n## Bí mật (tên)\n\n| Name | File | Dùng để làm gì |\n|---|---|---|\n| WAREHOUSE_CONN | `*.sec` · `*.dpapi` | đọc DW |\n\n## Dữ liệu cá nhân\nkhông có — phòng chỉ đọc DW\n\n## Phạm vi mạng\nmạng nội bộ\n");
  assert.deepEqual(consColumn(join(root, "docs", "agent"), "Cons_Gate_10_ReadOnlySources", "Server"), ["SRV-BI"]);
  generateGuards(root);
  assert.ok(policy().allowed_sql_servers.includes("SRV-BI"), "the server the constitution names is allowed");
  assert.ok(policy().secret_names.includes("*.sec") && policy().secret_names.includes("*.dpapi"), "the secret files the constitution names are guarded");
});

test("a frame section the written Cons.md lacks is red; sync puts it back with the template text, in its place", (t) => {
  const root = deptRepo(t);
  const agent = join(root, "docs", "agent");
  // a repo that wrote frame 12 before HS added "Định nghĩa"
  put(root, f12, "---\nframe: Cons_Gate_12_SourceOfTruth\nstatus: written\n---\n# Nguồn sự thật\n\n## Gốc\nDW\n\n## Khi lệch\nDW thắng\n\n## Dẫn xuất (không sửa tay)\nkhông có\n\n## Phải khớp\ntổng tháng = DW\n");
  assert.deepEqual(frameShapeFindings(agent).filter((f) => f.startsWith("Cons_Gate_12")), ['Cons_Gate_12_SourceOfTruth: section "## Định nghĩa" missing from Cons.md']);
  const item = () => conform(root).items.find((i) => i.check === "cons-frame-shape");
  assert.equal(item()?.level, "blocking");
  assert.deepEqual(addMissingSections(agent, false).filter((x) => x.startsWith("Cons_Gate_12")), ["Cons_Gate_12_SourceOfTruth: + ## Định nghĩa"], "dry run reports");
  assert.doesNotMatch(readFileSync(join(root, f12), "utf8"), /Định nghĩa/, "dry run writes nothing");
  const r = applyKit(root, { apply: true });
  assert.ok(r.consAdded.includes("Cons_Gate_12_SourceOfTruth: + ## Định nghĩa"));
  const text = readFileSync(join(root, f12), "utf8");
  assert.match(text, /## Phải khớp\ntổng tháng = DW\n\n## Định nghĩa\n\n\| Thuật ngữ \| Nghĩa \| Định danh \|/, "after the section before it, template table and all");
  assert.equal(frameShapeFindings(agent).filter((f) => f.startsWith("Cons_Gate_12")).length, 0);
  const unwritten = conform(root).items.find((i) => i.check === "cons-unwritten");
  assert.ok(unwritten && unwritten.samples.some((s) => /Cons_Gate_12_SourceOfTruth: template placeholder/.test(s)), JSON.stringify(unwritten),
    "the placeholder keeps the repo red until it fills the section");
  assert.deepEqual(applyKit(root, { apply: true }).consAdded.filter((x) => x.startsWith("Cons_Gate_12")), [], "a second sync adds nothing");
});

test("a Cons.md still at status template follows the store's template whole; a written one is never replaced (20/10)", (t) => {
  const root = deptRepo(t);
  const agent = join(root, "docs", "agent");
  const old = "---\nframe: Cons_Gate_12_SourceOfTruth\nstatus: template\n---\n# Nguồn sự thật\n\n## Gốc\n<dữ liệu>\n";
  put(root, f12, old);
  assert.deepEqual(addMissingSections(agent, false).filter((x) => x.startsWith("Cons_Gate_12")), ["Cons_Gate_12_SourceOfTruth: template refreshed"]);
  assert.equal(readFileSync(join(root, f12), "utf8"), old, "dry run writes nothing");
  addMissingSections(agent, true);
  assert.match(readFileSync(join(root, f12), "utf8"), /## Định nghĩa/, "the template the store has now");
  assert.deepEqual(addMissingSections(agent, true).filter((x) => x.startsWith("Cons_Gate_12")), [], "a second pass changes nothing");
  const mine = "---\nframe: Cons_Gate_12_SourceOfTruth\nstatus: written\n---\n# Nguồn sự thật\n\n## Gốc\nDW\n";
  put(root, f12, mine);
  addMissingSections(agent, true);
  assert.match(readFileSync(join(root, f12), "utf8"), /## Gốc\nDW\n/, "the repo's own text stays");
});

test("conform: a marker key whose values now live in the constitution is red (one home)", (t) => {
  const root = deptRepo(t);
  const marker = join(root, "docs", ".harness.json");
  const j = JSON.parse(readFileSync(marker, "utf8"));
  writeFileSync(marker, JSON.stringify({ ...j, allowedSqlServers: ["SRV-BI"] }, null, 2));
  const item = () => conform(root).items.find((i) => i.check === "marker-key-in-cons");
  assert.equal(item(), undefined, "the constitution names no server yet: the marker is still the only home");
  put(root, f10, "---\nframe: Cons_Gate_10_ReadOnlySources\nstatus: written\n---\n# N\n\n## Nguồn\n\n| Nguồn | Loại | Server | Cách đọc được phép |\n|---|---|---|---|\n| DW | db | SRV-BI | SELECT |\n\n## Ngoại lệ ghi\nkhông có\n");
  assert.equal(item()?.level, "blocking");
  assert.deepEqual(item().samples, ["allowedSqlServers → Cons_Gate_10_ReadOnlySources › Server"]);
});

// plan/29 §13b: HS holds the frames, the repo fills them. The real guard of an assembled repo, fed one call at a time.
function guardSays(root, payload) {
  const guard = join(root, "docs", "agent", "01_LAW", "_Rule", "01_Harness", "Rule_Gate_59_ReadFirst", "guard.cjs");
  assert.ok(existsSync(guard), "the repo has its guard");
  const p = spawnSync(process.execPath, [guard], { input: JSON.stringify({ ...payload, cwd: root, session_id: "fill-" + Math.random() }), encoding: "utf8", cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  let deny = p.status === 2;
  try { deny = deny || JSON.parse(p.stdout).hookSpecificOutput?.permissionDecision === "deny"; } catch { /* plain text */ }
  return { deny, text: p.stdout + p.stderr };
}

test("the repo writes its fills freely (ledgers, Cons.md, its own skill); a frame's shape and every other harness file stay shut", (t) => {
  const root = deptRepo(t);
  generateGuards(root);
  const at = (rel) => join(root, rel);
  const edit = (rel, a, b) => ({ tool_name: "Edit", tool_input: { file_path: at(rel), old_string: a, new_string: b } });
  const changes = "docs/agent/05_CHANGES.md";
  assert.equal(guardSays(root, edit(changes, readFileSync(at(changes), "utf8").split("\n")[0], readFileSync(at(changes), "utf8").split("\n")[0] + " ")).deny, false, "the changelog is the repo's");
  assert.equal(guardSays(root, edit(f12, "<dữ liệu · file · hệ>", "DW")).deny, false, "a frame is filled without a flag");
  const renamed = guardSays(root, edit(f12, "## Khi lệch", "## Khi hai nguồn lệch"));
  assert.equal(renamed.deny, true, "renaming a frame's section is blocked");
  assert.match(renamed.text, /missing: ## Khi lệch/);
  const own = "docs/agent/03_SKILLS/Skill_Own_NetRevenue/Skill_Own_NetRevenue.md";
  const frame = readFileSync(at("docs/agent/03_SKILLS/Skill_Frame_Own/Skill_Frame_Own.md"), "utf8");
  const sections = [...frame.matchAll(/^## .*$/gm)].map((m) => m[0]).join("\nfilled\n\n") + "\nfilled\n";
  const body = "---\nid: Skill_Own_NetRevenue\nname: own-net-revenue\nversion: 1\ntype: process\ndescription: How the department calculates net revenue.\n---\n# Skill_Own_NetRevenue\n\n" + sections;
  assert.equal(guardSays(root, { tool_name: "Write", tool_input: { file_path: at(own), content: body } }).deny, false, "a skill on the frame's sections is the repo's to write");
  assert.equal(guardSays(root, { tool_name: "Write", tool_input: { file_path: at(own), content: body + "\n## My notes\nx\n" } }).deny, true, "a section of its own is not");
  const law = "docs/agent/01_LAW/_Rule/02_Work/Rule_Core_80_SharedChangeImpact/Rule_Core_80_SharedChangeImpact.md";
  assert.equal(guardSays(root, edit(law, "## What", "## What\n- local")).deny, true, "a law copy stays shut");
  // conform holds the shape too, and sync plugs the repo's own skill where the host loads it, and keeps it current
  put(root, own, body.replace("filled", "<still a template>"));
  const shape = () => conform(root).items.find((i) => i.check === "own-skill-shape");
  assert.ok(shape()?.samples.some((s) => /Skill_Own_NetRevenue: template placeholder/.test(s)), JSON.stringify(shape()));
  put(root, own, body);
  assert.equal(shape(), undefined, "a filled skill on the frame is clean");
  applyKit(root, { apply: true });
  const plugged = at(".claude/skills/own-net-revenue/SKILL.md");
  assert.match(readFileSync(plugged, "utf8"), /How the department calculates net revenue/);
  put(root, own, body.replace("How the department", "How OPS"));
  applyKit(root, { apply: true });
  assert.match(readFileSync(plugged, "utf8"), /How OPS calculates/, "the next sync rebuilds the repo's own skill (its own build, not someone's folder)");
  assert.match(readFileSync(at("docs/agent/03_SKILLS/INDEX.md"), "utf8"), /Skill_Own_NetRevenue/);
  assert.doesNotMatch(readFileSync(at("docs/agent/03_SKILLS/INDEX.md"), "utf8"), /Skill_Frame_Own/, "the frame is not listed as a skill to open");
});

test("validate names the changelog this repo has (05_CHANGES.md in a folder harness), not the old file name", async (t) => {
  // reported by the Dept_HR session 2026-10-18: "06_CHANGES.md is 362 lines" while the repo's file is 05_CHANGES.md
  const { validate } = await import("../../dist/docs/validate.js");
  const { loadContext } = await import("../../dist/core/config.js");
  const root = deptRepo(t);
  const ch = join(root, "docs", "agent", "05_CHANGES.md");
  writeFileSync(ch, readFileSync(ch, "utf8") + "\n" + Array.from({ length: 450 }, (_, i) => `- line ${i}`).join("\n") + "\n");
  const msgs = validate(loadContext(root)).issues.map((i) => i.msg);
  assert.ok(msgs.some((m) => /^05_CHANGES\.md is \d+ lines/.test(m)), JSON.stringify(msgs.filter((m) => /lines/.test(m))));
  assert.ok(!msgs.some((m) => /06_CHANGES/.test(m)), "no message names a file the repo does not have");
});
