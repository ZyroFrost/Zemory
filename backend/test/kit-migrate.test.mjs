// plan/28 §0l ⑤⑥ — moving a file-harness repo to the folder harness, on a fixture holding every case: a rule word for word
// from a kit, a rule the repo edited, a rule only the repo has (with a gate), a constitution with purpose and articles, a
// shared skill untouched / edited, a skill of the repo's own with its AGENTS.md trigger, and an old guard wired into
// settings.json and pre-commit. Nothing may be lost, nothing outside the harness touched, and the guard must follow.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { migrateToKit, normalizeOwnConstitution } from "../../dist/docs/kit-migrate.js";
import { applyKit } from "../../dist/docs/kit-apply.js";
import { generateGuards, gitHooksDir } from "../../dist/docs/guard-gen.js";
import { conform } from "../../dist/docs/conform.js";
import { tempDir } from "./helpers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NONAPP = join(ROOT, "attic", "legacy-templates", "03_nonapp");
const put = (root, rel, text) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};

function fixture(t) {
  const root = tempDir(t, "zemory-mig-");
  execFileSync("git", ["init", "-q"], { cwd: root });
  put(root, "docs/.harness.json", JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {}, profile: "non-app" }));
  const kitRules = readFileSync(join(NONAPP, "agent", "02_RULES.md"), "utf8");
  const edited = kitRules.replace(/^- `02-7` \*\*[^\n]*$/m, (l) => `${l} REPO-ONLY-EDIT`);
  assert.notEqual(edited, kitRules, "fixture: 02-7 found in the kit rules");
  put(root, "docs/agent/02_RULES.md", `${edited}\n- \`02-99\` **Luật riêng của repo.** chỉ repo này có. <!-- gate: guard -->\n`);
  put(root, "docs/agent/01_CONSTITUTION.md", "# X — Hiến pháp\n\n## Mục đích\nPhục vụ bài toán A.\n\n## Điều khoản\n\n1. **Điều một bất biến.** nội dung một.\n\n2. **Điều hai.** nội dung hai.\n\n## Sửa đổi hiến pháp\n- chỉ khi có phê duyệt\n");
  put(root, "docs/agent/03_STRUCTURE.md", "# Cấu trúc\n\n## 2. Cây thư mục\n├── reports/   deliverable\n");
  put(root, "docs/agent/04_SKILLS.md", "# Skill\n\n| `grill/` | x |\n");
  put(root, "docs/agent/05_TODO.md", "# TODO\n- [ ] keep me\n");
  put(root, "docs/agent/06_CHANGES.md", "# Changes\n");
  put(root, "AGENTS.md", "# X\n\n| Mở khi | Đọc |\n|---|---|\n| làm báo cáo pbi | `.claude/skills/pbi-main/SKILL.md` |\n| chưa rõ | `.claude/skills/grill/SKILL.md` |\n");
  put(root, "CLAUDE.md", "@AGENTS.md\n");
  put(root, ".claude/skills/pbi-main/SKILL.md", "---\nname: pbi-main\ndescription: x\n---\nown\n");
  put(root, ".claude/skills/grill/SKILL.md", readFileSync(join(NONAPP, ".claude", "skills", "grill", "SKILL.md"), "utf8"));
  put(root, ".claude/skills/audit/SKILL.md", readFileSync(join(NONAPP, ".claude", "skills", "audit", "SKILL.md"), "utf8") + "\nREPO EDIT\n");
  generateGuards(root); // the old guard in docs/hooks, wired into settings.json and pre-commit
  return root;
}

test("dry-run reports the move and writes nothing", (t) => {
  const root = fixture(t);
  const r = migrateToKit(root, { kitRef: "03", apply: false });
  assert.ok(!("error" in r), JSON.stringify(r));
  assert.deepEqual(r.localRules, ["02-7"], "only the rule the repo edited counts as edited");
  assert.deepEqual(r.ownRules, ["02-99"]);
  assert.ok(r.retiredRules.length > 0 && !r.retiredRules.includes("02-7"), "a rule the store retired, word for word, is dropped — not kept as the repo's own");
  assert.deepEqual(r.articles, ["01-1", "01-2"]);
  assert.ok(r.replacedSkills.includes("grill") && r.keptSkills.includes("audit"));
  assert.equal(r.carriedTriggers, 1);
  assert.ok(existsSync(join(root, "docs", "agent", "02_RULES.md")) && !existsSync(join(root, "docs", "agent", "01_LAW", "_Rule")), "nothing written");
});

