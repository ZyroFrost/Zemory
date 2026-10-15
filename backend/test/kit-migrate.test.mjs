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
import { migrateToKit, slugOf } from "../../dist/docs/kit-migrate.js";
import { applyKit } from "../../dist/docs/kit-apply.js";
import { generateGuards, gitHooksDir } from "../../dist/docs/guard-gen.js";
import { tempDir } from "./helpers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NONAPP = join(ROOT, "docs_template", "03_nonapp");
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
  const r = migrateToKit(root, { kitRef: "08", apply: false });
  assert.ok(!("error" in r), JSON.stringify(r));
  assert.deepEqual(r.localRules, ["02-7"], "only the rule the repo edited counts as edited");
  assert.deepEqual(r.ownRules, ["02-99"]);
  assert.deepEqual(r.articles, ["01-1", "01-2"]);
  assert.ok(r.replacedSkills.includes("grill") && r.keptSkills.includes("audit"));
  assert.equal(r.carriedTriggers, 1);
  assert.ok(existsSync(join(root, "docs", "agent", "02_RULES.md")) && !existsSync(join(root, "docs", "agent", "02_RULES")), "nothing written");
});

test("apply: everything lands, nothing is lost, the repo's own work is untouched, the guard follows", (t) => {
  const root = fixture(t);
  const before = (rel) => readFileSync(join(root, rel), "utf8");
  const oldRules = before("docs/agent/02_RULES.md");
  const oldStruct = before("docs/agent/03_STRUCTURE.md");
  const r = migrateToKit(root, { kitRef: "08", apply: true, date: "2026-10-15" });
  assert.ok(!("error" in r), JSON.stringify(r));
  const agent = join(root, "docs", "agent");
  const arch = join(agent, "archive", "file-harness-2026-10-15");
  for (const f of ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md", "AGENTS.md", "hooks"]) assert.ok(existsSync(join(arch, f)), `archived ${f}`);
  assert.equal(readFileSync(join(arch, "02_RULES.md"), "utf8"), oldRules, "the archive is byte for byte");
  // constitution
  const a1 = join(agent, "01_CONSTITUTION", `01-1_${slugOf("Điều một bất biến.")}`, "RULE.md");
  assert.match(readFileSync(a1, "utf8"), /nội dung một/);
  const purpose = readFileSync(join(agent, "01_CONSTITUTION", "PURPOSE.md"), "utf8");
  assert.match(purpose, /Phục vụ bài toán A/);
  assert.match(purpose, /chỉ khi có phê duyệt/, "every non-article section is kept");
  assert.ok(!existsSync(join(agent, "01_CONSTITUTION.md")));
  // rules
  const r7 = readdirSync(join(agent, "02_RULES")).find((d) => d.startsWith("02-7_"));
  const t7 = readFileSync(join(agent, "02_RULES", r7, "RULE.md"), "utf8");
  assert.match(t7, /^from: _Store/m);
  assert.match(t7, /Bản của repo trước khi chuyển[\s\S]*REPO-ONLY-EDIT/, "the repo's wording is kept for a hand merge");
  const r99 = readdirSync(join(agent, "02_RULES")).find((d) => d.startsWith("02-99_"));
  assert.match(readFileSync(join(agent, "02_RULES", r99, "RULE.md"), "utf8"), /chỉ repo này có/);
  assert.doesNotMatch(readFileSync(join(agent, "02_RULES", r99, "RULE.md"), "utf8"), /^from:/m, "a repo-only rule is the repo's own");
  assert.deepEqual(JSON.parse(readFileSync(join(agent, "02_RULES", r99, "gate.json"), "utf8")), { gate: "guard" });
  // structure + skills + entry
  assert.equal(readFileSync(join(agent, "03_STRUCTURE", "INDEX.md"), "utf8"), oldStruct);
  assert.match(readFileSync(join(root, ".claude", "skills", "grill", "SKILL.md"), "utf8"), /^from: _Store\/04_SKILLS\/grill/m, "an untouched shared skill takes the store copy");
  assert.match(readFileSync(join(root, ".claude", "skills", "audit", "SKILL.md"), "utf8"), /REPO EDIT/, "an edited shared skill is kept");
  assert.equal(readFileSync(join(root, ".claude", "skills", "pbi-main", "SKILL.md"), "utf8"), "---\nname: pbi-main\ndescription: x\n---\nown\n");
  assert.match(readFileSync(join(root, "AGENTS.md"), "utf8"), /pbi-main/, "the repo's own trigger row is carried");
  // untouched
  assert.equal(readFileSync(join(agent, "05_TODO.md"), "utf8"), "# TODO\n- [ ] keep me\n");
  // guard
  assert.deepEqual(readdirSync(join(root, "docs", "hooks")), ["guard.cjs"], "the old hooks folder left — only a forwarder stays");
  // A session opened before the move still calls the old path: the forwarder must run the new guard and block.
  const fwd = spawnSync(process.execPath, [join(root, "docs", "hooks", "guard.cjs")], { input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "git push origin main" } }), encoding: "utf8" });
  assert.equal(fwd.status, 2, "the forwarder blocks through the new guard");
  assert.equal(JSON.parse(fwd.stdout).hookSpecificOutput.permissionDecision, "deny");
  const settings = readFileSync(join(root, ".claude", "settings.json"), "utf8");
  assert.match(settings, /node docs\/agent\/02_RULES\/02-55_hook-guard\/guard\.cjs/);
  assert.doesNotMatch(settings, /docs\/hooks\/guard\.cjs/, "no command left pointing at the old guard");
  assert.match(readFileSync(join(gitHooksDir(root), "pre-commit"), "utf8"), /02-55_hook-guard\/precommit-guard\.cjs/);
  // and the next sync finds nothing to do
  const again = applyKit(root, { apply: false });
  assert.deepEqual(again.steps.filter((s) => !["current", "own"].includes(s.verdict)).map((s) => s.part.folder), []);
});

test("an Adapt repo and a folder harness are refused", (t) => {
  const a = tempDir(t, "zemory-mig-a-");
  put(a, "docs/.harness.json", JSON.stringify({ docs: "docs/agent", layout: "foreign", slots: { x: "y" } }));
  assert.match(migrateToKit(a, { kitRef: "08", apply: false }).error, /Adapt/);
  const f = fixture(t);
  migrateToKit(f, { kitRef: "08", apply: true });
  assert.match(migrateToKit(f, { kitRef: "08", apply: false }).error, /already a folder harness/);
});
