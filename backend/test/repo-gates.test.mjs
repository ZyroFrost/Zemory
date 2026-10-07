// Repo gates (user 2026-10-07: "chính bạn cũng cần có cổng kiểm các phòng ban đã có đủ hook hết chưa"): a repo is held
// to RUNNING its gates — guard wired, pre-commit wired, a row per constitution article — and `hook guard` wires the
// pre-commit itself (measured that day: 6/18 repos generated precommit-guard.cjs that git never called).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { generateGuards, precommitState } from "../../dist/docs/guard-gen.js";
import { repoGateLines, repoGates } from "../../dist/docs/repo-gates.js";
import { noGateArticles, noGateIssues, writeNoGateTop } from "../../dist/docs/no-gate.js";
import { tempDir } from "./helpers.mjs";

function repo(t, { git = true } = {}) {
  const root = tempDir(t, "zemory-gates-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent" }));
  if (git) {
    mkdirSync(join(root, ".git", "hooks"), { recursive: true });
    writeFileSync(join(root, ".git", "config"), "[core]\n\tbare = false\n");
  }
  return root;
}

test("a repo that carries nothing wired has three gaps, each named with its fix", (t) => {
  const root = repo(t);
  const g = repoGates(root, "R");
  assert.equal(g.wiring, null);
  assert.equal(g.precommit, "none");
  assert.equal(g.readFirst, false);
  assert.equal(g.gaps, 3);
  const lines = repoGateLines(g).join("\n");
  assert.match(lines, /guard not wired/);
  assert.match(lines, /pre-commit not wired/);
  assert.match(lines, /read-before-write latch not in place/);
});

test("an OLD guard.cjs that never calls read-first.cjs is a gap even when the file sits next to it", (t) => {
  const root = repo(t, { git: false });
  generateGuards(root);
  assert.equal(repoGates(root, "R").readFirst, true, "premise: hook guard puts the latch in place");
  const guard = join(root, "docs", "hooks", "guard.cjs");
  writeFileSync(guard, readFileSync(guard, "utf8").replaceAll("read-first.cjs", "x.cjs"));
  assert.equal(repoGates(root, "R").readFirst, false);
});

test("`hook guard` wires the guard AND the pre-commit — afterwards no gap is left", (t) => {
  const root = repo(t);
  const r = generateGuards(root);
  assert.ok(r.added.some((a) => a.startsWith("pre-commit")), "hook guard must report the pre-commit it wired");
  const pc = readFileSync(join(root, ".git", "hooks", "pre-commit"), "utf8");
  assert.match(pc, /precommit-guard\.cjs/);
  assert.equal(precommitState(root), "guard");
  assert.equal(repoGates(root, "R").gaps, 0);
});

test("the repo's OWN pre-commit is never overwritten — it is reported instead", (t) => {
  const root = repo(t);
  writeFileSync(join(root, ".git", "hooks", "pre-commit"), "#!/bin/sh\nnpm run lint\n");
  const r = generateGuards(root);
  assert.equal(readFileSync(join(root, ".git", "hooks", "pre-commit"), "utf8"), "#!/bin/sh\nnpm run lint\n");
  assert.ok(r.kept.some((k) => k.startsWith("pre-commit")));
  assert.equal(repoGates(root, "R").precommit, "other");
  assert.equal(repoGates(root, "R").gaps, 1);
});

test("core.hooksPath is honoured: the pre-commit goes where git will look for it", (t) => {
  const root = repo(t);
  writeFileSync(join(root, ".git", "config"), "[core]\n\thooksPath = .githooks\n");
  generateGuards(root);
  assert.ok(existsSync(join(root, ".githooks", "pre-commit")));
  assert.ok(!existsSync(join(root, ".git", "hooks", "pre-commit")));
});

test("constitution articles without a gate row are a gap; a non-git repo is not held to a pre-commit", (t) => {
  const root = repo(t, { git: false });
  generateGuards(root);
  writeFileSync(join(root, "docs", "agent", "01_CONSTITUTION.md"), "1. **A**\n2. 🔒 **B**\n");
  writeFileSync(join(root, "docs", "agent", "02_RULES.md"), "## Cổng cho hiến pháp\n| # | x |\n|---|---|\n| 1 | a |\n");
  const g = repoGates(root, "R");
  assert.equal(g.precommit, "no-git");
  assert.deepEqual(g.hp, { articles: 2, missing: [2], table: true });
  assert.equal(g.gaps, 2, "the unmapped article + the missing top block");
  assert.match(repoGateLines(g).join("\n"), /article\(s\) 2 have no gate row/);
});

