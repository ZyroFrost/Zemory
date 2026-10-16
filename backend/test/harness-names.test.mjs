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
  parseSetName,
  legacyKey,
  parsePartName,
  slotArea,
} from "../../dist/docs/harness-names.js";

test("every kind of part name parses into its components and formats back to the same text", () => {
  for (const name of ["Rule_Keys_14_ChallengeDesign", "Cons_Gate_05_OneNameDictionary", "Struc_Repo_App", "Backend_012_Commands", "GUI", "Skill_Doc_WriteDocx"]) {
    const p = parsePartName(name);
    assert.ok(p, `must parse: ${name}`);
    assert.equal(formatPartName(p), name);
  }
  assert.deepEqual(parsePartName("Rule_Core_11_VerifyClaims"), { code: "Rule", group: "Core", nn: "11", no: 11, name: "VerifyClaims" });
  // an inner-layer part names only its own content (plan/28 §0p); the older prefixed forms still read to the same key
  assert.equal(parsePartName("Backend_012_Commands").code, "Slot");
  assert.equal(parsePartName("IDE").code, "Host");
  assert.equal(keyOf(parsePartName("Slot_Backend_012_Commands")), keyOf(parsePartName("Backend_012_Commands")));
  assert.equal(keyOf(parsePartName("Host_GUI")), keyOf(parsePartName("GUI")));
  assert.equal(parsePartName("Desktop"), null, "a host is a kind of environment, never an app's name");
});

test("a set name says only what is fixed for the set: number, structure, host, tier", () => {
  assert.deepEqual(parseSetName("03_IDE_NonApp_Memory"), { nn: "03", structure: "NonApp", host: "IDE", tier: "Memory" });
  for (const bad of ["03_Rule_NonApp_Task_Memory", "03_NonApp_IDE_Memory", "03_NonApp_Memory", "03_Desktop_NonApp_Memory", "3_IDE_NonApp_Memory"]) {
    assert.equal(parseSetName(bad), null, `must be rejected: ${bad}`);
  }
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
