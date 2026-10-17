// plan/28 §0 — the parts store and the folder harness, end to end: a temp store with its own git history, a temp repo
// assembled from it, and every update verdict (absent · current · edited-but-store-unchanged · merged · conflict · clean
// replace · own folder · generated files ignored · CRLF). The guard part runs as a real process (stdin JSON, exit code
// and the JSON decision), the way the host calls it.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { applyKit, assembleSet } from "../../dist/docs/kit-apply.js";
import { repointLinks } from "../../dist/docs/kit-migrate.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
import { frontMatter, hashFiles, parseFrom, readKits } from "../../dist/docs/store.js";
import { generateGuards } from "../../dist/docs/guard-gen.js";
import { coreForCompaction, folderCoreIssues, ruleCoverage } from "../../dist/docs/rule-core.js";
import { handleHook, ruleReminders } from "../../dist/memory/capture-hook.js";
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
  const own = path.join(__dirname, path.basename(__dirname) + ".md");
  const body = fs.readFileSync(fs.existsSync(own) ? own : path.join(__dirname, "RULE.md"), "utf8").split("---").slice(2).join("---").trim();
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
  put(s, "01_LAW/_Rule/02-1_alpha/RULE.md", "---\nid: 02-1\nname: alpha\nversion: 1\nkind: judgment\n---\n# alpha\n\n- line one\n- line two\n- line three\n");
  put(s, "01_LAW/_Rule/02-2_beta/RULE.md", "---\nid: 02-2\nname: beta\nversion: 1\nkind: content\n---\n# beta\n\n- never write FORBIDDEN\n");
  put(s, "01_LAW/_Rule/02-2_beta/gate.json", '{ "hook": "hook.cjs" }\n');
  put(s, "01_LAW/_Rule/02-2_beta/hook.cjs", HOOK);
  put(s, "01_LAW/_Rule/02-55_hook-guard/RULE.md", "---\nid: 02-55\nname: hook-guard\nversion: 1\nkind: action\ngenerated: [guard.cjs, policy.json, precommit-guard.cjs, 02-59_read-first.cjs]\n---\n# guard\n");
  put(s, "01_LAW/_Rule/02-55_hook-guard/gate.json", '{ "gate": "guard" }\n');
  // the two layers: slots in _Slot/ (each seeds the starter files of its own paths), structures that list them
  put(s, "02_STRUCTURE/_Slot/03-1_entry/SLOT.md", "---\nid: 03-1\nname: entry\nversion: 1\npath: AGENTS.md · CLAUDE.md\n---\n# entry\n");
  put(s, "02_STRUCTURE/_Slot/03-1_entry/gate.json", JSON.stringify({ conform: { require: ["AGENTS.md", "CLAUDE.md"], contains: { "CLAUDE.md": "@AGENTS.md" } } }));
  put(s, "02_STRUCTURE/_Slot/03-1_entry/seed/AGENTS.md", "# <PROJECT>\n");
  put(s, "02_STRUCTURE/_Slot/03-1_entry/seed/CLAUDE.md", "@AGENTS.md\n");
  put(s, "02_STRUCTURE/_Slot/03-2_agent/SLOT.md", "---\nid: 03-2\nname: agent\nversion: 1\npath: docs/agent/\n---\n# agent\n");
  put(s, "02_STRUCTURE/_Slot/03-2_agent/seed/docs/agent/03_SKILLS/INDEX.md", "# skills\n\n<!-- zemory:skills:start · machine block -->\n<!-- zemory:skills:end -->\n");
  put(s, "02_STRUCTURE/_Slot/03-2_agent/seed/docs/agent/04_TODO.md", "# todo\n");
  for (const c of ["App", "NonApp"]) {
    put(s, `02_STRUCTURE/Struc_Repo_${c}/STRUCTURE.md`, `---\nid: Struc_Repo_${c}\nname: repo-${c.toLowerCase()}\nversion: 1\nprofile: ${c === "App" ? "app" : "non-app"}\n---\n# ${c}\n`);
    put(s, `02_STRUCTURE/Struc_Repo_${c}/structure.json`, JSON.stringify({ slots: ["03-1_entry", "03-2_agent"] }));
  }
  put(s, "03_SKILLS/sk/SKILL.md", "---\nname: sk\nversion: 1\ndescription: x\n---\n# sk\n");
  put(s, "03_SKILLS/sk/gate.json", JSON.stringify({ read: [{ when: "path_prefix", prefix: "frontend" }],
    prompt: { kind: "sk-door", re: "mở cửa sk", text: "[zemory] SK REMINDER" },
    block: [{ path: "frontend/a.js" }], pass: [{ path: "backend/a.ts" }] }));
  // a constitution frame (plan/28 §0q): the common rule, and the Cons.md template the repo rewrites for itself
  put(s, "01_LAW/_Cons/01-1_secrets/RULE.md", "---\nid: 01-1\nname: secrets\nversion: 1\nkind: judgment\nframe: true\n---\n# secrets\n");
  put(s, "01_LAW/_Cons/01-1_secrets/Cons.md", "---\nframe: 01-1_secrets\nstatus: template\n---\n# Secrets\n\n<where the secrets live>\n");
  // the host a set carries: the structure shelf's second inner layer
  put(s, "02_STRUCTURE/_Host/IDE/IDE.md", "---\nid: Host_IDE\nname: host-ide\nversion: 1\nkind: host\n---\n# IDE\n");
  // the sets: each one a folder beside the store, assembled from it (plan/28 §0p — no register)
  for (const k of [
    { no: "01", name: "01_IDE_App_Memory", structure: "Struc_Repo_App", tier: "Memory", constitution: ["01-*"], rules: ["02-*"], skills: ["sk"] },
    { no: "03", name: "03_IDE_NonApp_Memory", structure: "Struc_Repo_NonApp", tier: "Memory", constitution: [], rules: ["02-*"], skills: [] },
  ]) assembleSet({ legacy: [], status: "built", host: "IDE", requires: [], tools: [], ...k }, s);
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
// a repo copy carries its header file under the folder's own name (plan/28 §0p); the store fixture keeps the old name
const rule = (root, folder) => join(root, "docs", "agent", "01_LAW", "_Rule", folder, `${folder}.md`);

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
  assert.ok(existsSync(join(root, "docs", "agent", "01_LAW", "_Rule", "02-2_beta", "hook.cjs")), "the hook travels with its rule");
  assert.ok(existsSync(join(root, "docs", "agent", "02_STRUCTURE", "_Slot", "03-1_entry", "03-1_entry.md")), "a slot lands in the inner layer");
  assert.ok(existsSync(join(root, "docs", "agent", "02_STRUCTURE", "Struc_Repo_App", "structure.json")), "the kit's structure lands beside it");
  assert.ok(!existsSync(join(root, "docs", "agent", "02_STRUCTURE", "_Slot", "03-1_entry", "seed")), "seeds are written at their paths, not copied with the slot");
  // a skill: its source in the harness, its host build inside the source, and the build plugged where the host loads it
  assert.ok(existsSync(join(root, "docs", "agent", "03_SKILLS", "sk", "sk.md")), "the skill's source lands in the harness");
  assert.ok(existsSync(join(root, "docs", "agent", "03_SKILLS", "sk", "Claude", "sk", "SKILL.md")), "the host build sits inside the source");
  assert.ok(existsSync(join(root, ".claude", "skills", "sk", "SKILL.md")), "the host build is plugged where the host loads it");
  assert.ok(!existsSync(join(root, ".claude", "skills", "sk", "gate.json")), "gates stay with the source; the host build carries none");
  assert.match(readFileSync(join(root, "docs", "agent", "03_SKILLS", "INDEX.md"), "utf8"),
    /\| `sk\/` \| `\.claude\/skills\/sk\/` \| _Store\/03_SKILLS\/sk @v1 #[0-9a-f]{12} \|/);
  const again = applyKit(root, { apply: false, storeDir: st.s });
  assert.deepEqual(new Set(Object.values(verdicts(again))), new Set(["current"]), "a second pass finds nothing to do");
});

