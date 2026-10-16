// THE RULE CORE (plan/27 §3): only the rules no machine gate holds are forced reading. They sit in ONE section at the top
// of 02_RULES (zemory:core markers); every other rule `02-N` carries a gate mark. This file pins:
//   · the layout holds in zemory's own rule set and in all five template sets (no rule ungated outside the core, no gated
//     rule inside it, the core within its cap) — the same check `zemory gates` runs on every repo;
//   · each way the layout can go wrong is caught (negatives below);
//   · the generated read-first latch and docs/rule-core.ts read the SAME boundaries (they cannot share code: the latch
//     is a stdlib script) — and the latch forces the core, not the whole file;
//   · a context compaction gets the core back, verbatim.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { CORE_END, CORE_MAX_CHARS, CORE_START, coreForCompaction, coreIssues, coreSection, hpCoreText, ruleBlocks } from "../../dist/docs/rule-core.js";
import { READ_FIRST_SOURCE } from "../../dist/docs/read-first-src.js";
import { tempDir } from "./helpers.mjs";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SETS = ["docs/agent", ...["01_cowork_basic/nonapp", "02_cowork_memory/nonapp", "03_nonapp", "04_adapt", "05_app"].map((s) => `attic/legacy-templates/${s}/agent`)];

test("every rule set: each rule is gated or in the core, never both, and the core is within its cap", () => {
  for (const dir of SETS) {
    const text = readFileSync(join(ROOT, dir, "02_RULES.md"), "utf8");
    const i = coreIssues(text, dir === "docs/agent" ? ROOT : null);
    assert.equal(i.noCore, false, `${dir}: no core section`);
    assert.deepEqual(i.unmarked, [], `${dir}: rules outside the core with no gate mark`);
    assert.deepEqual(i.gatedInCore, [], `${dir}: gated rules inside the core`);
    assert.deepEqual(i.badGate, [], `${dir}: gate marks that do not resolve`);
    assert.equal(i.overCap, 0, `${dir}: core over ${CORE_MAX_CHARS} characters`);
    assert.ok(ruleBlocks(text).filter((b) => b.inCore).length >= 20, `${dir}: the core holds the judgement rules`);
  }
});

test("the core stands FIRST: right after the read-carefully block, before every other section", () => {
  for (const dir of SETS) {
    const text = readFileSync(join(ROOT, dir, "02_RULES.md"), "utf8");
    const heads = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    assert.match(heads[0], /^Lõi/, `${dir}: first section is "${heads[0]}"`);
  }
});

const SAMPLE = [
  "# x",
  "## Lõi — luật không có chốt máy (bắt đọc)",
  `${CORE_START} · test -->`,
  "- `02-1` **A.** judgement",
  "  continued",
  "- `02-7` **B.** judgement",
  CORE_END,
  "",
  "## Git",
  "- `02-50` **Push.** words <!-- gate: guard -->",
  "```",
  "02-25 SQL   gom <!-- gate: guard -->",
  "```",
  "",
].join("\n");

test("NEGATIVE: an unmarked rule outside the core, a marked rule inside, a dead test mark, a missing core, an oversize core", () => {
  assert.deepEqual(coreIssues(SAMPLE, null), { noCore: false, unmarked: [], gatedInCore: [], badGate: [], overCap: 0 }, "the sample is clean");
  assert.deepEqual(coreIssues(SAMPLE.replace("gom <!-- gate: guard -->", "gom"), null).unmarked, ["02-25"], "a fenced rule lost its mark");
  assert.deepEqual(coreIssues(SAMPLE.replace("**Push.** words <!-- gate: guard -->", "**Push.** words"), null).unmarked, ["02-50"]);
  assert.deepEqual(coreIssues(SAMPLE.replace("  continued", "  continued <!-- gate: guard -->"), null).gatedInCore, ["02-1"]);
  const t = tempDir(test, "zemory-core-");
  mkdirSync(join(t, "backend", "test"), { recursive: true });
  writeFileSync(join(t, "backend", "test", "real.test.mjs"), "");
  assert.deepEqual(coreIssues(SAMPLE.replace("gom <!-- gate: guard -->", "gom <!-- gate: test:real -->"), t).badGate, [], "an existing test resolves");
  assert.deepEqual(coreIssues(SAMPLE.replace("gom <!-- gate: guard -->", "gom <!-- gate: test:gone -->"), t).badGate, ["02-25 (test:gone)"]);
  assert.deepEqual(coreIssues(SAMPLE.replace("gom <!-- gate: guard -->", "gom <!-- gate: vibes -->"), null).badGate, ["02-25 (vibes)"]);
  assert.equal(coreIssues(SAMPLE.replace(`${CORE_START} · test -->`, "").replace(CORE_END, ""), null).noCore, true);
  const fat = SAMPLE.replace("  continued", "  " + "x".repeat(CORE_MAX_CHARS));
  assert.ok(coreIssues(fat, null).overCap > CORE_MAX_CHARS);
});

