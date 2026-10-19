// `paths check` — two harness files whose paths are not pointers (Dept_HR 2026-10-19: 54 + 2 of 135 "dead"):
//   ① the test cases of a rule (`gate.json` › block · pass · partial) feed the hook made-up paths · ② a file zemory generates
//   and marks `"generator": "zemory"` (the guard's policy.json, rebuilt every sync). Each rule has its NEGATIVE.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { gateCaseOnly, isDictionaryFile, isZemoryGenerated, pathsCheck } from "../../dist/docs/paths.js";
import { tempDir } from "./helpers.mjs";

function repo(t) {
  const root = join(tempDir(t, "zemory-phf-"), "RepoA");
  mkdirSync(join(root, "docs", "agent", "01_LAW", "_Rule", "Rule_Own_01_X"), { recursive: true });
  const cfg = { docs: "docs/agent", adapters: {}, thresholds: {} };
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify(cfg));
  writeFileSync(join(root, "docs", "agent", "01_LAW", "_Rule", "Rule_Own_01_X", "hook.cjs"), "//\n");
  return { root, cfg, rule: join(root, "docs", "agent", "01_LAW", "_Rule", "Rule_Own_01_X") };
}
const run = (root, cfg) => pathsCheck({ projectRoot: root, docsDir: join(root, "docs", "agent"), config: cfg, log() {} });
const dead = (r) => r.dead.map((h) => h.text);
const reason = (r, text) => r.unresolved.find((h) => h.text === text)?.reason;

const gate = (extra = {}) => JSON.stringify({
  hook: ["hook.cjs"],
  block: [{ note: "a made-up file", tool_input: { file_path: "src/store/queries.ts" } }],
  pass: [{ tool_input: { file_path: "docs/agent/02_RULES.md" } }],
  ...extra,
}, null, 2);

test("① a path only a test case holds is not judged (test-case)", (t) => {
  const { root, cfg, rule } = repo(t);
  writeFileSync(join(rule, "gate.json"), gate());
  const r = run(root, cfg);
  assert.deepEqual(dead(r), []);
  assert.equal(reason(r, "src/store/queries.ts"), "test-case");
  assert.equal(reason(r, "docs/agent/02_RULES.md"), "test-case");
});

test("① NEGATIVE: a missing path in the gate's own keys stays DEAD", (t) => {
  const { root, cfg, rule } = repo(t);
  writeFileSync(join(rule, "gate.json"), gate({ read: ["docs/agent/gone/SKILL.md"] }));
  assert.deepEqual(dead(run(root, cfg)), ["docs/agent/gone/SKILL.md"]);
});

test("① NEGATIVE: the same made-up path in a file that is not gate.json stays DEAD", (t) => {
  const { root, cfg, rule } = repo(t);
  writeFileSync(join(rule, "cases.json"), gate());
  assert.ok(dead(run(root, cfg)).includes("src/store/queries.ts"));
});

test("① a path a case AND an own key both hold is judged (own key wins)", () => {
  const only = gateCaseOnly(gate({ read: ["src/store/queries.ts"] }));
  assert.equal(only("src/store/queries.ts"), false);
  assert.equal(only("docs/agent/02_RULES.md"), true);
  assert.equal(gateCaseOnly("{ not json"), null);
});

test("② a file marked generator zemory is not scanned", (t) => {
  const { root, cfg, rule } = repo(t);
  writeFileSync(join(rule, "policy.json"), JSON.stringify({ generator: "zemory", read: "docs/agent/03_SKILLS/Gone/SKILL.md" }, null, 2));
  assert.deepEqual(dead(run(root, cfg)), []);
});

test("③ store parts of the folder harness are dictionaries (their relative paths name slots)", () => {
  for (const p of [
    "docs/agent/01_LAW/_Rule/02_Work/Rule_Keys_62_DesignChangeApproval/Rule_Keys_62_DesignChangeApproval.md",
    "docs/agent/01_LAW/_Rule/Rule_Gate_04_ScratchFiles/gate.json",
    "docs/agent/01_LAW/_Cons/04_Security/Cons_Gate_14_Access/Cons_Gate_14_Access.md",
    "docs/agent/02_STRUCTURE/_Slot/Docs_004_Docs/Docs_004_Docs.md",
    "docs/agent/03_SKILLS/Skill_PBI_Mix/Skill_PBI_Mix.md",
    "docs/agent/03_SKILLS/Skill_PBI_Mix/Claude/pbi-mix/SKILL.md",
  ]) assert.equal(isDictionaryFile(p), true, p);
});

test("③ NEGATIVE: what the repo writes itself still points and is judged", () => {
  for (const p of [
    "docs/agent/01_LAW/_Cons/04_Security/Cons_Gate_14_Access/Cons.md",
    "docs/agent/01_LAW/_Cons/Cons_Core_104_TimedException/Cons_Core_104_TimedException.md",
    "docs/agent/01_LAW/_Rule/LEGACY.md",
    "docs/agent/01_LAW/_Rule/Rule_Own_01_X/Rule_Own_01_X.md",
    "docs/agent/03_SKILLS/Skill_Own_Revenue/Skill_Own_Revenue.md",
    "docs/agent/02_STRUCTURE/_Slot/Slot_Own_1/Slot_Own_1.md",
    "docs/agent/04_TODO.md",
  ]) assert.equal(isDictionaryFile(p), false, p);
});

test("③ a dead relative path in a store skill is not reported; the same in the repo's fill is", (t) => {
  const { root, cfg } = repo(t);
  const sk = join(root, "docs", "agent", "03_SKILLS", "Skill_PBI_Mix");
  const fr = join(root, "docs", "agent", "01_LAW", "_Cons", "04_Security", "Cons_Gate_14_Access");
  mkdirSync(sk, { recursive: true });
  mkdirSync(fr, { recursive: true });
  writeFileSync(join(sk, "Skill_PBI_Mix.md"), "Run `scripts/mix_builder.py`.\n");
  writeFileSync(join(fr, "Cons.md"), "Keys in `config/mail/mail.env`.\n");
  const r = run(root, cfg);
  assert.deepEqual(dead(r), ["config/mail/mail.env"]);
  assert.equal(reason(r, "scripts/mix_builder.py"), "dictionary");
});

test("② NEGATIVE: the same file without the mark is scanned", (t) => {
  const { root, cfg, rule } = repo(t);
  writeFileSync(join(rule, "policy.json"), JSON.stringify({ generator: "other", read: "docs/agent/03_SKILLS/Gone/SKILL.md" }, null, 2));
  assert.deepEqual(dead(run(root, cfg)), ["docs/agent/03_SKILLS/Gone/SKILL.md"]);
  assert.equal(isZemoryGenerated('{\n  "generator": "zemory",'), true);
  assert.equal(isZemoryGenerated('{ "a": 1, "generator": "zemory" }'), false);
});