test("a constitution frame follows the store; the Cons.md the repo wrote is never touched; an own article is never touched", (t) => {
  // plan/28 §0q: the store carries no written article — a frame is a common rule plus a template the repo rewrites.
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const dir = join(root, "docs", "agent", "01_LAW", "_Cons", "01-1_secrets");
  assert.ok(existsSync(join(dir, "01-1_secrets.md")), "init brings the frame");
  assert.match(readFileSync(join(dir, "Cons.md"), "utf8"), /status: template/, "and its Cons.md template, once");
  assert.deepEqual(conform(root).items.find((i) => i.check === "cons-unwritten")?.samples, ["01-1_secrets: status is \"template\" — not written yet"]);
  // The repo writes its constitution; the store then revises the frame.
  const mine = "---\nframe: 01-1_secrets\nstatus: written\n---\n# Secrets\n\nOnly in the vault folder.\n";
  writeFileSync(join(dir, "Cons.md"), mine);
  assert.equal(conform(root).items.find((i) => i.check === "cons-unwritten"), undefined, "a written Cons.md holds");
  const p = join(st.s, "01_LAW", "_Cons", "01-1_secrets", "RULE.md");
  writeFileSync(p, readFileSync(p, "utf8").replace("version: 1", "version: 2").replace("# secrets", "# secrets, revised"));
  writeFileSync(join(st.s, "01_LAW", "_Cons", "01-1_secrets", "Cons.md"), "---\nframe: 01-1_secrets\nstatus: template\n---\n# a new template\n");
  const r = applyKit(root, { apply: true, storeDir: st.s });
  assert.equal(verdicts(r)["01-1_secrets"], "clean", "the frame's rule text follows the store");
  assert.match(readFileSync(join(dir, "01-1_secrets.md"), "utf8"), /secrets, revised/);
  assert.equal(readFileSync(join(dir, "Cons.md"), "utf8"), mine, "the repo's constitution is untouched — the template change does not reach it");
  // An own article with the frame's number, left by an older layout, is not mistaken for the frame's copy.
  put(root, "docs/agent/01_LAW/_Cons/Cons_Core_01_Mine/Cons_Core_01_Mine.md", "---\nid: Cons_1\nname: mine\nversion: 1\nkind: judgment\n---\n# mine\n");
  rmSync(dir, { recursive: true });
  const again = applyKit(root, { apply: true, storeDir: st.s });
  assert.equal(verdicts(again)["01-1_secrets"], "absent", "the frame is assembled beside the repo's own article");
  assert.equal(readFileSync(join(root, "docs/agent/01_LAW/_Cons/Cons_Core_01_Mine/Cons_Core_01_Mine.md"), "utf8").includes("# mine"), true);
});

