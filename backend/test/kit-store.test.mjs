// plan/28 §0 — the parts store and the folder harness, end to end: a temp store with its own git history, a temp repo
// assembled from it, and every update verdict (absent · current · edited-but-store-unchanged · merged · conflict · clean
// replace · own folder · generated files ignored · CRLF). The guard part runs as a real process (stdin JSON, exit code
// and the JSON decision), the way the host calls it.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { applyKit } from "../../dist/docs/kit-apply.js";
import { frontMatter, hashFiles, parseFrom } from "../../dist/docs/store.js";
import { generateGuards } from "../../dist/docs/guard-gen.js";
import { coreForCompaction, folderCoreIssues, ruleCoverage } from "../../dist/docs/rule-core.js";
import { handleHook } from "../../dist/memory/capture-hook.js";
import { conform } from "../../dist/docs/conform.js";
import { tempDir } from "./helpers.mjs";

const git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", windowsHide: true });

function put(root, rel, text) {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
}

const HOOK = `"use strict";
const fs = require("node:fs");
const path = require("node:path");
function check(payload) {
  const ti = payload.tool_input || {};
  if (payload.tool_name !== "Write" || !String(ti.content || "").includes("FORBIDDEN")) return null;
  const body = fs.readFileSync(path.join(__dirname, "RULE.md"), "utf8").split("---").slice(2).join("---").trim();
  return "BLOCKED (guard layer 1): rule 02-2 - forbidden word\\n\\nThe rule:\\n" + body;
}
module.exports = { check };
`;

/** A store in its own git repo, one committed version of every part. */
function store(t) {
  const root = tempDir(t, "zemory-store-");
  git(root, "init", "-q");
  git(root, "config", "user.email", "t@t");
  git(root, "config", "user.name", "t");
  const s = join(root, "_Store");
  put(s, "02_RULES/02-1_alpha/RULE.md", "---\nid: 02-1\nname: alpha\nversion: 1\nkind: judgment\n---\n# alpha\n\n- line one\n- line two\n- line three\n");
  put(s, "02_RULES/02-2_beta/RULE.md", "---\nid: 02-2\nname: beta\nversion: 1\nkind: content\n---\n# beta\n\n- never write FORBIDDEN\n");
  put(s, "02_RULES/02-2_beta/gate.json", '{ "hook": "hook.cjs" }\n');
  put(s, "02_RULES/02-2_beta/hook.cjs", HOOK);
  put(s, "02_RULES/02-55_hook-guard/RULE.md", "---\nid: 02-55\nname: hook-guard\nversion: 1\nkind: action\ngenerated: [guard.cjs, policy.json, precommit-guard.cjs, 02-59_read-first.cjs]\n---\n# guard\n");
  put(s, "02_RULES/02-55_hook-guard/gate.json", '{ "gate": "guard" }\n');
  put(s, "03_STRUCTURE/03-1_entry/SLOT.md", "---\nid: 03-1\nname: entry\nversion: 1\npath: AGENTS.md\n---\n# entry\n");
  put(s, "03_STRUCTURE/03-1_entry/gate.json", JSON.stringify({ conform: { require: ["AGENTS.md", "CLAUDE.md"], contains: { "CLAUDE.md": "@AGENTS.md" } } }));
  put(s, "04_SKILLS/sk/SKILL.md", "---\nname: sk\nversion: 1\ndescription: x\n---\n# sk\n");
  put(s, "01_CONSTITUTION/01-1_secrets/RULE.md", "---\nid: 01-1\nname: secrets\nversion: 1\nkind: judgment\nsuggested: true\n---\n# secrets\n");
  put(s, "Own/X/AGENTS.md", "# <PROJECT>\n");
  put(s, "Own/X/CLAUDE.md", "@AGENTS.md\n");
  put(s, "Own/X/docs/agent/04_SKILLS.md", "# skills\n\n<!-- zemory:skills:start · machine block -->\n<!-- zemory:skills:end -->\n");
  put(s, "Own/X/docs/agent/05_TODO.md", "# todo\n");
  put(s, "kits.json", JSON.stringify({ "01": { name: "01_IDE_App_Memory", status: "built", host: "IDE", structure: "App", tier: "Memory",
    constitution: ["01-*"], rules: ["02-*"], slots: ["03-1"], skills: ["sk"], own: "X" }, "02": { name: "02_IDE_NonApp_Memory", status: "reserved" } }));
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "v1");
  return { root, s, commit: (m) => { git(root, "add", "-A"); git(root, "commit", "-q", "-m", m); } };
}

