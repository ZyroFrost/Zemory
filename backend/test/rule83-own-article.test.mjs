// Rule_Gate_83 v6 (plan/29 §14e): a repo writes an article of its own constitution once the user approves (one-use flag
// docs-write); a copy of a shared part stays blocked with no flag. Asked by the DW session 2026-10-22: its own article
// Cons_Gate_122_RunFromVM was blocked as "harness, the repo's own included".
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { tempDir } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const { check } = require("../../docs_template/_Store/01_LAW/_Rule/01_Harness/Rule_Gate_83_HarnessFromStore/hook.cjs");
const POLICY = { rules_file: "docs/agent/01_LAW/_Rule", todo_file: "docs/agent/04_TODO.md", flags_dir: "docs/.harness-state", flags: {} };

function repo(t) {
  const root = tempDir(t, "zemory-r83-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), "{}");
  return root;
}
const write = (root, rel, content) => check({ tool_name: "Write", tool_input: { file_path: join(root, rel), content } }, root, POLICY);

test("a new article of the repo's own asks for the user's flag, not a flat refusal", (t) => {
  const root = repo(t);
  const r = write(root, "docs/agent/01_LAW/_Cons/Cons_Gate_122_RunFromVM/Cons_Gate_122_RunFromVM.md", "---\nid: Cons_122\nversion: 1\n---\n# x\n");
  assert.equal(typeof r, "object");
  assert.equal(r.flag, "docs-write");
  assert.match(r.msg, /article of this repo's own constitution/);
  const inChapter = write(root, "docs/agent/01_LAW/_Cons/03_System/Cons_Core_104_Exception/hook.cjs", "module.exports={}");
  assert.equal(inChapter?.flag, "docs-write", "a chapter folder and a non-md file of the article count too");
});

test("NEGATIVE: a shared copy, a stamped part and a frame number stay blocked with no flag", (t) => {
  const root = repo(t);
  const shared = write(root, "docs/agent/01_LAW/_Rule/03_Safety/Rule_Gate_04_ScratchFiles/Rule_Gate_04_ScratchFiles.md", "x");
  assert.equal(typeof shared, "string");
  const stamped = write(root, "docs/agent/01_LAW/_Cons/Cons_Gate_122_RunFromVM/Cons_Gate_122_RunFromVM.md", "---\nfrom: _Store/x @v1\n---\n");
  assert.equal(typeof stamped, "string", "a from: line marks an HS copy, whatever the number");
  const frame = write(root, "docs/agent/01_LAW/_Cons/02_Data/Cons_Gate_10_ReadOnlySources/Cons_Gate_10_ReadOnlySources.md", "x");
  assert.equal(typeof frame, "string", "a frame number below 101 is HS");
  const edge = write(root, "docs/agent/01_LAW/_Cons/Cons_Core_100_Edge/Cons_Core_100_Edge.md", "x");
  assert.equal(typeof edge, "string", "the repo's own numbers start at 101");
});