test("a number with no set folder is refused", (t) => {
  const st = store(t);
  assert.match(applyKit(repo(t), { kitRef: "02", apply: true, storeDir: st.s }).error, /no set/);
  assert.match(applyKit(repo(t), { kitRef: "99", apply: true, storeDir: st.s }).error, /no set/);
});

test("a set is its folder: what the folder carries is what the set assembles", (t) => {
  const st = store(t);
  const kits = readKits(st.s);
  assert.deepEqual(kits.map((k) => k.name), ["01_IDE_App_Memory", "03_IDE_NonApp_Memory"]);
  const k1 = kits[0];
  assert.equal(k1.structure, "Struc_Repo_App");
  assert.deepEqual(k1.skills, ["sk"]);
  assert.ok(k1.rules.length === 3 && k1.constitution.length === 1, JSON.stringify(k1));
  // a part taken out of the set folder leaves the set
  rmSync(join(st.root, "01_IDE_App_Memory", "docs", "agent", "01_LAW", "_Rule", "02-1_alpha"), { recursive: true, force: true });
  assert.ok(!readKits(st.s)[0].rules.includes("02-1"), "the removed rule is no longer in the set");
  // a set folder keeps the placeholders: it is a template, not a repo
  assert.match(readFileSync(join(st.root, "03_IDE_NonApp_Memory", "AGENTS.md"), "utf8"), /<PROJECT>/);
});