test("apply: everything lands, nothing is lost, the repo's own work is untouched, the guard follows", (t) => {
  const root = fixture(t);
  const before = (rel) => readFileSync(join(root, rel), "utf8");
  const oldRules = before("docs/agent/02_RULES.md");
  const oldStruct = before("docs/agent/03_STRUCTURE.md");
  const r = migrateToKit(root, { kitRef: "03", apply: true, date: "2026-10-15" });
  assert.ok(!("error" in r), JSON.stringify(r));
  const agent = join(root, "docs", "agent");
  const arch = join(root, "docs", "archive", "file-harness-2026-10-15");
  for (const f of ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md", "AGENTS.md", "hooks"]) assert.ok(existsSync(join(arch, f)), `archived ${f}`);
  assert.equal(readFileSync(join(arch, "02_RULES.md"), "utf8"), oldRules, "the archive is byte for byte");
  // constitution
  const a1 = join(agent, "01_LAW", "_Cons", "Cons_Core_101_DieuMotBatBien", "Cons_Core_101_DieuMotBatBien.md");
  assert.match(readFileSync(a1, "utf8"), /nội dung một/);
  // The migration can only drop the marks of a Vietnamese title; conform holds the repo red until the part has an English
  // name (rule 30 for names the tool itself wrote — no hook sees those writes).
  const viFinding = conform(root).items.find((i) => i.check === "part-name-vi");
  assert.ok(viFinding && viFinding.samples.some((s) => /Cons_Core_101_DieuMotBatBien/.test(s)), JSON.stringify(viFinding));
  assert.equal(viFinding.level, "blocking");
  // the purpose becomes the written Cons.md of the purpose frame (plan/28 §0q)
  // the frame sits in its chapter (01_Scope/); its Cons.md names the frame by its own folder name, as the store's template does
  const purpose = readFileSync(join(agent, "01_LAW", "_Cons", "01_Scope", "Cons_Gate_09_Purpose", "Cons.md"), "utf8");
  assert.match(purpose, /^frame: Cons_Gate_09_Purpose$/m);
  assert.match(purpose, /^status: written$/m);
  assert.match(purpose, /Phục vụ bài toán A/);
  assert.match(purpose, /chỉ khi có phê duyệt/, "every non-article section is kept");
  assert.ok(!existsSync(join(agent, "01_CONSTITUTION.md")));
  // rules
  // a store rule sits in the folder of its code of law (01_Harness/ …); the repo's own rule stays flat
  const rulesDir = join(agent, "01_LAW", "_Rule");
  const ruleDirs = readdirSync(rulesDir).flatMap((d) => (/^\d{2}_/.test(d) ? readdirSync(join(rulesDir, d)).map((x) => `${d}/${x}`) : [d]));
  const r7 = ruleDirs.find((d) => d.split("/").pop().startsWith("Rule_") && d.includes("_07_"));
  const t7 = readFileSync(join(rulesDir, r7, `${r7.split("/").pop()}.md`), "utf8");
  assert.match(t7, /^from: _Store/m);
  assert.match(t7, /Bản của repo trước khi chuyển[\s\S]*REPO-ONLY-EDIT/, "the repo's wording is kept for a hand merge");
  const r99 = readdirSync(join(agent, "01_LAW", "_Rule")).find((d) => d.startsWith("Rule_Gate_99_"));
  assert.match(readFileSync(join(agent, "01_LAW", "_Rule", r99, `${r99}.md`), "utf8"), /chỉ repo này có/);
  assert.doesNotMatch(readFileSync(join(agent, "01_LAW", "_Rule", r99, `${r99}.md`), "utf8"), /^from:/m, "a repo-only rule is the repo's own");
  assert.deepEqual(JSON.parse(readFileSync(join(agent, "01_LAW", "_Rule", r99, "gate.json"), "utf8")), { gate: "guard" });
  // structure + skills + entry
  // the old structure file is in the archive byte for byte; the INDEX is the machine's table of contents (plan/29 §13)
  assert.equal(readFileSync(join(arch, "03_STRUCTURE.md"), "utf8"), oldStruct);
  assert.match(readFileSync(join(agent, "02_STRUCTURE", "INDEX.md"), "utf8"), /^<!-- zemory:generated/m);
  // an untouched shared skill takes the store copy: source in the harness, plugged under its host name; the old folder goes
  assert.match(readFileSync(join(root, "docs", "agent", "03_SKILLS", "Skill_Harness_Grill", "Skill_Harness_Grill.md"), "utf8"), /^from: _Store\/03_SKILLS\/Skill_Harness_Grill/m);
  assert.match(readFileSync(join(root, ".claude", "skills", "harness-grill", "SKILL.md"), "utf8"), /^from: _Store\/03_SKILLS\/Skill_Harness_Grill/m, "an untouched shared skill takes the store copy");
  assert.ok(!existsSync(join(root, ".claude", "skills", "grill")), "the untouched old copy does not stay beside the new one");
  const roster = readFileSync(join(agent, "03_SKILLS", "INDEX.md"), "utf8");
  assert.match(roster, /`\.claude\/skills\/harness-grill\/`/, "the generated list names the skill by its host folder");
  assert.doesNotMatch(roster, /`grill\/`/, "no row left pointing at the removed folder (conform: skill-roster-drift)");
  assert.match(roster, /`\.claude\/skills\/pbi-main\/`/, "the repo's own host-only skill has its row");
  assert.match(readFileSync(join(root, ".claude", "skills", "audit", "SKILL.md"), "utf8"), /REPO EDIT/, "an edited shared skill is kept");
  assert.equal(readFileSync(join(root, ".claude", "skills", "pbi-main", "SKILL.md"), "utf8"), "---\nname: pbi-main\ndescription: x\n---\nown\n");
  assert.match(readFileSync(join(root, "AGENTS.md"), "utf8"), /pbi-main/, "the repo's own trigger row is carried");
  // untouched
  assert.equal(readFileSync(join(agent, "04_TODO.md"), "utf8"), "# TODO\n- [ ] keep me\n", "the ledger keeps its content under its current name");
  // guard
  assert.deepEqual(readdirSync(join(root, "docs", "hooks")), ["guard.cjs"], "the old hooks folder left — only a forwarder stays");
  // A session opened before the move still calls the old path: the forwarder must run the new guard and block.
  const fwd = spawnSync(process.execPath, [join(root, "docs", "hooks", "guard.cjs")], { input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "git push origin main" } }), encoding: "utf8" });
  assert.equal(fwd.status, 2, "the forwarder blocks through the new guard");
  assert.equal(JSON.parse(fwd.stdout).hookSpecificOutput.permissionDecision, "deny");
  const settings = readFileSync(join(root, ".claude", "settings.json"), "utf8");
  assert.match(settings, /CLAUDE_PROJECT_DIR[^"]*\/docs\/agent\/01_LAW\/_Rule\/01_Harness\/Rule_Gate_59_ReadFirst\/guard\.cjs/);
  assert.doesNotMatch(settings, /docs\/hooks\/guard\.cjs/, "no command left pointing at the old guard");
  assert.match(readFileSync(join(gitHooksDir(root), "pre-commit"), "utf8"), /Rule_Gate_59_ReadFirst\/precommit-guard\.cjs/);
  // and the next sync finds nothing to do
  const again = applyKit(root, { apply: false });
  assert.deepEqual(again.steps.filter((s) => !["current", "own"].includes(s.verdict)).map((s) => s.part.folder), []);
});

