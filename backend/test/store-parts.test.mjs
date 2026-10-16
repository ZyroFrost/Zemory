// plan/28 §0f · §0n — the real parts store holds: every gate's own examples behave as declared, no part carries private
// detail, every part has a well-formed header, a changed part bumped its version, and every built kit lists parts that
// exist. Negative cases run on a temp store so a checker that never fires cannot pass.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { RULE_HOOKS } from "../../dist/docs/rule-hooks-src.js";
import { SQL_GATE_SOURCE } from "../../dist/docs/sql-gate-src.js";
import { SLOT_ROLES } from "../../dist/docs/structure-tree.js";
import { dirname, join } from "node:path";
import test from "node:test";
import { gateExampleFindings, storePrivacyFindings } from "../../dist/docs/gate-examples.js";
import { storePointerFindings } from "../../dist/docs/pointer-check.js";
import { kitParts, listParts, structureSlots, partNameFindings, readKits, SHELVES, STORE_DIR, unbumpedParts } from "../../dist/docs/store.js";
import { tempDir } from "./helpers.mjs";

function put(root, rel, text) {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
}

test("every gate example in the store behaves as declared, and every hook or slot gate has examples", () => {
  assert.deepEqual(gateExampleFindings(STORE_DIR), []);
});

test("the store carries no private detail (plan/28 §0f)", () => {
  assert.deepEqual(storePrivacyFindings(STORE_DIR), []);
});

test("every part has a dictionary name and a header id equal to its key; an aka is well-formed; rules declare their kind", () => {
  const { legacy } = partNameFindings(STORE_DIR);
  assert.deepEqual(legacy.filter((x) => !x.startsWith("04_SKILLS/")), [], "every rule, article and slot carries a dictionary name");
  for (const shelf of SHELVES) {
    for (const p of listParts(STORE_DIR, shelf)) {
      assert.ok(p.version >= 1, `${p.folder}: version`);
      if (shelf === "04_SKILLS") continue;
      assert.equal(p.id, p.key, `${shelf}/${p.folder}: the header id is the key`);
      // aka is optional: a part born after the renumbering has no legacy id; when one is given it is well-formed.
      if (p.meta.aka !== undefined) assert.match(String(p.meta.aka), /^0[123]-\d+$/, `${shelf}/${p.folder}: aka is a legacy id`);
      if (shelf !== "03_STRUCTURE") assert.ok(["action", "content", "judgment"].includes(p.kind), `${p.folder}: kind`);
    }
  }
});

test("a part whose content changed since HEAD bumped its version", () => {
  assert.deepEqual(unbumpedParts(STORE_DIR), []);
});

test("every built kit names parts that exist", () => {
  for (const k of readKits(STORE_DIR).filter((k) => k.status === "built")) {
    const parts = kitParts(k, STORE_DIR);
    const got = new Set(parts.map((p) => (p.shelf === "04_SKILLS" ? p.folder : p.id)));
    for (const id of [...k.constitution, ...k.rules, ...k.skills].filter((x) => !x.includes("*"))) {
      assert.ok(got.has(id), `${k.name}: ${id} is not in the store`);
    }
    // the kit's one structure is in the store, and every slot it lists resolves to a slot of the inner layer
    const struc = parts.find((p) => p.folder === k.structure);
    assert.ok(struc, `${k.name}: structure ${k.structure} is not in the store`);
    const r = structureSlots(struc, listParts(STORE_DIR, "03_STRUCTURE"));
    assert.deepEqual(r.missing, [], `${k.name}: ${k.structure} names slots that do not exist`);
    assert.ok(r.slots.length > 0 && parts.filter((p) => p.folder.startsWith("_Struc_Slot/")).length === r.slots.length);
  }
});

test("every store hook.cjs is a byte copy of the generator source (one source while both layouts live)", () => {
  const sources = [...RULE_HOOKS.map((h) => [h.file.replace(/\.cjs$/, ""), h.source]), ["02-25_sql-one-way", SQL_GATE_SOURCE]];
  const rules = listParts(STORE_DIR, "01_RULES");
  for (const [folder, source] of sources) {
    // The generator still names hooks by the legacy id (`02-24_eol-keep`); the store part is found by its key.
    const part = rules.find((r) => r.key === `Rule_${Number(folder.split("_")[0].split("-")[1])}`);
    assert.ok(part, `${folder}: no store part with that key`);
    const p = join(part.dir, "hook.cjs");
    assert.ok(existsSync(p), `${folder}: no hook.cjs in the store`);
    assert.equal(readFileSync(p, "utf8").replace(/\r\n/g, "\n"), source.replace(/\r\n/g, "\n"), `${folder}: store copy drifted from the generator`);
  }
});