test("a local edit with the part unchanged stays current; a store change merges with it; the next pass is current", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  writeFileSync(rule(root, "02-1_alpha"), readFileSync(rule(root, "02-1_alpha"), "utf8") + "- local line\n");
  assert.equal(verdicts(applyKit(root, { apply: false, storeDir: st.s }))["02-1_alpha"], "current", "the repo's edit is its own business");

  const p = join(st.s, "01_LAW", "_Rule", "02-1_alpha", "RULE.md");
  writeFileSync(p, readFileSync(p, "utf8").replace("version: 1", "version: 2").replace("- line one", "- line one, revised"));
  const r = applyKit(root, { apply: true, storeDir: st.s });
  assert.equal(verdicts(r)["02-1_alpha"], "merged");
  const text = readFileSync(rule(root, "02-1_alpha"), "utf8");
  assert.match(text, /line one, revised/, "the store's change arrived");
  assert.match(text, /- local line/, "the repo's line survived");
  assert.match(text, /from: _Store\/01_LAW\/_Rule\/02-1_alpha @v2 #/);
  assert.equal(verdicts(applyKit(root, { apply: false, storeDir: st.s }))["02-1_alpha"], "current", "no false conflict after a merge");
});

test("the same line changed on both sides is a conflict and nothing is written", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const local = readFileSync(rule(root, "02-1_alpha"), "utf8").replace("- line two", "- line two, ours");
  writeFileSync(rule(root, "02-1_alpha"), local);
  const p = join(st.s, "01_LAW", "_Rule", "02-1_alpha", "RULE.md");
  writeFileSync(p, readFileSync(p, "utf8").replace("version: 1", "version: 2").replace("- line two", "- line two, theirs"));
  const r = applyKit(root, { apply: true, storeDir: st.s });
  const step = r.steps.find((s) => s.part.folder === "02-1_alpha");
  assert.equal(step.verdict, "conflict");
  assert.doesNotMatch(step.reason, /history/, "the conflict comes from the merge itself, not from a base that could not be found");
  assert.equal(readFileSync(rule(root, "02-1_alpha"), "utf8"), local, "a conflicting copy is left exactly as it was");
});

