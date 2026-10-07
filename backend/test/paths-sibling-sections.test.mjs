// `paths check` in Markdown: a section heading that names a SIBLING repo makes the paths listed under it relative to
// that repo. Measured 2026-10-07: `_DB_DataWarehouse` docs/plan/24 held 269 "dead" paths under `### Dept_BIZ — 74 file`,
// 268 of them real files in Dept_BIZ — the measure was wrong, not the repo. The second half is the NEGATIVE side: the
// rule must never swallow a path that is really gone, nor treat a heading as a repo when it is not one.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { markdownSiblingSections, pathsCheck } from "../../dist/docs/paths.js";
import { tempDir } from "./helpers.mjs";

function repo(t) {
  const parent = tempDir(t, "zemory-psib-");
  const root = join(parent, "RepoA");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));
  for (const f of ["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS", "05_TODO", "06_CHANGES"]) writeFileSync(join(root, "docs", "agent", `${f}.md`), `# ${f}\n`);
  // a real sibling REPO (has docs/) holding a real file
  mkdirSync(join(parent, "Dept_B", "docs"), { recursive: true });
  mkdirSync(join(parent, "Dept_B", "reports", "R1"), { recursive: true });
  writeFileSync(join(parent, "Dept_B", "reports", "R1", "a.tmdl"), "x\n");
  // a sibling FOLDER that is not a repo, holding the same relative file
  mkdirSync(join(parent, "Notes", "reports", "R1"), { recursive: true });
  writeFileSync(join(parent, "Notes", "reports", "R1", "a.tmdl"), "x\n");
  return { root, parent };
}
const ctxOf = (root) => ({ projectRoot: root, docsDir: join(root, "docs", "agent"), config: { docs: "docs/agent", adapters: {}, thresholds: {} }, log() {} });
const dead = (root) => pathsCheck(ctxOf(root)).dead.map((h) => h.text);

test("a path listed under a heading that names a sibling repo resolves in THAT repo", (t) => {
  const { root } = repo(t);
  writeFileSync(join(root, "docs", "plan", "01_x.md"), "# Plan\n\n### Dept_B — 1 file\n\n- `reports/R1/a.tmdl` — changed\n");
  assert.deepEqual(dead(root), []);
});

test("NEGATIVE: under the sibling's heading, a file that is really gone is still DEAD", (t) => {
  const { root } = repo(t);
  writeFileSync(join(root, "docs", "plan", "01_x.md"), "### Dept_B\n\n- `reports/R1/gone.tmdl`\n");
  assert.deepEqual(dead(root), ["reports/R1/gone.tmdl"]);
});

test("NEGATIVE: a heading naming a folder that is NOT a repo gives no base", (t) => {
  const { root } = repo(t);
  writeFileSync(join(root, "docs", "plan", "01_x.md"), "### Notes\n\n- `reports/R1/a.tmdl`\n");
  assert.deepEqual(dead(root), ["reports/R1/a.tmdl"]);
});

test("NEGATIVE: the section ends at the next heading of the same level", (t) => {
  const { root } = repo(t);
  writeFileSync(join(root, "docs", "plan", "01_x.md"), "### Dept_B\n\n- `reports/R1/a.tmdl`\n\n### Other\n\n- `reports/R1/a.tmdl`\n");
  assert.deepEqual(dead(root), ["reports/R1/a.tmdl"], "only the copy outside Dept_B's section is dead");
});

test("unit: nested headings inherit the sibling; a heading inside a code fence is not a heading", (t) => {
  const { root, parent } = repo(t);
  const lines = ["## Dept_B", "#### details", "x", "```", "## Dept_B", "```", "## RepoA", "y"];
  const b = markdownSiblingSections(lines, root);
  assert.equal(b[2], join(parent, "Dept_B"), "a deeper heading keeps the sibling of its parent section");
  assert.equal(b[7], undefined, "the repo's OWN name is never a sibling base");
});