test("links to a replaced file are repointed (an article link to its folder); the words and other files stay", (t) => {
  const root = fixture(t);
  put(root, "docs/plan/05_ui.md", "Xem [HP điều 1](../agent/01_CONSTITUTION.md) · [luật](../agent/02_RULES.md#git) · [cây](../agent/03_STRUCTURE.md) · nhắc 02_RULES.md trong câu.\n");
  migrateToKit(root, { kitRef: "03", apply: true });
  const t5 = readFileSync(join(root, "docs", "plan", "05_ui.md"), "utf8");
  assert.match(t5, new RegExp(`\\[HP điều 1\\]\\(\\.\\./agent/01_LAW/_Cons/Cons_Core_101_DieuMotBatBien/Cons_Core_101_DieuMotBatBien\\.md\\)`));
  assert.match(t5, /\[luật\]\(\.\.\/agent\/01_LAW\/_Rule\/\)/);
  assert.match(t5, /\[cây\]\(\.\.\/agent\/02_STRUCTURE\/INDEX\.md\)/);
  assert.match(t5, /nhắc 02_RULES\.md trong câu/, "plain words are the repo's and stay");
});

test("an Adapt repo and a folder harness are refused", (t) => {
  const a = tempDir(t, "zemory-mig-a-");
  put(a, "docs/.harness.json", JSON.stringify({ docs: "docs/agent", layout: "foreign", slots: { x: "y" } }));
  assert.match(migrateToKit(a, { kitRef: "03", apply: false }).error, /Adapt/);
  const f = fixture(t);
  migrateToKit(f, { kitRef: "03", apply: true });
  assert.match(migrateToKit(f, { kitRef: "03", apply: false }).error, /already a folder harness/);
});