function repo(t) {
  const root = tempDir(t, "zemory-kitrepo-");
  git(root, "init", "-q");
  return root;
}

const verdicts = (r) => Object.fromEntries(r.steps.map((s) => [s.part.folder, s.verdict]));
const rule = (root, folder) => join(root, "docs", "agent", "02_RULES", folder, "RULE.md");

test("init assembles every part at its numbered place, stamped with from:, plus the kit's own files and marker", (t) => {
  const st = store(t);
  const root = repo(t);
  const r = applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  assert.ok(!("error" in r), JSON.stringify(r));
  assert.deepEqual(new Set(Object.values(verdicts(r))), new Set(["absent"]));
  assert.equal(JSON.parse(readFileSync(join(root, "docs", ".harness.json"), "utf8")).kit, "01_IDE_App_Memory");
  assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), `# ${root.split(/[\\/]/).pop()}\n`, "<PROJECT> becomes the folder name");
  for (const f of ["02-1_alpha", "02-2_beta", "02-55_hook-guard"]) {
    const from = parseFrom(String(frontMatter(readFileSync(rule(root, f), "utf8")).meta.from));
    assert.ok(from && from.version === 1 && from.folder === f, `${f} carries a from: line`);
  }
  assert.ok(existsSync(join(root, "docs", "agent", "02_RULES", "02-2_beta", "hook.cjs")), "the hook travels with its rule");
  assert.ok(existsSync(join(root, "docs", "agent", "03_STRUCTURE", "03-1_entry", "SLOT.md")));
  assert.ok(existsSync(join(root, ".claude", "skills", "sk", "SKILL.md")), "a skill lands where the host loads it");
  assert.match(readFileSync(join(root, "docs", "agent", "04_SKILLS.md"), "utf8"), /\| `sk\/` \| _Store\/04_SKILLS\/sk @v1 #[0-9a-f]{12} \|/);
  const again = applyKit(root, { apply: false, storeDir: st.s });
  assert.deepEqual(new Set(Object.values(verdicts(again))), new Set(["current"]), "a second pass finds nothing to do");
});

test("suggested constitution articles are offered once: a declined one never comes back, a kept one is never edited", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const art = join(root, "docs", "agent", "01_CONSTITUTION", "01-1_secrets", "RULE.md");
  assert.ok(existsSync(art), "init offers the article");
  // The store revises the article; the repo's kept copy stays as it is.
  const p = join(st.s, "01_CONSTITUTION", "01-1_secrets", "RULE.md");
  writeFileSync(p, readFileSync(p, "utf8").replace("version: 1", "version: 2").replace("# secrets", "# secrets, revised"));
  const kept = readFileSync(art, "utf8");
  const r = applyKit(root, { apply: true, storeDir: st.s });
  assert.ok(!r.steps.some((s) => s.part.shelf === "01_CONSTITUTION"), "sync does not touch the constitution");
  assert.equal(readFileSync(art, "utf8"), kept);
  // The repo declines it: sync never adds it back.
  rmSync(join(root, "docs", "agent", "01_CONSTITUTION", "01-1_secrets"), { recursive: true });
  applyKit(root, { apply: true, storeDir: st.s });
  assert.ok(!existsSync(art), "a declined article stays declined");
});

test("a reserved kit and an unknown kit are refused", (t) => {
  const st = store(t);
  assert.match(applyKit(repo(t), { kitRef: "02", apply: true, storeDir: st.s }).error, /reserved/);
  assert.match(applyKit(repo(t), { kitRef: "99", apply: true, storeDir: st.s }).error, /no kit/);
});

test("a local edit with the part unchanged stays current; a store change merges with it; the next pass is current", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  writeFileSync(rule(root, "02-1_alpha"), readFileSync(rule(root, "02-1_alpha"), "utf8") + "- local line\n");
  assert.equal(verdicts(applyKit(root, { apply: false, storeDir: st.s }))["02-1_alpha"], "current", "the repo's edit is its own business");

  const p = join(st.s, "02_RULES", "02-1_alpha", "RULE.md");
  writeFileSync(p, readFileSync(p, "utf8").replace("version: 1", "version: 2").replace("- line one", "- line one, revised"));
  const r = applyKit(root, { apply: true, storeDir: st.s });
  assert.equal(verdicts(r)["02-1_alpha"], "merged");
  const text = readFileSync(rule(root, "02-1_alpha"), "utf8");
  assert.match(text, /line one, revised/, "the store's change arrived");
  assert.match(text, /- local line/, "the repo's line survived");
  assert.match(text, /from: _Store\/02_RULES\/02-1_alpha @v2 #/);
  assert.equal(verdicts(applyKit(root, { apply: false, storeDir: st.s }))["02-1_alpha"], "current", "no false conflict after a merge");
});