// User 2026-10-07: "các luật nào mà ko viết hook dc thì đưa lên đầu để nó ko đọc lướt… kể cả hiến pháp luôn".
test("ungated articles go to the TOP of both files; numbers never move; `## Hành xử` stands first in 02_RULES", (t) => {
  const root = repo(t, { git: false });
  const agent = join(root, "docs", "agent");
  generateGuards(root);
  const CON = "# HP\r\n\r\nintro\r\n\r\n## Điều khoản\r\n1. **Alpha**\r\n2. 🔒 **Beta**\r\n3. **Gamma**\r\n4. **Delta**\r\n";
  writeFileSync(join(agent, "01_CONSTITUTION.md"), CON);
  writeFileSync(
    join(agent, "02_RULES.md"),
    "# R\n\n## Git\nx\n\n## Hành xử\n- judge\n\n## Cổng cho hiến pháp\n| # | Điều | Loại | Cổng |\n|---|---|---|---|\n| 1 | Alpha | CHẶN | `a.test` |\n| 2 | Beta | CHỮ | phán đoán |\n| 3 | Gamma | NHẮC | CHƯA có hook — việc mở |\n",
  );
  assert.deepEqual(noGateArticles(agent).map((a) => [a.n, a.why]), [[2, "words"], [3, "unbuilt"], [4, "unmapped"]]);
  assert.equal(noGateIssues(agent).length, 3, "two missing blocks + Hành xử not first");
  writeNoGateTop(agent);
  assert.deepEqual(noGateIssues(agent), []);
  const con = readFileSync(join(agent, "01_CONSTITUTION.md"), "utf8");
  assert.ok(con.indexOf("zemory:no-gate:start") < con.indexOf("## Điều khoản"), "the block sits before the first section");
  assert.match(con, /\*\*Điều 2\*\* — Beta \*\(chỉ chữ\)\*/);
  assert.ok(!/Điều 1\*\*/.test(con.slice(0, con.indexOf("## Điều khoản"))), "a gated article is not listed");
  assert.ok(con.endsWith(CON.slice(CON.indexOf("## Điều khoản"))), "the articles themselves are byte-identical — numbers do not move");
  assert.ok(!/[^\r]\n/.test(con), "a CRLF file stays CRLF");
  const heads = [...readFileSync(join(agent, "02_RULES.md"), "utf8").matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(heads, ["Hành xử", "Git", "Cổng cho hiến pháp"]);
  // idempotent, and it goes stale when the table changes
  assert.deepEqual(writeNoGateTop(agent), []);
  const rules = join(agent, "02_RULES.md");
  writeFileSync(rules, readFileSync(rules, "utf8").replace("| 2 | Beta | CHỮ | phán đoán |", "| 2 | Beta | CHẶN | `b.test` |"));
  assert.match(noGateIssues(agent).join("\n"), /stale/);
  assert.equal(repoGates(root, "R").gaps, 2, "unmapped article 4 + the stale block");
});

// 3.7.7 appended "## Cổng cho hiến pháp" AFTER the standard stamp, and moving `## Hành xử` first dragged the stamp
// mid-file: `standardDiff` reads the stamp only on the last line ⇒ "no stamp" ⇒ the repo could never be updated again.
test("moving `## Hành xử` first keeps the zemory-standard stamp as the LAST line (and repairs a stranded one)", async () => {
  const { behaviourFirst, stampLast } = await import("../../dist/docs/no-gate.js");
  const { stampOf } = await import("../../dist/docs/standard.js");
  const STAMP = "<!-- zemory-standard: 2026-10-07 -->";
  // stamp stranded before an appended section (the 3.7.7 shape), Hành xử not first
  const before = `# R\n\n## Git\nx\n\n## Hành xử\n- judge\n\n${STAMP}\n\n## Cổng cho hiến pháp\n| 1 | a | CHẶN | t |\n`;
  assert.equal(stampOf(before), null, "premise: a stranded stamp reads as none");
  const after = behaviourFirst(before);
  assert.equal(stampOf(after), "2026-10-07");
  assert.deepEqual([...after.matchAll(/^## (.+)$/gm)].map((m) => m[1]), ["Hành xử", "Git", "Cổng cho hiến pháp"]);
  assert.equal(after.split(STAMP).length, 2, "exactly one stamp");
  assert.ok(after.includes("- judge") && after.includes("| 1 | a | CHẶN | t |"), "no content lost");
  assert.equal(behaviourFirst(after), after, "idempotent");
  assert.equal(stampLast(after), after);
  // Hành xử LAST with the stamp inside it: the stamp must not ride along to the top
  const last = `# R\n\n## Git\nx\n\n## Hành xử\n- judge\n\n${STAMP}\n`;
  assert.equal(stampOf(behaviourFirst(last)), "2026-10-07");
});

// Dept_FA 2026-10-07: a repo that builds gates for its own constitution needs ONE standard hook point, not a hand-edited
// .git/hooks/pre-commit. Marker `repoGates` → policy `repo_gates` → run by precommit-guard.cjs after the secret check.
test("marker `repoGates` commands run at commit time; a failing one blocks the commit with its exit code", (t) => {
  const root = repo(t, { git: false });
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8", windowsHide: true });
  git("init", "-q");
  const marker = join(root, "docs", ".harness.json");
  writeFileSync(marker, JSON.stringify({ docs: "docs/agent", repoGates: ["node -e \"process.exit(require('fs').existsSync('ok.flag')?0:3)\""] }));
  generateGuards(root);
  assert.equal(JSON.parse(readFileSync(join(root, "docs", "hooks", "policy.json"), "utf8")).repo_gates.length, 1);
  writeFileSync(join(root, "a.txt"), "x");
  git("add", "a.txt");
  const run = () => spawnSync(process.execPath, [join(root, "docs", "hooks", "precommit-guard.cjs")], { cwd: root, encoding: "utf8", windowsHide: true });
  let r = run();
  assert.equal(r.status, 3, "the repo gate's exit code blocks the commit");
  assert.match(r.stderr, /repo gate failed/);
  writeFileSync(join(root, "ok.flag"), "");
  r = run();
  assert.equal(r.status, 0, r.stderr);
  // the secret check still runs FIRST
  writeFileSync(join(root, "prod.env"), "K=1");
  git("add", "prod.env");
  assert.equal(run().status, 1);
});

test("a folder without a zemory marker is not judged", (t) => {
  const root = tempDir(t, "zemory-gates-none-");
  assert.equal(repoGates(root, "X"), null);
});