test("a part renamed in the store (same id) is found by key: the copy moves to the new folder, a local edit still merges", (t) => {
  // plan/28 §0o: identity is the number, not the folder. Promoting a rule from Core to Keys renames its folder; before the
  // key lookup, sync saw an absent part at the new name and left the old copy behind — two copies of one rule.
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  writeFileSync(rule(root, "02-1_alpha"), readFileSync(rule(root, "02-1_alpha"), "utf8") + "- local line\n");
  git(st.root, "mv", "_Store/01_LAW/_Rule/02-1_alpha", "_Store/01_LAW/_Rule/Rule_Keys_01_Alpha");
  const p = join(st.s, "01_LAW", "_Rule", "Rule_Keys_01_Alpha", "RULE.md");
  writeFileSync(p, readFileSync(p, "utf8").replace("version: 1", "version: 2").replace("- line one", "- line one, revised"));
  st.commit("rename alpha");
  const plan = applyKit(root, { apply: false, storeDir: st.s });
  const step = plan.steps.find((s) => s.part.key === "Rule_1");
  assert.equal(step.verdict, "merged", `the base must be found across the rename: ${step.reason ?? ""}`);
  assert.match(step.renameFrom ?? "", /02-1_alpha$/);
  applyKit(root, { apply: true, storeDir: st.s });
  assert.ok(!existsSync(join(root, "docs", "agent", "01_LAW", "_Rule", "02-1_alpha")), "the old folder is gone — one copy per rule");
  const text = readFileSync(rule(root, "Rule_Keys_01_Alpha"), "utf8");
  assert.match(text, /line one, revised/, "the store's change arrived");
  assert.match(text, /- local line/, "the repo's edit survived the move");
  assert.match(text, /from: _Store\/01_LAW\/_Rule\/Rule_Keys_01_Alpha @v2 #/);
  assert.equal(verdicts(applyKit(root, { apply: false, storeDir: st.s }))["Rule_Keys_01_Alpha"], "current");
});

test("a renamed part with nothing to bring still moves, keeping the repo's content", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  git(st.root, "mv", "_Store/01_LAW/_Rule/02-2_beta", "_Store/01_LAW/_Rule/Rule_Gate_02_Beta");
  st.commit("rename beta");
  const r = applyKit(root, { apply: true, storeDir: st.s });
  const step = r.steps.find((s) => s.part.key === "Rule_2");
  assert.ok(step.renameFrom, "the copy is moved");
  assert.ok(existsSync(join(root, "docs", "agent", "01_LAW", "_Rule", "Rule_Gate_02_Beta", "hook.cjs")), "every file moved with the folder");
  assert.ok(!existsSync(join(root, "docs", "agent", "01_LAW", "_Rule", "02-2_beta")));
  assert.match(readFileSync(rule(root, "Rule_Gate_02_Beta"), "utf8"), /from: _Store\/01_LAW\/_Rule\/Rule_Gate_02_Beta @v1 #/, "the stamp names the new folder");
});

test("a repo on the legacy shelf folders is moved to the current ones before assembly: no shelf split, links follow", (t) => {
  // The 9 repos moved to the folder harness first got `02_RULES/` and `01_CONSTITUTION/`. plan/28 §0o renumbers the
  // shelves (common rules above the constitution); a sync must rename the folders first, or the parts it writes would sit
  // in `01_LAW/_Rule/` beside an old `02_RULES/` still holding the repo's own rules.
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const agent = join(root, "docs", "agent");
  renameSync(join(agent, "01_LAW", "_Rule"), join(agent, "02_RULES"));
  renameSync(join(agent, "01_LAW", "_Cons"), join(agent, "01_CONSTITUTION"));
  put(agent, "02_RULES/Rule_Core_90_OwnRule/RULE.md", "---\nid: Rule_90\nname: own-rule\nversion: 1\nkind: judgment\n---\n# own\n");
  put(root, "docs/plan/01_x.md", "See [rule](../agent/02_RULES/Rule_Core_90_OwnRule/RULE.md) and [purpose](../agent/01_CONSTITUTION/PURPOSE.md).\n");
  const r = applyKit(root, { apply: true, storeDir: st.s });
  assert.deepEqual(r.renamedShelves, ["02_RULES → 01_LAW/_Rule", "01_CONSTITUTION → 01_LAW/_Cons"]);
  assert.ok(!existsSync(join(agent, "02_RULES")) && !existsSync(join(agent, "01_CONSTITUTION")), "no legacy shelf left behind");
  assert.ok(existsSync(join(agent, "01_LAW", "_Rule", "Rule_Core_90_OwnRule", "RULE.md")), "the repo's own rule moved with its shelf");
  assert.ok(existsSync(join(agent, "01_LAW", "_Rule", "Rule_Gate_02_Beta", "hook.cjs")) || existsSync(join(agent, "01_LAW", "_Rule", "02-2_beta", "hook.cjs")),
    "the store's parts are in the same shelf folder");
  assert.deepEqual(new Set(Object.values(verdicts(r))), new Set(["current"]), "nothing else changed");
  assert.deepEqual(repointLinks(root, true), ["docs/plan/01_x.md"]);
  assert.equal(readFileSync(join(root, "docs/plan/01_x.md"), "utf8"),
    "See [rule](../agent/01_LAW/_Rule/Rule_Core_90_OwnRule/RULE.md) and [purpose](../agent/01_LAW/_Cons/PURPOSE.md).\n");
});

test("an untouched copy is replaced by the newer part; a file the part dropped is removed", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const d = join(st.s, "01_LAW", "_Rule", "02-2_beta");
  writeFileSync(join(d, "RULE.md"), readFileSync(join(d, "RULE.md"), "utf8").replace("version: 1", "version: 2").replace("FORBIDDEN", "FORBIDDEN or BANNED"));
  writeFileSync(join(d, "gate.json"), '{ "hook": "hook.cjs", "match": { "tool": ["Write"] } }\n');
  const r = applyKit(root, { apply: true, storeDir: st.s });
  assert.equal(verdicts(r)["02-2_beta"], "clean");
  assert.match(readFileSync(rule(root, "02-2_beta"), "utf8"), /FORBIDDEN or BANNED/);
  assert.match(readFileSync(join(root, "docs", "agent", "01_LAW", "_Rule", "02-2_beta", "gate.json"), "utf8"), /match/);
});

