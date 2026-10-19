// plan/29 §14c · Rule_Gate_85_ProposeChecked for slots: a new slot that overlaps an existing one by path or by kind of file
// must name it in checked: and say how it differs. The two slots proposed by mistake on 2026-10-19 are the negative cases.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { slotOverlapFindings } from "../../dist/docs/slot-overlap.js";
import { tempDir } from "./helpers.mjs";

function put(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}
const slot = (s, folder, id, path, extra = "", body = "") =>
  put(s, `02_STRUCTURE/_Slot/${folder}/${folder}.md`, `---\nid: ${id}\nname: x\nversion: 1\npath: ${path}\n${extra}---\n# ${folder}\n\n${body}\n`);

function store(t) {
  const s = tempDir(t, "zemory-slot-overlap-");
  slot(s, "Content_113_Content", "Slot_113", "content/");
  slot(s, "Root_059_PackageJson", "Slot_59", "package.json | pyproject.toml");
  slot(s, "Data_094_Data", "Slot_94", "data/");
  return s;
}

test("the real store: no new slot overlaps an old one unweighed", () => {
  assert.deepEqual(slotOverlapFindings(), []);
});

test("a slot inside an old slot's folder, or a file of the same kind, is red until weighed", (t) => {
  const s = store(t);
  slot(s, "Content_141_WorkspaceStandard", "Slot_141", "content/standard/");
  slot(s, "Root_142_Requirements", "Slot_142", "requirements.txt");
  const isNew = (leaf) => /_14[12]_/.test(leaf);
  const f = slotOverlapFindings(s, isNew);
  assert.ok(f.some((x) => /Content_141_WorkspaceStandard: overlaps Content_113_Content \(content\/standard\/ lies inside content\/\) — not in checked:/.test(x)), f.join("\n"));
  assert.ok(f.some((x) => /Root_142_Requirements: overlaps Root_059_PackageJson \(requirements\.txt and package\.json are both a dependency manifest\)/.test(x)), f.join("\n"));
  // naming it in checked: alone is not enough — the text must say how the new slot differs
  slot(s, "Content_141_WorkspaceStandard", "Slot_141", "content/standard/", "checked: [Content_113_Content]\n");
  assert.ok(slotOverlapFindings(s, isNew).some((x) => /Content_141.*its text never says how it differs from Content_113_Content/.test(x)));
});

test("a sub-slot that names the parent and its own rule passes; a slot that overlaps nothing passes", (t) => {
  const s = store(t);
  slot(s, "Data_102_Secrets", "Slot_102", "data/secrets/", "checked: [Data_094_Data]\n",
    "- Khác `Data_094_Data`: bí mật — luật riêng `Rule_Gate_21_WhatEntersGit`, guard chặn file này vào commit.");
  slot(s, "Design_114_Design", "Slot_114", "design/");
  const isNew = (leaf) => /_(102|114)_/.test(leaf);
  assert.deepEqual(slotOverlapFindings(s, isNew), []);
});

test("the vocabulary in the gate: HS files only get better than HEAD (a script cannot slip the bare word past hook 02-27)", async (t) => {
  const { harnessWordFindings, bareKhoLines } = await import("../../dist/docs/harness-words.js");
  assert.deepEqual(harnessWordFindings(), [], "the real store");
  assert.equal(bareKhoLines("DW (kho dữ liệu) · tồn kho · `kho` · \"kho\" · kho hàng").length, 0, "mentions and business words pass");
  assert.equal(bareKhoLines("đọc từ kho của tổng quản").length, 1);
  const s = tempDir(t, "zemory-words-");
  put(s, "03_SKILLS/Skill_A/Skill_A.md", "x\nđọc kho\n");
  put(s, "03_SKILLS/Skill_B/Skill_B.md", "x\nđọc kho\nghi kho\n");
  put(s, "03_SKILLS/Skill_C/Skill_C.md", "đọc DW\n");
  const head = { "03_SKILLS/Skill_B/Skill_B.md": "đọc kho\n", "03_SKILLS/Skill_C/Skill_C.md": "đọc kho\nghi kho\n" };
  const f = harnessWordFindings(s, (rel) => head[rel] ?? null);
  assert.ok(f.some((x) => /Skill_A\.md: 1 line\(s\) with bare "kho" \(HEAD had 0\)/.test(x)), "a new file: none allowed");
  assert.ok(f.some((x) => /Skill_B\.md: 2 line\(s\) .*HEAD had 1/.test(x)), "an old file may not get worse");
  assert.ok(!f.some((x) => /Skill_C/.test(x)), "getting better passes");
  const { hybridLabelLines } = await import("../../dist/docs/harness-words.js");
  assert.equal(hybridLabelLines("ráp từng repo con\nRepo cha quyết\nrepo có vai `dept` · \"repo con\" · repository").length, 2,
    "the two hybrid labels are counted; the role identifier, a mention and an English word are not");
  put(s, "03_SKILLS/Skill_D/Skill_D.md", "x\nráp từng repo con\n");
  assert.ok(harnessWordFindings(s, () => null).some((x) => /Skill_D\.md: 1 line\(s\) with a half-English label/.test(x)), "a new HS file: none allowed");
});