test("every slot name of the machine dictionary has a slot part in the store (HP 13: the two cannot drift)", () => {
  const ZEMORY_ONLY = new Set(["memory", "adapters", "channel"]); // zemory's own domain slots, not part of the shared standard
  const inStore = new Set(listParts(STORE_DIR, "03_STRUCTURE").filter((p) => p.meta.kind !== "guide").map((p) => p.name));
  const missing = Object.keys(SLOT_ROLES).filter((n) => !ZEMORY_ONLY.has(n) && !inStore.has(n));
  assert.deepEqual(missing, [], "add a slot part for these, or drop them from SLOT_ROLES");
});

test("every renamed part name tells the truth: code, enforcement group, slot area and number (plan/28 §0o)", () => {
  const { wrong } = partNameFindings(STORE_DIR);
  assert.deepEqual(wrong, [], wrong.join("\n"));
});

test("negative: a name that lies about its enforcement, area, number or shelf is reported; a legacy name is listed apart", (t) => {
  const s = tempDir(t, "zemory-store-names-");
  put(s, "01_RULES/Rule_Keys_09_X/RULE.md", "---\nid: Rule_9\nname: x\nversion: 1\n---\nx\n"); // no prompt gate: really Core
  put(s, "01_RULES/Rule_Gate_07_Y/RULE.md", "---\nid: Rule_7\nname: y\nversion: 1\n---\ny\n");
  put(s, "01_RULES/Rule_Gate_07_Y/gate.json", JSON.stringify({ hook: "hook.cjs" }));
  put(s, "01_RULES/Rule_Core_06_Z/RULE.md", "---\nid: Rule_5\nname: z\nversion: 1\n---\nz\n"); // number disagrees with id
  put(s, "03_STRUCTURE/Slot_Frontend_012_Cmd/SLOT.md", "---\nid: Slot_12\nname: cmd\nversion: 1\npath: backend/src/commands/\n---\nc\n");
  put(s, "03_STRUCTURE/Rule_Core_04_W/SLOT.md", "---\nid: Rule_4\nname: w\nversion: 1\npath: x/\n---\nw\n");
  put(s, "01_RULES/02-3_old/RULE.md", "---\nid: 02-3\nname: old\nversion: 1\n---\no\n");
  put(s, "Archive/01_RULES/Rule_Core_09_Retired/RULE.md", "---\nid: Rule_9\nname: r\nversion: 2\nretired: 2026-10-15 · x\n---\nr\n");
  const { wrong, legacy } = partNameFindings(s);
  assert.ok(wrong.some((x) => /Archive\/01_RULES\/Rule_Core_09_Retired: key Rule_9 is already taken/.test(x)), "a retired number is never handed out again");
  const says = (re) => assert.ok(wrong.some((x) => re.test(x)), `${re}\n${wrong.join("\n")}`);
  says(/Rule_Keys_09_X: named Keys but its gate\.json makes it Core/);
  says(/Rule_Core_06_Z: the name says Rule_6 but the header id says Rule_5/);
  says(/Slot_Frontend_012_Cmd: area Frontend but path backend\/src\/commands\/ is in Backend/);
  says(/Rule_Core_04_W: code Rule does not belong on 03_STRUCTURE/);
  assert.ok(!wrong.some((x) => /Rule_Gate_07_Y/.test(x)), "a truthful name passes");
  assert.deepEqual(legacy, ["01_RULES/02-3_old"]);
});

test("every pointer in the store lands: parts, repo paths on a slot, current harness paths, no section of the old rules file", () => {
  const f = storePointerFindings(STORE_DIR);
  assert.deepEqual(f.map((x) => `${x.where} ${x.pointer} ${x.note ?? ""}`), []);
});