test("a folder without from: is the repo's own and is never touched", (t) => {
  const st = store(t);
  const root = repo(t);
  put(root, "docs/agent/01_LAW/_Rule/02-1_alpha/RULE.md", "---\nid: 02-1\n---\nmine\n");
  const r = applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  assert.equal(verdicts(r)["02-1_alpha"], "own");
  assert.equal(readFileSync(join(root, "docs", "agent", "01_LAW", "_Rule", "02-1_alpha", "RULE.md"), "utf8"), "---\nid: 02-1\n---\nmine\n");
  assert.ok(!existsSync(rule(root, "02-1_alpha")), "nothing was written beside the repo's own file");
});

test("generated files in a part folder never count as a local edit, and CRLF does not change a hash", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  put(root, "docs/agent/01_LAW/_Rule/02-55_hook-guard/guard.cjs", "// generated\n");
  put(root, "docs/agent/01_LAW/_Rule/02-55_hook-guard/policy.json", "{}\n");
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
  assert.match(g.hooksDir.replace(/\\/g, "/"), /docs\/agent\/01_LAW\/_Rule\/02-55_hook-guard$/);
  const policy = JSON.parse(readFileSync(join(g.hooksDir, "policy.json"), "utf8"));
  assert.deepEqual(policy.rule_dirs, ["docs/agent/01_LAW/_Rule/02-2_beta"]);
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
  put(root, "docs/agent/01_LAW/_Cons/PURPOSE.md", "# purpose of this repo\n");
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
  put(root, "docs/agent/01_LAW/_Rule/02-3_gamma/RULE.md", "---\nid: 02-3\nname: gamma\nversion: 1\nkind: action\n---\nx\n");
  put(root, "docs/agent/01_LAW/_Rule/02-4_delta/RULE.md", "---\nid: 02-4\nname: delta\nversion: 1\nkind: content\n---\nx\n");
  put(root, "docs/agent/01_LAW/_Rule/02-4_delta/gate.json", '{ "hook": "hook.cjs" }\n');
  put(root, "docs/agent/01_LAW/_Rule/02-1_alpha/gate.json", '{ "gate": "guard" }\n');
  const i = folderCoreIssues(root, agent);
  assert.deepEqual(i.unmarked, ["02-3"]);
  assert.deepEqual(i.badGate, ["02-4 (hook.cjs missing)"]);
  assert.deepEqual(i.gatedInCore, ["02-1"]);
});