test("the same line changed on both sides is a conflict and nothing is written", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const local = readFileSync(rule(root, "02-1_alpha"), "utf8").replace("- line two", "- line two, ours");
  writeFileSync(rule(root, "02-1_alpha"), local);
  const p = join(st.s, "02_RULES", "02-1_alpha", "RULE.md");
  writeFileSync(p, readFileSync(p, "utf8").replace("version: 1", "version: 2").replace("- line two", "- line two, theirs"));
  const r = applyKit(root, { apply: true, storeDir: st.s });
  const step = r.steps.find((s) => s.part.folder === "02-1_alpha");
  assert.equal(step.verdict, "conflict");
  assert.doesNotMatch(step.reason, /history/, "the conflict comes from the merge itself, not from a base that could not be found");
  assert.equal(readFileSync(rule(root, "02-1_alpha"), "utf8"), local, "a conflicting copy is left exactly as it was");
});

test("an untouched copy is replaced by the newer part; a file the part dropped is removed", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const d = join(st.s, "02_RULES", "02-2_beta");
  writeFileSync(join(d, "RULE.md"), readFileSync(join(d, "RULE.md"), "utf8").replace("version: 1", "version: 2").replace("FORBIDDEN", "FORBIDDEN or BANNED"));
  writeFileSync(join(d, "gate.json"), '{ "hook": "hook.cjs", "match": { "tool": ["Write"] } }\n');
  const r = applyKit(root, { apply: true, storeDir: st.s });
  assert.equal(verdicts(r)["02-2_beta"], "clean");
  assert.match(readFileSync(rule(root, "02-2_beta"), "utf8"), /FORBIDDEN or BANNED/);
  assert.match(readFileSync(join(root, "docs", "agent", "02_RULES", "02-2_beta", "gate.json"), "utf8"), /match/);
});

test("a folder without from: is the repo's own and is never touched", (t) => {
  const st = store(t);
  const root = repo(t);
  put(root, "docs/agent/02_RULES/02-1_alpha/RULE.md", "---\nid: 02-1\n---\nmine\n");
  const r = applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  assert.equal(verdicts(r)["02-1_alpha"], "own");
  assert.equal(readFileSync(rule(root, "02-1_alpha"), "utf8"), "---\nid: 02-1\n---\nmine\n");
});

test("generated files in a part folder never count as a local edit, and CRLF does not change a hash", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  put(root, "docs/agent/02_RULES/02-55_hook-guard/guard.cjs", "// generated\n");
  put(root, "docs/agent/02_RULES/02-55_hook-guard/policy.json", "{}\n");
  const crlf = readFileSync(rule(root, "02-1_alpha"), "utf8").replace(/\n/g, "\r\n");
  writeFileSync(rule(root, "02-1_alpha"), crlf);
  const v = verdicts(applyKit(root, { apply: false, storeDir: st.s }));
  assert.equal(v["02-55_hook-guard"], "current");
  assert.equal(v["02-1_alpha"], "current");
  assert.equal(hashFiles(new Map([["a", "x\r\ny\r\n"]]), "a"), hashFiles(new Map([["a", "x\ny\n"]]), "a"));
});