test("negative: every kind of dead pointer is caught, and a pointer that lands is not", (t) => {
  const s = tempDir(t, "zemory-store-ptr-");
  put(s, "03_STRUCTURE/Slot_Data_002_Secrets/SLOT.md", "---\nid: Slot_2\nname: secrets\nversion: 1\npath: data/secrets/\n---\ns\n");
  put(s, "03_STRUCTURE/Slot_Docs_003_Agent/SLOT.md", "---\nid: Slot_3\nname: agent\nversion: 1\npath: docs/agent/\n---\na\n");
  put(s, "04_SKILLS/sk/SKILL.md", "---\nname: sk\nversion: 1\n---\nk\n");
  put(s, "01_RULES/Rule_Core_05_Live/RULE.md", "---\nid: Rule_5\nname: live\nversion: 1\n---\nl\n");
  put(s, "Archive/01_RULES/Rule_Core_06_Gone/RULE.md", "---\nid: Rule_6\nname: gone\nversion: 1\nretired: 2026-10-15 · x\nreplaced-by: Rule_Core_05_Live\n---\ng\n");
  put(s, "01_RULES/Rule_Core_01_Pointing/RULE.md", [
    "---", "id: Rule_1", "name: p", "version: 1", "---",
    "- good: Rule_Core_05_Live · `data/secrets/` · `docs/agent/01_RULES/` · `.claude/skills/sk/SKILL.md` · `misc/` (a word)",
    "- missing part Rule_Core_09_Nothing", "- legacy id 02-5", "- retired part Rule_6",
    "- old shelf `docs/agent/02_RULES/x/`", "- gone folder `docs/hooks/guard.cjs`", "- missing skill `.claude/skills/nope/SKILL.md`",
    "- off the structure `data/elsewhere/`", "- old section §Lõi", "",
  ].join("\n"));
  const f = storePointerFindings(s);
  const kinds = f.map((x) => `${x.kind} ${x.pointer}`);
  for (const want of ["part Rule_Core_09_Nothing", "legacy-id 02-5", "retired Rule_6", "harness-path docs/agent/02_RULES/x/",
    "harness-path docs/hooks/guard.cjs", "skill .claude/skills/nope/SKILL.md", "path data/elsewhere/", "old-section §Lõi"]) {
    assert.ok(kinds.includes(want), `must be caught: ${want}\n${kinds.join("\n")}`);
  }
  assert.equal(f.filter((x) => x.where.endsWith(":6")).length, 0, `the line of good pointers raises nothing:\n${kinds.join("\n")}`);
  assert.match(f.find((x) => x.kind === "retired").note, /replaced by Rule_Core_05_Live/);
});

test("negative: a wrong example, a gate with no examples and a private line are all reported", (t) => {
  const s = tempDir(t, "zemory-store-neg-");
  put(s, "01_RULES/02-9_x/RULE.md", "---\nid: 02-9\nname: x\nversion: 1\nkind: content\n---\nx\n");
  put(s, "01_RULES/02-9_x/hook.cjs", 'module.exports = { check: (p) => (String(p.tool_input.content).includes("BAD") ? "no" : null) };\n');
  put(s, "01_RULES/02-9_x/gate.json", JSON.stringify({ hook: "hook.cjs",
    block: [{ tool_name: "Write", tool_input: { file_path: "a", content: "fine" } }],
    pass: [{ tool_name: "Write", tool_input: { file_path: "a", content: "BAD" } }] }));
  put(s, "03_STRUCTURE/03-9_y/SLOT.md", "---\nid: 03-9\nname: y\nversion: 1\n---\ny\n");
  put(s, "03_STRUCTURE/03-9_y/gate.json", JSON.stringify({ conform: { require: ["A.md"] } }));
  put(s, "01_RULES/02-8_z/RULE.md", "---\nid: 02-8\nname: z\nversion: 1\nkind: judgment\n---\nasked the user, decided 2026-10-14\n");
  const f = gateExampleFindings(s);
  assert.ok(f.some((x) => /02-9 x: block example 1 went through/.test(x)), f.join("\n"));
  assert.ok(f.some((x) => /02-9 x: pass example 1 was blocked/.test(x)), f.join("\n"));
  assert.ok(f.some((x) => /03-9 y: needs at least one block and one pass example/.test(x)), f.join("\n"));
  put(s, "01_RULES/02-8_z/notes.md", "role `user` in a transcript\nmail ops@company.vn\nsample a@b.example\n");
  const priv = storePrivacyFindings(s);
  assert.ok(priv.some((x) => /02-8_z\/RULE\.md:7 — names the person/.test(x)), priv.join("\n"));
  assert.ok(!priv.some((x) => /notes\.md:1 /.test(x)), "a backticked `user` is data, not a person");
  assert.ok(priv.some((x) => /notes\.md:2 — an e-mail address/.test(x)), "a real address is caught");
  assert.ok(!priv.some((x) => /notes\.md:3 /.test(x)), "an RFC 2606 example address is not a contact");
});