test("a skill's gate travels with the skill: its read door and its prompt reminder exist only where the skill does", (t) => {
  const st = store(t);
  const withSk = repo(t);
  applyKit(withSk, { kitRef: "01", apply: true, storeDir: st.s });
  const pol = JSON.parse(readFileSync(join(generateGuards(withSk).hooksDir, "policy.json"), "utf8"));
  assert.ok(pol.read_first.triggers.some((x) => x.when === "path_prefix" && x.prefix === "frontend" && x.read === ".claude/skills/sk/SKILL.md"),
    "the door comes from the skill's gate.json");
  // A reminder fires once per session and remembers that in the real memory folder: every run needs fresh session ids.
  const sid = (k) => `kit-store-${k}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  assert.match(ruleReminders({ session_id: sid("a"), cwd: withSk, prompt: "mở cửa sk giúp" }), /SK REMINDER/);
  assert.doesNotMatch(ruleReminders({ session_id: sid("b"), cwd: withSk, prompt: "chốt phiên" }), /Closing the session/,
    "a folder harness has no built-in reminders — only those its skills and rules declare");
  const without = repo(t);
  applyKit(without, { kitRef: "03", apply: true, storeDir: st.s });
  const pol2 = JSON.parse(readFileSync(join(generateGuards(without).hooksDir, "policy.json"), "utf8"));
  assert.ok(!pol2.read_first.triggers.some((x) => x.when === "path_prefix"), "no skill, no door");
  assert.equal(ruleReminders({ session_id: sid("c"), cwd: without, prompt: "mở cửa sk giúp" }), "");
});

test("a skill door accepts any copy of the skill: the source, the host build, or the host loading it by name", (t) => {
  // plan/28 §0o: a skill lives in three places (source · build inside it · host folder) and the host may load it itself.
  // The latch counted only `.claude/skills/<name>/SKILL.md`, so reading the source still blocked.
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const hooks = generateGuards(root).hooksDir;
  const policy = JSON.parse(readFileSync(join(hooks, "policy.json"), "utf8"));
  policy.read_first = { ...policy.read_first, required: [], sections: [], triggers: policy.read_first.triggers.filter((x) => x.when === "path_prefix") };
  const latch = join(hooks, "02-59_read-first.cjs");
  const { readFirst } = require(latch);
  const src = join(root, "docs", "agent", "03_SKILLS", "sk", "sk.md");
  const text = readFileSync(src, "utf8");
  const tx = (lines) => { const p = join(root, `t-${Math.random().toString(36).slice(2)}.jsonl`); writeFileSync(p, lines.map((l) => JSON.stringify(l)).join("\n") + "\n"); return p; };
  const write = (transcript_path) => readFirst({ tool_name: "Write", tool_input: { file_path: join(root, "frontend", "a.js"), content: "x" }, transcript_path }, root, policy);
  assert.match(write(tx([{ type: "user" }])) ?? "", /NOT READ IN FULL[\s\S]*\.claude\/skills\/sk\/SKILL\.md/, "nothing read: blocked, naming the copies");
  assert.equal(write(tx([{ toolUseResult: { type: "text", file: { filePath: src, content: text } } }])), null, "the source read in full is enough");
  assert.equal(write(tx([{ type: "assistant", message: { content: [{ type: "tool_use", name: "Skill", input: { skill: "sk" } }] } }])), null,
    "the host loading the skill by name is enough");
});

test("a skill assembled into the host folder before the two layers moves to its source; the repo's edit is kept", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  // what an earlier zemory left: the assembled copy in the host folder, edited there, and no source in the harness
  const agentSk = join(root, "docs", "agent", "03_SKILLS", "sk");
  const host = join(root, ".claude", "skills", "sk");
  rmSync(agentSk, { recursive: true });
  writeFileSync(join(host, "SKILL.md"), readFileSync(join(host, "SKILL.md"), "utf8") + "\nREPO EDIT\n");
  writeFileSync(join(host, "gate.json"), readFileSync(join(st.s, "03_SKILLS", "sk", "gate.json"), "utf8"));
  const r = applyKit(root, { apply: true, storeDir: st.s });
  const step = r.steps.find((s) => s.part.folder === "sk");
  assert.match(step.renameFrom ?? "", /\.claude[\\/]skills[\\/]sk$/, "the host copy is the one found");
  assert.match(readFileSync(join(agentSk, "sk.md"), "utf8"), /REPO EDIT/, "the edit moved with it into the source");
  assert.match(readFileSync(join(host, "SKILL.md"), "utf8"), /REPO EDIT/, "and the host build is written from that source");
  assert.ok(!existsSync(join(host, "gate.json")), "the host build carries no gates");
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

test("a repo assembled before the two layers: sync moves its flat slots into _Slot/ and ends where a fresh repo does", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const shelf = join(root, "docs", "agent", "02_STRUCTURE");
  // the old layout: slots flat on the shelf, no structure folder
  for (const s of ["03-1_entry", "03-2_agent"]) renameSync(join(shelf, "_Slot", s), join(shelf, s));
  rmSync(join(shelf, "_Slot"), { recursive: true });
  rmSync(join(shelf, "Struc_Repo_App"), { recursive: true });
  const r = applyKit(root, { apply: true, storeDir: st.s });
  assert.ok(r.renamedShelves.some((x) => /2 slot\(s\) → 02_STRUCTURE\/_Slot\//.test(x)), JSON.stringify(r.renamedShelves));
  assert.ok(!r.steps.some((s) => s.verdict === "conflict" || s.verdict === "own"), "nothing conflicts, nothing is mistaken for the repo's own");
  assert.ok(!existsSync(join(shelf, "03-1_entry")) && existsSync(join(shelf, "_Slot", "03-1_entry", "03-1_entry.md")));
  assert.ok(existsSync(join(shelf, "Struc_Repo_App", "Struc_Repo_App.md")), "the structure is assembled");
  const again = applyKit(root, { apply: false, storeDir: st.s });
  assert.deepEqual(new Set(Object.values(verdicts(again))), new Set(["current"]), "and a second pass finds nothing to do");
  assert.equal(conform(root).items.find((i) => i.check === "slot-layer"), undefined);
});

test("conform: a slot outside the inner layer and a structure naming a missing slot are blocking", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const shelf = join(root, "docs", "agent", "02_STRUCTURE");
  const items = () => conform(root).items;
  assert.equal(items().find((i) => i.check === "structure-slot"), undefined, "a fresh repo's structure resolves");
  put(shelf, "Slot_Root_099_Stray/SLOT.md", "---\nid: Slot_99\nname: stray\nversion: 1\npath: stray/\n---\n# stray\n");
  writeFileSync(join(shelf, "Struc_Repo_App", "structure.json"), JSON.stringify({ slots: ["03-1_entry", "Slot_Root_098_Gone"] }));
  const flat = items().find((i) => i.check === "slot-layer");
  assert.ok(flat && flat.level === "blocking" && /Slot_Root_099_Stray/.test(flat.samples.join(" ")));
  const dangling = items().find((i) => i.check === "structure-slot");
  assert.ok(dangling && dangling.level === "blocking" && /Slot_Root_098_Gone/.test(dangling.samples.join(" ")));
});

test("a copy whose header file has the old name (RULE.md) is renamed to the folder's name, content and hash kept", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const own = rule(root, "02-1_alpha");
  const old = join(dirname(own), "RULE.md");
  const text = readFileSync(own, "utf8");
  renameSync(own, old); // a repo assembled before plan/28 §0p
  const r = applyKit(root, { apply: true, storeDir: st.s });
  const step = r.steps.find((s) => s.part.folder === "02-1_alpha");
  assert.equal(step.verdict, "clean", "the old name is not mistaken for a local edit");
  assert.match(step.reason ?? "", /renamed/);
  assert.ok(existsSync(own) && !existsSync(old), "the header file now carries the folder's name, the old one is gone");
  assert.equal(readFileSync(own, "utf8"), text, "the content, from: line included, is unchanged");
  const again = applyKit(root, { apply: false, storeDir: st.s });
  assert.equal(again.steps.find((s) => s.part.folder === "02-1_alpha").verdict, "current");
});

test("a repo whose slots sit in the layer's older name (_Struc_Slot) is moved to _Slot and ends where a fresh repo does", (t) => {
  const st = store(t);
  const root = repo(t);
  applyKit(root, { kitRef: "01", apply: true, storeDir: st.s });
  const shelf = join(root, "docs", "agent", "02_STRUCTURE");
  renameSync(join(shelf, "_Slot"), join(shelf, "_Struc_Slot")); // a repo assembled before plan/28 §0p
  const r = applyKit(root, { apply: true, storeDir: st.s });
  assert.ok(r.renamedShelves.some((x) => /_Struc_Slot → 02_STRUCTURE\/_Slot/.test(x)), JSON.stringify(r.renamedShelves));
  assert.ok(!r.steps.some((s) => s.verdict === "conflict" || s.verdict === "own"), "nothing conflicts, nothing is mistaken for the repo's own");
  assert.ok(!existsSync(join(shelf, "_Struc_Slot")) && existsSync(join(shelf, "_Slot", "03-1_entry", "03-1_entry.md")));
  const again = applyKit(root, { apply: false, storeDir: st.s });
  assert.deepEqual(again.steps.filter((s) => s.verdict !== "current").map((s) => `${s.part.folder} ${s.verdict}`), []);
});
