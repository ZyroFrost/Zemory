// plan/29 §6 · §11 · Rule_Gate_86_LawLayersAgree — links between laws, frames and skills are written in the body and agree
// both ways; every store law and frame is bilingual in one shape. The real store must be clean; negative cases run on a
// temp store so a checker that never fires cannot pass.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { implementsOf, lawFormatFindings, lawLinkFindings, linksOf } from "../../dist/docs/law-links.js";
import { tempDir } from "./helpers.mjs";

function put(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

const BI = (id, links = "", doEn = "1. one\n2. two", doVi = "1. một\n2. hai") =>
  `---\nid: ${id}\nversion: 1\n---\n# x\n\n## What\nw\n\n## When\n- w\n\n## Do\n${doEn}\n\n## Example\n- e\n\n## Check\n- c\n\n` +
  `## Luật là gì\nw\n\n## Khi nào áp\n- w\n\n## Phải làm gì\n${doVi}\n\n## Ví dụ\n- e\n\n## Máy kiểm\n- c\n\n## Links · Liên kết\n${links}\n`;

function store(t) {
  const s = tempDir(t, "zemory-links-");
  put(s, "01_LAW/_Rule/01_Harness/Rule_Gate_90_Alpha/Rule_Gate_90_Alpha.md",
    BI("Rule_90", "- Implements · Thi hành: `Skill_Harness_Beta` — how · cách\n- Repo declares · Repo khai: `Cons_Gate_09_Purpose` — where · ở đâu"));
  put(s, "01_LAW/_Cons/01_Scope/Cons_Gate_09_Purpose/Cons_Gate_09_Purpose.md", BI("Cons_9"));
  put(s, "03_SKILLS/Skill_Harness_Beta/Skill_Harness_Beta.md", "---\nid: Skill_Harness_Beta\nversion: 1\ntype: process\n---\n# beta\n\n## Implements · Thi hành luật\n- `Rule_Gate_90_Alpha` — all · hết\n");
  return s;
}

test("the real store: every link names a living part and agrees both ways; every law and frame is bilingual", () => {
  assert.deepEqual(lawLinkFindings(), []);
  assert.deepEqual(lawFormatFindings(), []);
});

test("links are read from the body: a law's ## Links lines and a skill's ## Implements lines", () => {
  const law = "# x\n\n## Links · Liên kết\n- Implements · Thi hành: `Skill_A_B` — x\n- Repo declares · Repo khai: `Cons_Gate_14_Access` › Cons.md — y\n- Related · Liên quan: `Rule_Gate_35_OneHome` — z\n";
  assert.deepEqual(linksOf(law), [
    { kind: "implements", name: "Skill_A_B" },
    { kind: "declares", name: "Cons_Gate_14_Access" },
    { kind: "related", name: "Rule_Gate_35_OneHome" },
  ]);
  assert.deepEqual(implementsOf("# s\n\n## Implements · Thi hành luật\n- `Rule_Gate_35_OneHome` — a\n\n## Other\n- `Rule_Gate_1_X` — b\n"), ["Rule_Gate_35_OneHome"]);
  assert.deepEqual(linksOf("# no links\n"), []);
});

test("a temp store that agrees is clean; each kind of break is named", (t) => {
  const s = store(t);
  assert.deepEqual(lawLinkFindings(s, s), [], "both directions written");
  assert.deepEqual(lawFormatFindings(s), []);
  // one-sided: the skill no longer lists the law
  put(s, "03_SKILLS/Skill_Harness_Beta/Skill_Harness_Beta.md", "---\nid: Skill_Harness_Beta\nversion: 1\ntype: process\n---\n# beta\n");
  assert.ok(lawLinkFindings(s, s).some((f) => /Rule_Gate_90_Alpha: names Skill_Harness_Beta as implementing it/.test(f)));
  // the other side: a skill claims a law that does not name it
  put(s, "03_SKILLS/Skill_Harness_Beta/Skill_Harness_Beta.md", "---\nid: Skill_Harness_Beta\nversion: 1\ntype: process\n---\n# beta\n\n## Implements · Thi hành luật\n- `Rule_Gate_90_Alpha` — all\n- `Cons_Gate_09_Purpose` — x\n");
  assert.ok(lawLinkFindings(s, s).some((f) => /Skill_Harness_Beta: says it implements Cons_Gate_09_Purpose/.test(f)));
  // dead names, wrong kinds
  put(s, "01_LAW/_Rule/01_Harness/Rule_Gate_91_Gamma/Rule_Gate_91_Gamma.md",
    BI("Rule_91", "- Related · Liên quan: `Rule_Gate_99_Gone` — x\n- Implements · Thi hành: `Cons_Gate_09_Purpose` — x\n- Repo declares · Repo khai: `Rule_Gate_90_Alpha` — x"));
  const f = lawLinkFindings(s, s);
  assert.ok(f.some((x) => /Rule_Gate_91_Gamma: ## Links names Rule_Gate_99_Gone, which is not a living part/.test(x)));
  assert.ok(f.some((x) => /"Implements" names Cons_Gate_09_Purpose, which is not a skill/.test(x)));
  assert.ok(f.some((x) => /"Repo declares" names Rule_Gate_90_Alpha, which is not a constitution frame/.test(x)));
});

test("in a repo a name the store holds is not dead, and the two sides are compared only when both are in the repo", (t) => {
  const s = store(t);
  const agent = tempDir(t, "zemory-links-repo-");
  // the repo carries the law but not the skill: no finding
  put(agent, "01_LAW/_Rule/01_Harness/Rule_Gate_90_Alpha/Rule_Gate_90_Alpha.md",
    BI("Rule_90", "- Implements · Thi hành: `Skill_Harness_Beta` — how · cách"));
  assert.deepEqual(lawLinkFindings(agent, s), []);
  // a name neither the repo nor the store has is dead
  put(agent, "03_SKILLS/Skill_Own_Revenue/Skill_Own_Revenue.md", "---\nid: Skill_Own_Revenue\nversion: 1\ntype: process\n---\n# r\n\n## Implements · Thi hành luật\n- `Cons_Gate_77_Nowhere` — x\n");
  assert.ok(lawLinkFindings(agent, s).some((x) => /Skill_Own_Revenue: ## Implements names Cons_Gate_77_Nowhere, which is not a living part/.test(x)));
});

test("plan/29 §23: an own skill implementing an HS frame is answered by the repo's Cons.md naming it, not by the HS text", (t) => {
  const s = store(t);
  const agent = tempDir(t, "zemory-links-own-");
  put(agent, "01_LAW/_Cons/01_Scope/Cons_Gate_09_Purpose/Cons_Gate_09_Purpose.md", BI("Cons_9"));
  put(agent, "03_SKILLS/Skill_Own_Revenue/Skill_Own_Revenue.md", "---\nid: Skill_Own_Revenue\nversion: 1\ntype: process\n---\n# r\n\n## Implements · Thi hành luật\n- `Cons_Gate_09_Purpose` — x\n");
  const oneSided = (f) => f.some((x) => /Skill_Own_Revenue: says it implements Cons_Gate_09_Purpose/.test(x));
  assert.ok(oneSided(lawLinkFindings(agent, s)), "no Cons.md yet: one-sided");
  put(agent, "01_LAW/_Cons/01_Scope/Cons_Gate_09_Purpose/Cons.md", "## Định nghĩa\n| Revenue | x | cách tính: `Skill_Own_RevenueOld` |\n");
  assert.ok(oneSided(lawLinkFindings(agent, s)), "a longer name that only starts with the skill's is not an answer");
  put(agent, "01_LAW/_Cons/01_Scope/Cons_Gate_09_Purpose/Cons.md", "## Định nghĩa\n| Revenue | x | cách tính: `Skill_Own_Revenue` |\n");
  assert.deepEqual(lawLinkFindings(agent, s), [], "the definition row names the skill");
});

test("the bilingual shape: a missing section, the order, and a Do list that lost a step are named", (t) => {
  const s = store(t);
  put(s, "01_LAW/_Rule/02_Work/Rule_Core_92_NoVi/Rule_Core_92_NoVi.md", "---\nid: Rule_92\nversion: 1\n---\n# x\n\n## What\nw\n\n## When\n- w\n\n## Do\n1. a\n\n## Example\n- e\n\n## Check\n- c\n");
  put(s, "01_LAW/_Rule/02_Work/Rule_Core_93_Lost/Rule_Core_93_Lost.md", BI("Rule_93", "", "1. a\n2. b\n3. c", "1. a\n2. b"));
  const f = lawFormatFindings(s);
  assert.ok(f.some((x) => /Rule_Core_92_NoVi: missing section\(s\) "## Luật là gì"/.test(x)), f.join("\n"));
  assert.ok(f.some((x) => /Rule_Core_93_Lost: "Do" has 3 step\(s\) but "Phải làm gì" has 2/.test(x)), f.join("\n"));
  // Vietnamese before English
  const swapped = BI("Rule_94").replace(/(## What[\s\S]*?)(## Luật là gì[\s\S]*?)(## Links)/, "$2$1$3");
  put(s, "01_LAW/_Rule/02_Work/Rule_Core_94_Swapped/Rule_Core_94_Swapped.md", swapped);
  assert.ok(lawFormatFindings(s).some((x) => /Rule_Core_94_Swapped: sections out of order/.test(x)));
  // a retired law keeps its old text
  put(s, "01_LAW/_Rule/02_Work/Rule_Core_95_Old/Rule_Core_95_Old.md", "---\nid: Rule_95\nversion: 1\nretired: true\n---\n# old\n\n- text\n");
  assert.ok(!lawFormatFindings(s).some((x) => /Rule_Core_95_Old/.test(x)));
});

test("conform: a repo synced from a set has no broken link; an own skill naming a law that does not exist is red", async (t) => {
  const { execFileSync } = await import("node:child_process");
  const { applyKit } = await import("../../dist/docs/kit-apply.js");
  const { conform } = await import("../../dist/docs/conform.js");
  const root = tempDir(t, "zemory-links-conform-");
  execFileSync("git", ["init", "-q"], { cwd: root, windowsHide: true });
  applyKit(root, { kitRef: "05", apply: true });
  const item = () => conform(root).items.find((i) => i.check === "law-links");
  assert.equal(item(), undefined, "the store's links travel whole: nothing to report");
  put(root, "docs/agent/03_SKILLS/Skill_Own_Revenue/Skill_Own_Revenue.md",
    "---\nid: Skill_Own_Revenue\nversion: 1\ntype: process\n---\n# r\n\n## Implements · Thi hành luật\n- `Cons_Gate_77_Nowhere` — x\n");
  assert.equal(item()?.level, "blocking");
  assert.ok(item().samples.some((s) => /Skill_Own_Revenue: ## Implements names Cons_Gate_77_Nowhere/.test(s)), JSON.stringify(item()));
});

test("impact's tie list: what a part links to and what links to it", async (t) => {
  const { partLinks } = await import("../../dist/docs/law-links.js");
  const s = store(t);
  const r = partLinks("Rule_Gate_90_Alpha", s);
  assert.deepEqual(r.to, [{ kind: "implements", name: "Skill_Harness_Beta" }, { kind: "declares", name: "Cons_Gate_09_Purpose" }]);
  assert.deepEqual(r.from, [{ name: "Skill_Harness_Beta", kind: "implements" }]);
  assert.deepEqual(partLinks("Cons_Gate_09_Purpose", s).from, [{ name: "Rule_Gate_90_Alpha", kind: "declares" }]);
});