test("the two structure layers hold in the store: no slot flat, none with applies, seeds under the slot's path, no dangling slot name", (t) => {
  const s = tempDir(t, "zemory-layers-");
  const put = (rel, text) => { mkdirSync(dirname(join(s, rel)), { recursive: true }); writeFileSync(join(s, rel), text); };
  const slot = (rel, id, path, extra = "") => put(`03_STRUCTURE/${rel}/SLOT.md`, `---\nid: ${id}\nname: x\nversion: 1\npath: ${path}\n${extra}---\n# x\n`);
  slot("_Struc_Slot/Slot_Root_001_Entry", "Slot_1", "AGENTS.md · CLAUDE.md");
  put("03_STRUCTURE/_Struc_Slot/Slot_Root_001_Entry/seed/AGENTS.md", "# <PROJECT>\n");
  put("03_STRUCTURE/_Struc_Slot/Slot_Root_001_Entry/seed/docs/stray.md", "x\n");
  slot("_Struc_Slot/Slot_Docs_002_Docs", "Slot_2", "docs/", "applies: [App]\n");
  slot("Slot_Docs_003_Plan", "Slot_3", "docs/plan/");
  put("03_STRUCTURE/Struc_Repo_App/STRUCTURE.md", "---\nid: Struc_Repo_App\nname: repo-app\nversion: 1\n---\n# app\n");
  put("03_STRUCTURE/Struc_Repo_App/structure.json", JSON.stringify({ slots: ["Slot_Root_001_Entry", "Slot_Docs_009_Gone"] }));
  const wrong = partNameFindings(s).wrong.join("\n");
  assert.match(wrong, /Slot_Docs_003_Plan: a slot lives in 03_STRUCTURE\/_Struc_Slot\//);
  assert.match(wrong, /Slot_Docs_002_Docs: a slot belongs to no structure/);
  assert.match(wrong, /seed\/docs\/stray\.md is not under the slot's path/);
  assert.doesNotMatch(wrong, /seed\/AGENTS\.md/, "a seed at the slot's own path passes");
  assert.match(wrong, /Struc_Repo_App: structure\.json names Slot_Docs_009_Gone/);
});

test("every built kit assembles from the real store into a repo that holds: conform clean on the harness, nothing left to do", async (t) => {
  const { applyKit } = await import("../../dist/docs/kit-apply.js");
  const { conform } = await import("../../dist/docs/conform.js");
  for (const k of readKits(STORE_DIR).filter((k) => k.status === "built")) {
    const root = tempDir(t, `zemory-kit${k.no}-`);
    const r = applyKit(root, { kitRef: k.no, apply: true });
    assert.ok(!("error" in r), `${k.name}: ${r.error}`);
    const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
    assert.doesNotMatch(agents, /<(STRUC_[A-Z_]+|SKILL_TRIGGERS|PROJECT|ZEMORY_RAW|ZEMORY_REPO)>/, `${k.name}: a placeholder is left in AGENTS.md`);
    const skills = kitParts(k, STORE_DIR).filter((p) => p.shelf === "04_SKILLS");
    for (const s of skills) {
      const host = String(s.meta.name);
      assert.equal(agents.split(`\`.claude/skills/${host}/SKILL.md\``).length - 1, 1, `${k.name}: AGENTS.md has one trigger row for ${host}`);
    }
    const blocking = conform(root).items.filter((i) => i.level === "blocking" && ["harness-missing", "slot-gate", "slot-layer", "structure-slot", "part-name-vi"].includes(i.check));
    assert.deepEqual(blocking.map((i) => `${i.check}: ${i.samples.join(" · ")}`), [], `${k.name}: the assembled repo holds`);
    const again = applyKit(root, { apply: false });
    assert.deepEqual(again.steps.filter((s) => s.verdict !== "current").map((s) => `${s.part.folder} ${s.verdict}`), [], `${k.name}: a second pass finds nothing to do`);
  }
});

test("every set name reads its assembly in shelf order and tells the truth about its structure and tier", async () => {
  const { parseSetName } = await import("../../dist/docs/harness-names.js");
  for (const k of readKits(STORE_DIR)) {
    const n = parseSetName(k.name);
    assert.ok(n, `${k.name}: not <NN>_<rules>_<structure>_<skills>_<tier>`);
    assert.equal(n.nn, k.no, `${k.name}: the name's number is its register number`);
    assert.equal(n.tier, k.tier, `${k.name}: the name's tier is its tier`);
    assert.equal(n.structure ? `Struc_Repo_${n.structure}` : "", k.structure, `${k.name}: the name's structure is the one it picks`);
  }
});

test("a repo marked with an old kit name finds the set that replaced it; an old bare number finds nothing", async () => {
  const { findKit } = await import("../../dist/docs/store.js");
  const want = { "06_IDE_App_Memory": "02", "02_GUI_App_Memory": "02", "05_app": "02", "08_IDE_NonApp_Memory": "04",
    "04_GUI_NonApp_Memory": "04", "03_nonapp": "04", "02_cowork_memory": "04", "01_cowork_basic": "03" };
  for (const [old, no] of Object.entries(want)) assert.equal(findKit(old, STORE_DIR)?.no, no, old);
  for (const gone of ["06", "08", "05_IDE_App_Basic"]) assert.equal(findKit(gone, STORE_DIR), null, gone);
});
