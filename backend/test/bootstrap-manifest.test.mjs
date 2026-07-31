// The Cowork BOOTSTRAP carries a COPY of facts that live in docs_template/cowork/nonapp/:
// which files make up the Cowork standard, and how many lines each one has. A copy that
// nobody checks goes stale silently — and the failure is nasty, because the stale
// number lands in BOOTSTRAP's own self-check step (check_install.py) and makes every
// machine report a false ✗ on a file that is actually fine.
//
// NOTE the source moved on 2026-07-29: the Cowork set used to overlay docs_template/nonapp/
// (the master template that `zemory init --non-app` scaffolds from), so the whole set was
// moved under docs_template/cowork/nonapp/ and the master template was pinned untouched.
//
// SUPERSEDED 2026-07-31 (Phase 3, see docs/agent/06_CHANGES): the user ruled the skills
// architecture goes onto the master templates too. So this gate no longer pins "masters
// must NOT have .claude/" — it pins the opposite: all three sets carry the same shape
// (skills as .claude/skills/<name>/SKILL.md, 04_SKILLS as a thin registry outside the
// always-read set), while each stays its own variant. The separation still pinned is the
// one that matters: BOOTSTRAP must scaffold from cowork/nonapp, never from the master.
//
//   - every file in docs_template/cowork/nonapp/ must appear in the manifest (no silent gap)
//   - every declared line count must equal the real file's line count
//   - the target path must mirror the source path (.claude/** verbatim, agent/plan under docs/)
// Break any of those and the gate goes red instead of the user's session.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE = fileURLToPath(new URL("../../docs_template/cowork/nonapp/", import.meta.url));
const MASTER = fileURLToPath(new URL("../../docs_template/nonapp/", import.meta.url));
const MASTER_APP = fileURLToPath(new URL("../../docs_template/app/", import.meta.url));
const BOOTSTRAP = fileURLToPath(new URL("../../docs_template/cowork/BOOTSTRAP.md", import.meta.url));
const md = readFileSync(BOOTSTRAP, "utf8");

/** Line count the way `wc -l` counts it: number of newline-terminated lines. */
function lineCount(text) {
  const parts = text.split("\n");
  return text.endsWith("\n") ? parts.length - 1 : parts.length;
}

/** Every file shipped as part of the Cowork standard — .md AND the self-check script;
 *  the manifest must cover ALL of them, or Cowork scaffolds half a harness. */
