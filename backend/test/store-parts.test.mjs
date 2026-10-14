// plan/28 §0f · §0n — the real parts store holds: every gate's own examples behave as declared, no part carries private
// detail, every part has a well-formed header, a changed part bumped its version, and every built kit lists parts that
// exist. Negative cases run on a temp store so a checker that never fires cannot pass.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { RULE_HOOKS } from "../../dist/docs/rule-hooks-src.js";
import { SQL_GATE_SOURCE } from "../../dist/docs/sql-gate-src.js";
import { dirname, join } from "node:path";
import test from "node:test";
import { gateExampleFindings, storePrivacyFindings } from "../../dist/docs/gate-examples.js";
import { kitParts, listParts, readKits, SHELVES, STORE_DIR, unbumpedParts } from "../../dist/docs/store.js";
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

test("every part has a header matching its folder; rules declare their kind", () => {
  for (const shelf of SHELVES) {
    for (const p of listParts(STORE_DIR, shelf)) {
      assert.ok(p.version >= 1, `${p.folder}: version`);
      if (shelf === "04_SKILLS") continue;
      assert.ok(p.folder.startsWith(`${p.id}_`), `${shelf}/${p.folder}: id ${p.id} matches the folder`);
      assert.ok(p.id.startsWith(shelf.slice(0, 2) + "-"), `${shelf}/${p.folder}: number belongs to its shelf`);
      if (shelf !== "03_STRUCTURE") assert.ok(["action", "content", "judgment"].includes(p.kind), `${p.folder}: kind`);
    }
  }
});

test("a part whose content changed since HEAD bumped its version", () => {
  assert.deepEqual(unbumpedParts(STORE_DIR), []);
});

test("every built kit names parts that exist", () => {
  for (const k of readKits(STORE_DIR).filter((k) => k.status === "built")) {
    const got = new Set(kitParts(k, STORE_DIR).map((p) => (p.shelf === "04_SKILLS" ? p.folder : p.id)));
    for (const id of [...k.constitution, ...k.rules, ...k.slots, ...k.skills].filter((x) => !x.includes("*"))) {
      assert.ok(got.has(id), `${k.name}: ${id} is not in the store`);
    }
  }
});

test("every store hook.cjs is a byte copy of the generator source (one source while both layouts live)", () => {
  const sources = [...RULE_HOOKS.map((h) => [h.file.replace(/\.cjs$/, ""), h.source]), ["02-25_sql-one-way", SQL_GATE_SOURCE]];
  for (const [folder, source] of sources) {
    const p = join(STORE_DIR, "02_RULES", folder, "hook.cjs");
    assert.ok(existsSync(p), `${folder}: no hook.cjs in the store`);
    assert.equal(readFileSync(p, "utf8").replace(/\r\n/g, "\n"), source.replace(/\r\n/g, "\n"), `${folder}: store copy drifted from the generator`);
  }
});

test("negative: a wrong example, a gate with no examples and a private line are all reported", (t) => {
  const s = tempDir(t, "zemory-store-neg-");
  put(s, "02_RULES/02-9_x/RULE.md", "---\nid: 02-9\nname: x\nversion: 1\nkind: content\n---\nx\n");
  put(s, "02_RULES/02-9_x/hook.cjs", 'module.exports = { check: (p) => (String(p.tool_input.content).includes("BAD") ? "no" : null) };\n');
  put(s, "02_RULES/02-9_x/gate.json", JSON.stringify({ hook: "hook.cjs",
    block: [{ tool_name: "Write", tool_input: { file_path: "a", content: "fine" } }],
    pass: [{ tool_name: "Write", tool_input: { file_path: "a", content: "BAD" } }] }));
  put(s, "03_STRUCTURE/03-9_y/SLOT.md", "---\nid: 03-9\nname: y\nversion: 1\n---\ny\n");
  put(s, "03_STRUCTURE/03-9_y/gate.json", JSON.stringify({ conform: { require: ["A.md"] } }));
  put(s, "02_RULES/02-8_z/RULE.md", "---\nid: 02-8\nname: z\nversion: 1\nkind: judgment\n---\nasked the user, decided 2026-10-14\n");
  const f = gateExampleFindings(s);
  assert.ok(f.some((x) => /02-9 x: block example 1 went through/.test(x)), f.join("\n"));
  assert.ok(f.some((x) => /02-9 x: pass example 1 was blocked/.test(x)), f.join("\n"));
  assert.ok(f.some((x) => /03-9 y: needs at least one block and one pass example/.test(x)), f.join("\n"));
  const priv = storePrivacyFindings(s);
  assert.ok(priv.some((x) => /02-8_z\/RULE\.md:7 — names the person/.test(x)), priv.join("\n"));
});
