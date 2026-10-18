// plan/29 §13b · §15 — the Cons.md a repo writes fills the frame HS holds: the guard reads the frame's tables (frame 10
// `Server`, frame 14 `File`), a section of the frame never goes missing, and a section HS adds later reaches the repo.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