test("the guard of a folder harness lives in 02-55, calls every rule hook, and blocks with JSON + exit 2 quoting RULE.md", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const g = generateGuards(root);
  assert.match(g.hooksDir.replace(/\\/g, "/"), /docs\/agent\/02_RULES\/02-55_hook-guard$/);
  const policy = JSON.parse(readFileSync(join(g.hooksDir, "policy.json"), "utf8"));
  assert.deepEqual(policy.rule_dirs, ["docs/agent/02_RULES/02-2_beta"]);
  assert.deepEqual(policy.rule_hooks, [], "no embedded hooks beside the guard in a folder harness");
  assert.equal(policy.flags_dir, "docs/.harness-state");
  assert.ok(existsSync(join(root, "docs", ".harness-state", ".gitignore")), "runtime state stays out of git");
  assert.ok(!existsSync(join(root, "docs", "hooks")), "no docs/hooks folder");
  const fire = (tool, input) =>
    spawnSync(process.execPath, [join(g.hooksDir, "guard.cjs")], { input: JSON.stringify({ tool_name: tool, tool_input: input }), encoding: "utf8" });
  const bad = fire("Write", { file_path: join(root, "a.txt"), content: "FORBIDDEN" });
  assert.equal(bad.status, 2);
  assert.equal(JSON.parse(bad.stdout).hookSpecificOutput.permissionDecision, "deny");
  assert.match(bad.stderr, /rule 02-2[\s\S]*never write FORBIDDEN/, "the block quotes the rule text from its folder");
  assert.equal(fire("Write", { file_path: join(root, "a.txt"), content: "fine" }).status, 0);
  const push = fire("Bash", { command: "git push origin main" });
  assert.equal(push.status, 2);
  assert.match(push.stderr, /docs\/\.harness-state\/\.allow-push/, "the flag lives in the state folder");
  // Re-assembling after the guard was generated: the 02-55 copy is still current (generated files are not edits).
  assert.equal(verdicts(applyKit(root, { apply: false, storeDir: st.s }))["02-55_hook-guard"], "current");
});

test("the core of a folder harness = PURPOSE + judgment rules; coverage counts gates from gate.json; holes are named", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  put(root, "docs/agent/01_CONSTITUTION/PURPOSE.md", "# purpose of this repo\n");
  generateGuards(root);
  const agent = join(root, "docs", "agent");
  const core = coreForCompaction(agent);
  assert.match(core, /purpose of this repo/);
  assert.match(core, /line one/, "the judgment rule is in the core");
  assert.doesNotMatch(core, /never write FORBIDDEN/, "a gated rule is not");
  const cov = ruleCoverage(root, agent);
  assert.equal(cov.judgement, 2, "02-1 alpha and the suggested article 01-1 are judgment");
  assert.deepEqual(cov.missing, [], JSON.stringify(cov.missing));
  assert.ok(cov.hooked >= 1, "02-2's hook counts as a working gate");
  assert.deepEqual(folderCoreIssues(root, agent), { noCore: false, unmarked: [], gatedInCore: [], badGate: [], overCap: 0 });

  // Holes: a content rule with no gate · a hook named in gate.json that is not there · a judgment rule with a gate.
  put(root, "docs/agent/02_RULES/02-3_gamma/RULE.md", "---\nid: 02-3\nname: gamma\nversion: 1\nkind: action\n---\nx\n");
  put(root, "docs/agent/02_RULES/02-4_delta/RULE.md", "---\nid: 02-4\nname: delta\nversion: 1\nkind: content\n---\nx\n");
  put(root, "docs/agent/02_RULES/02-4_delta/gate.json", '{ "hook": "hook.cjs" }\n');
  put(root, "docs/agent/02_RULES/02-1_alpha/gate.json", '{ "gate": "guard" }\n');
  const i = folderCoreIssues(root, agent);
  assert.deepEqual(i.unmarked, ["02-3"]);
  assert.deepEqual(i.badGate, ["02-4 (hook.cjs missing)"]);
  assert.deepEqual(i.gatedInCore, ["02-1"]);
});

test("conform runs every slot's own check: a broken entry is a blocking slot-gate finding naming the slot", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const find = () => conform(root).items.find((i) => i.check === "slot-gate");
  assert.equal(find(), undefined, "a freshly assembled repo holds its slots");
  writeFileSync(join(root, "CLAUDE.md"), "hello\n");
  const f = find();
  assert.ok(f && f.level === "blocking", "a broken slot is blocking");
  assert.match(f.samples.join("\n"), /03-1 entry: CLAUDE\.md does not contain @AGENTS\.md/);
});

test("session start hands the folder core over at once; a file-harness repo stays silent outside compaction", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const out = handleHook("session-start", { cwd: root, source: "startup", session_id: "s1" });
  assert.match(JSON.parse(out).hookSpecificOutput.additionalContext, /line one/);
  const old = tempDir(t, "zemory-filerepo-");
  put(old, "docs/.harness.json", JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));
  put(old, "docs/agent/02_RULES.md", "# rules\n");
  assert.equal(handleHook("session-start", { cwd: old, source: "startup", session_id: "s2" }), "");
});
