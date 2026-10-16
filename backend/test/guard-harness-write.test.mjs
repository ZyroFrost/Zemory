// Rule_Gate_79_HarnessEditNeedsApproval: the harness docs are protected in every repo, declared or not. Writing into them —
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
  for (const rel of ["docs/agent/05_TODO.md", "docs/agent/01_RULES/Rule_Core_90_New/RULE.md", "docs/plan/09_x.md", "AGENTS.md", "CLAUDE.md"]) {
    const out = write(r, rel);
    assert.equal(out.status, 2, `not blocked: ${rel}\n${out.stdout}${out.stderr}`);
    assert.match(out.stdout + out.stderr, /Rule_Gate_79_HarnessEditNeedsApproval/, rel);
  }
  assert.equal(write(r, "backend/src/a.ts").status, 0, "code outside the harness docs is not this rule's business");
});

test("shell writes into the harness docs are blocked: redirection, touch, mkdir, sed -i, git mv", (t) => {
  const r = repo(t);
  for (const cmd of ["echo x > docs/agent/05_TODO.md", "touch docs/agent/01_RULES/x.md", "mkdir docs/agent/02_CONSTITUTION/Cons_Core_09_New",
    "sed -i 's/a/b/' docs/agent/05_TODO.md", "git mv docs/plan/a.md docs/plan/b.md"]) {
    assert.equal(bash(r, cmd).status, 2, `not blocked: ${cmd}`);
  }
  assert.equal(bash(r, "grep -n todo docs/agent/05_TODO.md").status, 0, "reading is not writing");
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
