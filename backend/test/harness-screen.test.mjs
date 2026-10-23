// The Harness screen's set builder (docs/plan/31): a set is its folder, so saving a draft assembles a folder and readKits
// reads it back; dropping a part from a set removes it from the folder. Run on a copy of HS, never on the real one.
import assert from "node:assert/strict";
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { tempDir } from "./helpers.mjs";

const h = await import("../../dist/docs/harness-screen.js");
const REAL = fileURLToPath(new URL("../../docs_template", import.meta.url));

function copyHs(t) {
  const base = tempDir(t, "zemory-hs-");
  cpSync(join(REAL, "_Store"), join(base, "_Store"), { recursive: true });
  cpSync(join(REAL, "04_IDE_App_Memory"), join(base, "04_IDE_App_Memory"), { recursive: true });
  return join(base, "_Store");
}

test("a new set saved from a draft is a folder readKits reads back with the same parts", (t) => {
  const store = copyHs(t);
  const src = h.listSets(store).find((s) => s.name === "04_IDE_App_Memory");
  const d = { host: "IDE", tier: "Memory", title: "Trial", structure: src.structure, rules: src.rules, constitution: src.constitution, skills: src.skills.slice(0, 3) };
  assert.deepEqual(h.checkDraft(d, store), []);
  const r = h.saveDraft(d, store);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.name, "05_IDE_Trial_Memory", "the next free number");
  const back = h.listSets(store).find((s) => s.name === r.name);
  assert.deepEqual([...back.rules].sort(), [...d.rules].sort());
  assert.deepEqual([...back.skills].sort(), [...d.skills].sort());
  assert.equal(back.structure, d.structure);

  // edit: drop one skill - it leaves the set folder
  const dropped = d.skills[0];
  const e = { ...d, editing: r.name, skills: d.skills.slice(1) };
  assert.equal(h.saveDraft(e, store).ok, true);
  const again = h.listSets(store).find((s) => s.name === r.name);
  assert.ok(!again.skills.includes(dropped), `${dropped} removed from the set`);
  assert.ok(!existsSync(join(store, "..", r.name, "docs", "archive")), "a set keeps no archive folder");
});

test("NEGATIVE: a draft with an unknown part, no structure or a rename of the set it edits is refused and writes nothing", (t) => {
  const store = copyHs(t);
  const base = { host: "IDE", tier: "Memory", title: "X", structure: "Struc_Nope", rules: ["Rule_999"], constitution: [], skills: [] };
  const errs = h.checkDraft(base, store);
  assert.ok(errs.some((e) => /structure/.test(e)) && errs.some((e) => /Rule_999/.test(e)), errs.join(" | "));
  const r = h.saveDraft(base, store);
  assert.equal(r.ok, false);
  assert.equal(h.listSets(store).length, 1, "nothing was written");
  // editing keeps the folder name: a draft that renames the set it edits, or edits a set that is not there, is refused
  const set = h.listSets(store)[0];
  const rename = { host: "IDE", tier: "Memory", title: "Other", editing: set.name, structure: set.structure, rules: [], constitution: [], skills: [] };
  assert.ok(h.checkDraft(rename, store).some((e) => /keeps its name/.test(e)), h.checkDraft(rename, store).join(" | "));
  assert.ok(h.checkDraft({ ...rename, editing: "04_IDE_Other_Memory" }, store).some((e) => /keeps its name/.test(e)));
  assert.equal(h.saveDraft(rename, store).ok, false);
  assert.equal(h.listSets(store).length, 1, "nothing was written");
  // a draft off the wire with wrong field types is read as empty fields, not thrown on
  assert.ok(h.draftReport({ rules: "x", skills: [1] }, store).problems.some((p) => p.code === "structure"));
});
