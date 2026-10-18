// Rule_Gate_79_HarnessEdit: the harness docs are protected in every repo, declared or not. Writing into them —
// through Write/Edit or a shell command — is blocked until the user's one-use approval flag exists; the flag files
// themselves are never blocked (writing one is how the approval is recorded). The guard runs as a real process.
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { generateGuards } from "../../dist/docs/guard-gen.js";
import { tempDir } from "./helpers.mjs";

function repo(t) {
  const root = tempDir(t, "zemory-harness-write-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "docs", "agent", "05_TODO.md"), "# todo\n");
  writeFileSync(join(root, "AGENTS.md"), "# x\n");
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ layout: "app", docs: "docs/agent" }));
  const r = generateGuards(root);
  return { root, hooks: r.hooksDir };
}

const run = (r, payload) =>
  spawnSync(process.execPath, [join(r.hooks, "guard.cjs")], { input: JSON.stringify(payload), encoding: "utf8", cwd: r.root });
const write = (r, rel) => run(r, { tool_name: "Write", tool_input: { file_path: join(r.root, rel), content: "x\n" } });
const bash = (r, command) => run(r, { tool_name: "Bash", tool_input: { command } });

test("a write into the harness docs is blocked without approval and names Rule_Gate_79; code outside them passes", (t) => {
  const r = repo(t);
  for (const rel of ["docs/agent/02_RULES.md", "docs/agent/01_RULES/Rule_Core_90_New/RULE.md", "docs/plan/09_x.md", "AGENTS.md", "CLAUDE.md"]) {
    const out = write(r, rel);
    assert.equal(out.status, 2, `not blocked: ${rel}\n${out.stdout}${out.stderr}`);
    assert.match(out.stdout + out.stderr, /Rule_Gate_79_HarnessEdit/, rel);
  }
  assert.equal(write(r, "backend/src/a.ts").status, 0, "code outside the harness docs is not this rule's business");
  // plan/29 §13b: the ledgers are the repo's memory, not harness - Rule_Gate_79 never holds them (other doors still may)
  const ledger = write(r, "docs/agent/05_TODO.md");
  assert.doesNotMatch(ledger.stdout + ledger.stderr, /Rule_Gate_79_HarnessEdit/, "the TODO ledger is the repo's to write");
});

test("shell writes into the harness docs are blocked: redirection, touch, mkdir, sed -i, git mv", (t) => {
  const r = repo(t);
  for (const cmd of ["echo x > docs/agent/02_RULES.md", "touch docs/agent/01_RULES/x.md", "mkdir docs/agent/02_CONSTITUTION/Cons_Core_09_New",
    "sed -i 's/a/b/' docs/agent/02_RULES.md", "git mv docs/plan/a.md docs/plan/b.md"]) {
    assert.equal(bash(r, cmd).status, 2, `not blocked: ${cmd}`);
  }
  assert.equal(bash(r, "grep -n todo docs/agent/05_TODO.md").status, 0, "reading is not writing");
});

test("a scratch script that writes into the harness docs is judged by its body; reading or writing elsewhere passes", (t) => {
  // Measured 2026-10-16: `node <scratch>/x.mjs` wrote into the parts store through join(root, "docs_template", "_Store")
  // and the guard, which reads only the command line, never saw it.
  const r = repo(t);
  const scratch = tempDir(t, "zemory-scratch-script-");
  const script = (name, body) => {
    const p = join(scratch, name);
    writeFileSync(p, body);
    return `node "${p.replace(/\\/g, "/")}" "${r.root.replace(/\\/g, "/")}"`;
  };
  const pieces = script("pieces.mjs", 'import { writeFileSync } from "node:fs";\nimport { join } from "node:path";\nwriteFileSync(join(process.argv[2], "docs", "agent", "x.md"), "x");\n');
  const out = bash(r, pieces);
  assert.equal(out.status, 2, `a script naming docs/agent piece by piece must be blocked:\n${out.stdout}${out.stderr}`);
  assert.match(out.stdout + out.stderr, /Rule_Gate_79_HarnessEdit/);
  const literal = script("literal.mjs", 'require("fs").writeFileSync("AGENTS.md", "x");\n');
  assert.equal(bash(r, literal).status, 2, "a script naming AGENTS.md as one literal must be blocked");
  const reads = script("reads.mjs", 'import { readFileSync } from "node:fs";\nconsole.log(readFileSync("docs/agent/05_TODO.md", "utf8"));\n');
  assert.equal(bash(r, reads).status, 0, "reading the harness docs is not writing");
  const elsewhere = script("elsewhere.mjs", 'import { writeFileSync } from "node:fs";\nwriteFileSync("out/report.txt", "x");\n');
  assert.equal(bash(r, elsewhere).status, 0, "writing outside the harness docs is not this rule's business");
  writeFileSync(join(r.hooks, ".allow-docs-write"), "approved\n");
  assert.equal(bash(r, pieces).status, 0, "with the user's approval the script runs");
});

test("the approval flag is never blocked, and one flag lets one write through", (t) => {
  const r = repo(t);
  const flagRel = "docs/hooks/.allow-docs-write";
  assert.equal(bash(r, `touch ${flagRel}`).status, 0, "creating the flag is how an approval is recorded");
  writeFileSync(join(r.root, flagRel), "approved\n");
  // a new file: overwriting an existing one is a different gate (it asks for its own flag)
  assert.equal(write(r, "docs/agent/07_NOTES.md").status, 0, "with the flag the approved write passes");
  assert.equal(write(r, "docs/agent/08_MORE.md").status, 2, "the flag is good for one write");
});
