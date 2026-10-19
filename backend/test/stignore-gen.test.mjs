// The .stignore allow list (slot Root_141_Stignore) is machine-made from the vm_deploy.json manifests (DW 2026-10-19, user:
// "mỗi repo chỉ sync những folder nào dùng để up automation thôi"). Each case: what a manifest names travels, nothing else,
// a sibling repo's `../<repo>/` need opens the folder here, a re-run changes nothing, a repo without .stignore is left alone.

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { stignoreAllowEntries, writeStignoreAllow, STIGNORE_ALLOW_START } from "../../dist/docs/stignore-gen.js";
import { tempDir } from "./helpers.mjs";

function put(root, rel, text) {
  const p = join(root, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, text);
}

function estate(t) {
  const ws = tempDir(t, "zemory-stignore-");
  const dw = join(ws, "_DB_DataWarehouse");
  const ops = join(ws, "Dept_OPS");
  put(dw, ".stignore", "data\nexports\n.vault\n*.local.*\ndocs/.harness-state\n");
  put(dw, "pipelines/lane/vm_deploy.json", JSON.stringify({ files: ["bin/lane.cmd", "pipelines/lane/run.py"], secrets: { ".env": ["K"] } }));
  put(dw, "tasks/DW_Daily_X/vm_deploy.json", JSON.stringify({ files: ["scripts/task_run.py", "models/02.sql"] }));
  put(ops, ".stignore", "data\nexports\n.vault\n*.local.*\ndocs/.harness-state\n");
  put(ops, "tasks/OPS_Daily_Y/vm_deploy.json",
    JSON.stringify({ files: ["bin/OPS_Daily_Y.cmd", "tasks/OPS_Daily_Y/pipeline/a.py"], needs: ["../_DB_DataWarehouse/config/mail/mail_vault.json"] }));
  put(ops, "reports/OPS_01/x.pbip", "{}");
  return { ws, dw, ops };
}

test("allow list = manifest homes + paths the manifests name + what a sibling needs from this repo", (t) => {
  const { dw, ops } = estate(t);
  assert.deepEqual(stignoreAllowEntries(dw), [".env", "bin", "config", "models", "pipelines", "scripts", "tasks"]);
  // OPS: reports/ is not named by any manifest, so it does not travel
  assert.deepEqual(stignoreAllowEntries(ops), ["bin", "tasks"]);
});

test("a build script and a schedule launcher travel too: vm_deploy.ps1 reads both", (t) => {
  const { ops } = estate(t);
  put(ops, "tasks/OPS_Daily_Y/vm_deploy.json", JSON.stringify({
    files: ["tasks/OPS_Daily_Y/pipeline/a.py"], build: "tools/tls_build.ps1",
    schedule: [{ task: "OPS_Daily_Y", daily: "08:00", launcher: "launch/OPS_Daily_Y.cmd" }],
  }));
  assert.deepEqual(stignoreAllowEntries(ops), ["launch", "tasks", "tools"], "a task name or a time is not a path");
});

test("the block goes last, closes with *, keeps the hand-written never-carry lines above it, and a re-run changes nothing", (t) => {
  const { ops } = estate(t);
  const first = writeStignoreAllow(ops, true);
  assert.equal(first.state, "written");
  const text = readFileSync(join(ops, ".stignore"), "utf8");
  const lines = text.trim().split("\n");
  assert.ok(text.startsWith("data\nexports\n.vault\n*.local.*\ndocs/.harness-state\n"), "never-carry lines stay first");
  assert.ok(lines.indexOf("!/bin") > lines.indexOf("docs/.harness-state"), "allow list sits below them");
  assert.equal(lines.at(-2), "*", "the last pattern drops everything not allowed");
  assert.ok(text.includes(STIGNORE_ALLOW_START));
  assert.equal(writeStignoreAllow(ops, true).state, "unchanged");
});

test("a new manifest path opens its folder on the next pass; the old block is replaced, not stacked", (t) => {
  const { ops } = estate(t);
  writeStignoreAllow(ops, true);
  put(ops, "tasks/OPS_Daily_Y/vm_deploy.json", JSON.stringify({ files: ["bin/OPS_Daily_Y.cmd", "sources/codes.xlsx"] }));
  assert.equal(writeStignoreAllow(ops, true).state, "written");
  const text = readFileSync(join(ops, ".stignore"), "utf8");
  assert.equal(text.split(STIGNORE_ALLOW_START).length, 2, "one block only");
  assert.ok(text.includes("!/sources\n"));
});

test("a repo with no .stignore is not synced: nothing written; a dry run writes nothing", (t) => {
  const { ws, ops } = estate(t);
  const plain = join(ws, "Plain");
  put(plain, "tasks/P/vm_deploy.json", JSON.stringify({ files: ["bin/p.cmd"] }));
  assert.equal(writeStignoreAllow(plain, true).state, "none");
  const before = readFileSync(join(ops, ".stignore"), "utf8");
  assert.equal(writeStignoreAllow(ops, false).state, "written");
  assert.equal(readFileSync(join(ops, ".stignore"), "utf8"), before);
});

test("the VM-deploy check reads the allow list in order: allowed paths pass, a never-carry line above still catches", async (t) => {
  const { vmDeployIgnoredFindings } = await import("../../dist/docs/case-checks.js");
  const { ops } = estate(t);
  put(ops, "tasks/OPS_Daily_Y/spec.md", "---\nstatus: open\n---\n# OPS_Daily_Y\n"); // the check reads tasks that have a spec
  writeStignoreAllow(ops, true);
  assert.deepEqual(vmDeployIgnoredFindings(ops), [], "!/bin and !/tasks come before *");
  put(ops, "tasks/OPS_Daily_Y/vm_deploy.json", JSON.stringify({ files: ["bin/OPS_Daily_Y.cmd", "tasks/OPS_Daily_Y/data/codes.xlsx"] }));
  writeStignoreAllow(ops, true);
  assert.deepEqual(vmDeployIgnoredFindings(ops), ["tasks/OPS_Daily_Y/vm_deploy.json: tasks/OPS_Daily_Y/data/codes.xlsx (.stignore: data)"]);
});

test("CRLF files keep CRLF", (t) => {
  const { ops } = estate(t);
  writeFileSync(join(ops, ".stignore"), "data\r\nexports\r\n.vault\r\n*.local.*\r\ndocs/.harness-state\r\n");
  writeStignoreAllow(ops, true);
  const text = readFileSync(join(ops, ".stignore"), "utf8");
  assert.ok(!/[^\r]\n/.test(text), "every line ends CRLF");
});