function latch(t) {
  const base = tempDir(t, "zemory-core-rf-");
  writeFileSync(join(base, "rf.cjs"), READ_FIRST_SOURCE);
  return createRequire(import.meta.url)(join(base, "rf.cjs"));
}

test("the latch and rule-core.ts read the SAME boundaries — on zemory's own 02_RULES and 01_CONSTITUTION", (t) => {
  const RF = latch(t);
  const rules = readFileSync(join(ROOT, "docs/agent/02_RULES.md"), "utf8").replace(/\r\n/g, "\n");
  const lines = rules.split("\n");
  const want = RF.sectionLines(lines, ["core"]);
  const picked = [...want].sort((a, b) => a - b).map((n) => lines[n - 1]).join("\n");
  assert.equal(picked, coreSection(rules), "core lines differ between the latch and rule-core.ts");
  const hp = readFileSync(join(ROOT, "docs/agent/01_CONSTITUTION.md"), "utf8").replace(/\r\n/g, "\n");
  const hl = hp.split("\n");
  const hpWant = RF.sectionLines(hl, ["no-gate", "no-gate-articles", "heading:Mục đích"]);
  const hpPicked = new Set([...hpWant].map((n) => hl[n - 1]).filter((l) => l.trim()));
  const fromTs = new Set(hpCoreText(hp).split("\n").filter((l) => l.trim()));
  assert.deepEqual([...hpPicked].sort(), [...fromTs].sort(), "01 forced lines differ between the latch and rule-core.ts");
  assert.ok(hpCoreText(hp).length < hp.length / 2, "01 is forced by section, not in full");
});

test("read-first forces the core, not the whole file; a file without markers is due in full", (t) => {
  const base = tempDir(t, "zemory-core-rf2-");
  const root = join(base, "repo");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "docs", "agent", "02_RULES.md"), SAMPLE);
  writeFileSync(join(base, "rf.cjs"), READ_FIRST_SOURCE);
  const RF = createRequire(import.meta.url)(join(base, "rf.cjs"));
  const policy = { read_first: { required: [], sections: [{ file: "docs/agent/02_RULES.md", parts: ["core"] }], triggers: [] } };
  const tx = join(base, "s.jsonl");
  const readOf = (content) => JSON.stringify({ type: "user", toolUseResult: { type: "text", file: { filePath: join(root, "docs/agent/02_RULES.md"), content } } });
  const check = (entries) => {
    writeFileSync(tx, entries.join("\n") + "\n");
    return RF.readFirst({ tool_name: "Edit", tool_input: { file_path: join(root, "x.md") }, transcript_path: tx }, root, policy);
  };
  const msg = check([]);
  assert.match(msg, /02_RULES\.md - §Lõi/, "the block names the section");
  assert.match(msg, /still to read: lines 3-7/, "only the core lines are due");
  const coreOnly = SAMPLE.split("\n").slice(2, 7).join("\n");
  assert.equal(check([readOf(coreOnly)]), null, "reading the core alone lets the edit through");
  assert.match(check([readOf(SAMPLE.split("\n").slice(8).join("\n"))]), /NOT READ IN FULL/, "reading the gated part is not reading the core");
  writeFileSync(join(root, "docs", "agent", "02_RULES.md"), SAMPLE.replace(`${CORE_START} · test -->`, "").replace(CORE_END, ""));
  const whole = check([readOf(coreOnly)]);
  assert.match(whole, /still to read: lines 1-2, /, "no markers ⇒ the whole file is due, from line 1");
  assert.doesNotMatch(whole, /§Lõi/, "no markers ⇒ no section is named");
});

test("a context compaction gets the core back verbatim; another SessionStart stays silent", (t) => {
  const core = coreForCompaction(join(ROOT, "docs/agent"));
  assert.ok(core.includes(coreSection(readFileSync(join(ROOT, "docs/agent/02_RULES.md"), "utf8"))), "the 02 core, verbatim");
  assert.match(core, /Điều 15/, "with the ungated constitution articles");
  const dir = tempDir(t, "zemory-core-hook-");
  const cli = join(ROOT, "dist", "cli.js");
  const run = (source) =>
    spawnSync(process.execPath, [cli, "hook", "session-start"], {
      input: JSON.stringify({ session_id: "s1", source, cwd: ROOT, transcript_path: join(dir, "none.jsonl") }),
      encoding: "utf8",
      env: { ...process.env, GLOBAL_MEMORY_DB: join(dir, "store", "gm.db") },
      timeout: 60_000,
    }).stdout;
  assert.match(run("compact"), /Lõi luật của repo[\s\S]*02-11/, "compact ⇒ the core is in the injected context");
  assert.doesNotMatch(run("startup"), /Lõi luật/, "a normal session start injects nothing");
});