test("sync on a first-generation folder repo: the purpose fills the purpose frame, each article takes its own number, links follow", (t) => {
  // Real-repo trial 2026-10-17 (SasinFlow · SasinInfra): `_Cons/PURPOSE.md` and `01-N_slug/RULE.md` stayed as they were, so the
  // purpose frame read as unwritten and the articles kept a shape no other repo has.
  const root = tempDir(t, "zemory-gen1-");
  execFileSync("git", ["init", "-q"], { cwd: root });
  applyKit(root, { kitRef: "04", apply: true });
  const cons = join(root, "docs", "agent", "01_LAW", "_Cons");
  writeFileSync(join(cons, "PURPOSE.md"), "# Repo — Mục đích\n\nApp giám sát hạ tầng.\n");
  mkdirSync(join(cons, "01-2_data-tu-chua"), { recursive: true });
  writeFileSync(join(cons, "01-2_data-tu-chua", "RULE.md"), "---\nid: 01-2\nname: data-tu-chua\nversion: 1\nkind: judgment\n---\n# 01-2 Data tự chứa trong repo\n\nMọi dữ liệu nằm trong repo.\n");
  writeFileSync(join(cons, "01-2_data-tu-chua", "gate.json"), JSON.stringify({ gate: "conform" }));
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  writeFileSync(join(root, "docs", "plan", "05_ui.md"), "Xem [điều 2](../agent/01_LAW/_Cons/01-2_data-tu-chua/RULE.md).\n");

  const r = normalizeOwnConstitution(root, true);
  assert.equal(r.purpose, true);
  assert.deepEqual(r.renamed.map((x) => x.from), ["01-2_data-tu-chua"]);
  const to = r.renamed[0].to;
  assert.match(to, /^Cons_Gate_102_/, "own article numbered 100+N, gated because its gate.json gates");
  const frame = readdirSync(join(cons, "01_Scope")).find((f) => f.startsWith("Cons_Gate_09_"));
  const consMd = readFileSync(join(cons, "01_Scope", frame, "Cons.md"), "utf8");
  assert.match(consMd, /^frame: Cons_Gate_09_Purpose$/m, "the header names the frame, not its chapter path");
  assert.match(consMd, /^status: written$/m);
  assert.match(consMd, /App giám sát hạ tầng/, "the purpose text moved over whole");
  assert.ok(!existsSync(join(cons, "PURPOSE.md")) && existsSync(join(root, "docs", "archive", "PURPOSE.md")), "old file archived, not lost");
  const art = readFileSync(join(cons, to, `${to}.md`), "utf8");
  assert.match(art, /^id: Cons_102$/m);
  assert.match(art, /^aka: 01-2$/m);
  assert.match(art, /Mọi dữ liệu nằm trong repo/, "the article's body is kept");
  assert.ok(existsSync(join(cons, to, "gate.json")), "every file of the folder moves with it");
  assert.match(readFileSync(join(root, "docs", "plan", "05_ui.md"), "utf8"), new RegExp(`_Cons/${to}/${to}\\.md`), "the link follows");
  const again = normalizeOwnConstitution(root, true);
  assert.equal(again.purpose, false);
  assert.deepEqual(again.renamed, [], "a second sync changes nothing");
});

test("the move keeps a hook of the repo's own that settings.json still calls; the tool's own hook files leave", (t) => {
  // A department's mail gate went silent this way (2026-10-18): the folder was archived, the host kept calling a gone path.
  const root = fixture(t);
  put(root, "docs/hooks/mail-gate.cjs", "process.exit(0);\n");
  const sp = join(root, ".claude", "settings.json");
  const s = JSON.parse(readFileSync(sp, "utf8"));
  s.hooks.PreToolUse.push({ matcher: "Bash", hooks: [{ type: "command", command: "node docs/hooks/mail-gate.cjs" }] });
  writeFileSync(sp, JSON.stringify(s, null, 2));
  const r = migrateToKit(root, { kitRef: "03", apply: true, date: "2026-10-18" });
  assert.ok(!("error" in r), JSON.stringify(r));
  assert.deepEqual(r.keptHooks, ["docs/hooks/mail-gate.cjs"]);
  assert.ok(existsSync(join(root, "docs", "hooks", "mail-gate.cjs")), "the called hook is still there");
  assert.ok(!existsSync(join(root, "docs", "hooks", "policy.json")), "the tool's own files left");
  assert.ok(existsSync(join(root, "docs", "archive", "file-harness-2026-10-18", "hooks", "mail-gate.cjs")), "and a copy is archived like the rest");
});