function templateFiles(dir = TEMPLATE, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...templateFiles(join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out.sort();
}

// | 1 | `AGENTS.md` | `<RAW>/AGENTS.md` | 42 |
const ROW = /^\|\s*\d+\s*\|\s*`([^`]+)`\s*\|\s*`<RAW>\/([^`]+)`\s*\|\s*(\d+)\s*\|\s*$/gm;

function manifest() {
  const rows = [];
  for (const m of md.matchAll(ROW)) rows.push({ target: m[1], source: m[2], lines: Number(m[3]) });
  return rows;
}

test("BOOTSTRAP manifest covers every file of the Cowork standard (nothing ships half a harness)", () => {
  const declared = manifest().map((r) => r.source).sort();
  assert.deepEqual(
    declared,
    templateFiles(),
    "docs_template/cowork/BOOTSTRAP.md manifest and docs_template/cowork/nonapp/ disagree — " +
      "a file was added or removed from the standard without updating the manifest, so Cowork would " +
      "scaffold an incomplete harness",
  );
});

test("every line count in the BOOTSTRAP manifest matches the real file", () => {
  const wrong = [];
  for (const row of manifest()) {
    const real = lineCount(readFileSync(join(TEMPLATE, row.source), "utf8"));
    if (real !== row.lines) wrong.push(`${row.source}: manifest says ${row.lines}, file has ${real}`);
  }
  assert.deepEqual(
    wrong,
    [],
    "BOOTSTRAP's self-check step (check_install.py) compares against these numbers — a stale " +
      "number makes every Cowork run report a false ✗ on a correct file",
  );
});

// Files that land at the project ROOT rather than under docs/. AGENTS.md is the
// cross-vendor standard, CLAUDE.md is the Claude door (it reads CLAUDE.md, not AGENTS.md).
const ROOT_ENTRIES = new Set(["AGENTS.md", "CLAUDE.md"]);

test("manifest target paths mirror the source paths (harness lands where the standard says)", () => {
  const rows = manifest();
  assert.ok(rows.length > 0, "manifest parsed as empty — the table format changed and this gate went blind");
  for (const row of rows) {
    // .claude/skills/** is already an absolute project-relative shape — it copies verbatim.
    // agent/** and plan/** live under docs/ in the target project. Root entries stay at root.
    const expected = ROOT_ENTRIES.has(row.source)
      ? row.source
      : row.source.startsWith(".claude/")
        ? row.source
        : `docs/${row.source}`;
    assert.equal(row.target, expected, `manifest row for ${row.source} writes to the wrong path`);
  }
});

test("BOOTSTRAP points at the COWORK standard, not the master template", () => {
  assert.match(
    md,
    /raw\.githubusercontent\.com\/[^\s`]+\/docs_template\/cowork\/nonapp/,
    "the <RAW> base must resolve to docs_template/cowork/nonapp — the master nonapp template is a " +
      "DIFFERENT standard (03_STRUCTURE/04_SKILLS based) and scaffolding it into Cowork mixes the two",
  );
  assert.doesNotMatch(
    md,
    /docs_template\/nonapp/,
    "no reference may point at docs_template/nonapp — that is the zemory-CLI master template, " +
      "kept separate by user ruling (2026-07-29)",
  );
  assert.match(
    md,
    /NGUYÊN VĂN/,
    "the copy-verbatim rule is what stops the agent from 'improving' the standard while transcribing it",
  );
});

test("all three sets carry the skills architecture (Phase 3 — no profile left on the old shape)", () => {
  // Before Phase 3 the masters kept every playbook inline in 04_SKILLS, which meant a
  // 211-233 line file inside the always-read set. The point of the move is that a skill
  // is only paid for when it is used, so what has to be pinned is the SHAPE: skills live
  // as their own files, and 04_SKILLS is a registry thin enough to stay cheap.
  for (const [label, root] of [["cowork", TEMPLATE], ["master nonapp", MASTER], ["master app", MASTER_APP]]) {
    const files = templateFiles(root, "");
    const skills = files.filter((f) => /^\.claude\/skills\/[a-z0-9-]+\/SKILL\.md$/.test(f));
    assert.ok(skills.length >= 7, `${label}: only ${skills.length} skill file(s) — playbooks must live in .claude/skills/`);
    for (const rel of skills) {
      const body = readFileSync(join(root, rel), "utf8");
      assert.match(body, /^---\r?\nname:/u, `${label}/${rel}: no frontmatter — the harness cannot auto-load it`);
    }
    // A registry that grows playbooks back into itself defeats the whole move.
    const registry = readFileSync(join(root, "agent", "04_SKILLS.md"), "utf8");
    assert.ok(
      lineCount(registry) <= 60,
      `${label}: 04_SKILLS is ${lineCount(registry)} lines — a registry, not a playbook dump (cap 60)`,
    );
  }
  const coworkAgents = readFileSync(join(TEMPLATE, "AGENTS.md"), "utf8");
  assert.match(coworkAgents, /Hợp đồng nạp/u, "cowork AGENTS.md must carry the trigger-based load contract");
  for (const [label, root] of [["master nonapp", MASTER], ["master app", MASTER_APP]]) {
    const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
    const readAll = agents.split(/\r?\n/).find((l) => /ĐỌC HẾT/u.test(l)) ?? "";
    // Only the ENUMERATION counts. The same line also declares the exclusion
    // ("03_STRUCTURE và 04_SKILLS KHÔNG nằm trong bộ này"), so a bare /04_SKILLS/ match
    // would flag that declaration as the very thing it forbids. Cut at the exclusion
    // clause — NOT at the first "KHÔNG", because the line opens with "KHÔNG bỏ sót" and
    // cutting there would leave an empty string, i.e. a check that can never go red.
    const enumerated = readAll.split(/`03_STRUCTURE`/u)[0];
    assert.ok(enumerated.includes("01_CONSTITUTION"), `${label}: cannot find the always-read list to check`);
    assert.doesNotMatch(
      enumerated,
      /04_SKILLS/u,
      `${label}: 04_SKILLS still listed as always-read — it must be trigger-loaded now`,
    );
    assert.match(agents, /\.claude\/skills\//u, `${label}: AGENTS.md never mentions .claude/skills/ — no way in`);
  }
});

test("the human explainer exists and the two docs point at each other (neither gets orphaned)", () => {
  const readme = readFileSync(fileURLToPath(new URL("../../docs_template/cowork/README.md", import.meta.url)), "utf8");
  assert.match(
    md,
    /\[`README\.md`\]\(README\.md\)/,
    "BOOTSTRAP must send the user to the human explainer — otherwise the agent improvises its own wording",
  );
  assert.match(
    readme,
    /\[`BOOTSTRAP\.md`\]\(BOOTSTRAP\.md\)/,
    "README must name the machine-facing file, so a reader knows which one they are NOT supposed to read",
  );
  assert.ok(
    /raw\.githubusercontent\.com\/[^\s`]+\/docs_template\/cowork\/BOOTSTRAP\.md/.test(readme),
    "README's start instruction must carry a working BOOTSTRAP URL — that one line is the whole entry point",
  );
});

test("BOOTSTRAP never tells the agent to run host commands (Cowork's shell can't reach the host)", () => {
  const offenders = [];
  if (/zemory\s+(init|sync|doctor|reindex|conform)/.test(md)) offenders.push("a zemory CLI command");
  if (/npm\s+(i|install)\b/.test(md)) offenders.push("an npm install");
  assert.deepEqual(
    offenders,
    [],
    "Cowork runs bash in its own sandbox, so a host command here fails on the user's machine with no way to recover",
  );
});

test("every skill in the set carries a machine-loadable frontmatter (name + description)", () => {
  // The description is the ONLY thing that decides whether Claude ever picks the skill
  // up — a skill without one exists but never fires. check_install.py verifies this on
  // the user's machine; this gate verifies it at the source so it never ships broken.
  const bad = [];
  for (const rel of templateFiles().filter((f) => /^\.claude\/skills\/[a-z0-9-]+\/SKILL\.md$/.test(f))) {
    const body = readFileSync(join(TEMPLATE, rel), "utf8");
    const name = /^name:\s*(.+)$/m.exec(body)?.[1]?.trim() ?? "";
    const desc = /^description:\s*(.+)$/m.exec(body)?.[1]?.trim() ?? "";
    const dir = rel.split("/")[2];
    if (!/^[a-z0-9-]{1,64}$/.test(name)) bad.push(`${rel}: name không hợp lệ (${JSON.stringify(name)})`);
    else if (name !== dir) bad.push(`${rel}: name '${name}' không khớp thư mục '${dir}'`);
    if (!desc) bad.push(`${rel}: thiếu description`);
    else if (desc.length > 1024) bad.push(`${rel}: description ${desc.length} ký tự (> 1024)`);
  }
  assert.deepEqual(bad, [], "skill hỏng frontmatter sẽ không bao giờ được nạp");
});
