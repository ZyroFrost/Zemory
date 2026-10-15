// plan/28 §0o — one dictionary for part names. A citation must keep resolving when a rule moves between enforcement groups
// or is renamed: identity is code + number, never the group or the name.
import assert from "node:assert/strict";
import test from "node:test";

import {
  camelName,
  citationKey,
  enforcementOf,
  formatPartName,
  hostSkillName,
  keyOf,
  legacyKey,
  parsePartName,
  slotArea,
} from "../../dist/docs/harness-names.js";

test("every kind of part name parses into its components and formats back to the same text", () => {
  for (const name of ["Rule_Keys_14_ChallengeDesign", "Cons_Gate_05_OneNameDictionary", "Struc_Repo_App", "Slot_Backend_012_Commands", "Skill_Doc_WriteDocx"]) {
    const p = parsePartName(name);
    assert.ok(p, `must parse: ${name}`);
    assert.equal(formatPartName(p), name);
  }
  assert.deepEqual(parsePartName("Rule_Core_11_VerifyClaims"), { code: "Rule", group: "Core", nn: "11", no: 11, name: "VerifyClaims" });
});

test("a name with an unknown component or the wrong case is rejected (a red gate for store parts)", () => {
  for (const bad of ["Rule_Soft_14_X", "rule_keys_14_x", "Rule_Keys_14_challenge-design", "Struc_Planet_App", "Skill_Misc_X", "02-14_challenge-design", "Slot_Backend_12"]) {
    assert.equal(parsePartName(bad), null, `must be rejected: ${bad}`);
  }
});

test("identity survives promotion and renaming; legacy ids map onto the same key", () => {
  assert.equal(citationKey("Rule_Core_34_HarnessInSync"), "Rule_34");
  assert.equal(citationKey("Rule_Keys_34_SomethingElse"), "Rule_34", "group and name are ignored");
  assert.equal(citationKey("02-34"), "Rule_34");
  assert.equal(citationKey("01-5"), "Cons_5");
  assert.equal(citationKey("03-93"), "Slot_93");
  assert.equal(citationKey("Rule_34"), "Rule_34");
  assert.equal(citationKey("Rule_034"), "Rule_34", "padding does not change the key");
  assert.equal(citationKey("whatever"), null);
  assert.equal(legacyKey("04-1"), null, "skills had no numbers");
  assert.equal(keyOf(parsePartName("Struc_Repo_App")), "Struc_Repo_App", "an unnumbered bundle is keyed by its name");
});

test("helpers: legacy kebab names, slot areas, host skill names, enforcement from gate.json", () => {
  assert.equal(camelName("challenge-design"), "ChallengeDesign");
  assert.equal(camelName("sql_one_way"), "SqlOneWay");
  assert.equal(slotArea("backend/src/commands/"), "Backend");
  assert.equal(slotArea(".claude/skills/"), "Claude");
  assert.equal(slotArea(".env"), "Root");
  assert.equal(slotArea("package.json"), "Root");
  assert.equal(hostSkillName({ group: "Doc", name: "WriteDocx" }), "doc-write-docx");
  assert.equal(hostSkillName({ group: "PBI", name: "Main" }), "pbi-main");
  assert.equal(hostSkillName({ group: "Harness", name: "SessionClose" }), "harness-session-close");
  assert.equal(enforcementOf(null), "Core");
  assert.equal(enforcementOf({ prompt: { re: "x" } }), "Keys");
  assert.equal(enforcementOf({ prompt: { re: "x" }, hook: "hook.cjs" }), "Gate", "a blocking gate outranks a reminder");
  assert.equal(enforcementOf({ gate: "guard" }), "Gate");
  assert.equal(enforcementOf({ read: [] }), "Gate");
});
