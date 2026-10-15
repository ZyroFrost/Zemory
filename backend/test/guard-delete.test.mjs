// DELETION = IRREVERSIBLE, so it needs a MACHINE LATCH, not merely words in 02_RULES.
//
// Measured 2026-08-11 on the previous build (a 28-case matrix): the guard only looked at \`rm -r\` and friends, so
// EIGHT whole-tree paths slipped clean through — \`find -delete\` · \`find -exec rm\` · \`git clean -fdx\` ·
// \`robocopy /MIR\` · \`fs.rmSync(recursive)\` · \`shutil.rmtree\` · \`xargs rm\` ·
// \`Get-ChildItem -Recurse | Remove-Item\`. Cong them \`git reset --hard\` va
// \`git checkout -- .\`: 02_RULES S Git forbade it in WORDS long ago with no latch at all.
//
// The test calls the REAL guard through stdin (the hook protocol: exit 2 = block) rather than reading regexes —
// what is under inspection is BEHAVIOUR, not how the code is written.
//
// The SECOND invariant: the gate must block for the RIGHT reason and let through what is not a delete in the repo.
// Since 2026-10-14 (rule 02-10, plan/27 §2h) every in-repo file delete asks first — the 2026-08-11 "an ordinary file
// passes" exception is withdrawn; temp/scratch folders, mere mentions and `git rm --cached` still pass.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GUARD = new URL("../../docs/hooks/guard.cjs", import.meta.url).pathname.replace(/^\//, "");

function ask(payload, guard = GUARD) {
  const r = spawnSync(process.execPath, [guard], { input: JSON.stringify(payload), encoding: "utf8" });
  return { blocked: r.status === 2, say: `${r.stdout}${r.stderr}`, status: r.status };
}
const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });

test("mass deletion that uses none of the rm -r keywords: all eight paths are blocked", () => {
  const forms = [
    "find . -name '*.ts' -delete",
    "find . -name '*.ts' -exec rm {} \\;",
    `node -e "require('fs').rmSync('backend/src',{recursive:true,force:true})"`,
    `python -c "import shutil; shutil.rmtree('backend')"`,
    "git clean -fdx",
    "robocopy C:/empty backend /MIR",
    "ls | xargs rm",
    "Get-ChildItem -Recurse | Remove-Item -Force",
  ];
  for (const cmd of forms) {
    const r = ask(bash(cmd));
    assert.equal(r.blocked, true, `LOT: ${cmd}\n${r.say}`);
  }
});

test("discarding uncommitted work is blocked (02_RULES S Git forbade it in words, now it has a latch)", () => {
  for (const cmd of ["git reset --hard", "git reset --hard HEAD~1", "git checkout -- .", "git stash clear"]) {
    const r = ask(bash(cmd));
    assert.equal(r.blocked, true, `LOT: ${cmd}\n${r.say}`);
  }
});

test("a key name in a SEARCH PATTERN is not a key read - the gate must not block wrongly", () => {
  // Measured 2026-08-11: the guard blocked the very AUDIT command sent to inspect git history, because the command line held both \`head\`
  // and the string \`id_rsa\` in its SEARCH PATTERN. The old build scanned EVERY token as soon as it saw a reading command,
  // so a key name anywhere at all was compared.
  //
  // Why this deserves its own gate rather than a "light session": rule 7 says it plainly - a gate that blocks wrongly makes
  // people go around it, and a gate that is gone around no longer EXISTS. The 2026-08-13 session
  // hit this very case while typing the grep command sent to FIX it.
  for (const cmd of [
    `grep -rln "id_rsa" backend/src/ | head`,
    `grep -rn id_rsa docs/ | tail -5`,
    `rg "id_rsa|id_ed25519" --files-with-matches | head -20`,
  ]) {
    const r = ask(bash(cmd));
    assert.equal(r.blocked, false, `BLOCKED WRONGLY: ${cmd}\n${r.say}`);
  }
});

test("a REAL read of a key file is still blocked - the fix must not loosen that", () => {
  // The counterweight to the case above. All three signs of "a file being read" must still be caught:
  for (const cmd of [
    "cat /etc/ssh/id_rsa", //        1. it holds a path separator
    "cat id_rsa | grep BEGIN", //    2. it stands right after a reading command
    "head id_rsa", //                3. token cuoi cau
    "base64 ~/.ssh/id_rsa",
  ]) {
    const r = ask(bash(cmd));
    assert.equal(r.blocked, true, `LOT: ${cmd}\n${r.say}`);
  }
});

test("emptying a file's content is blocked", () => {
  for (const cmd of ["truncate -s 0 backend/src/ui.ts", "Clear-Content backend/src/ui.ts"]) {
    assert.equal(ask(bash(cmd)).blocked, true, `LOT: ${cmd}`);
  }
});

test("OVERWRITING an existing file ASKS; Edit does NOT ask", () => {
  const target = new URL("../../package.json", import.meta.url).pathname.replace(/^\//, "");
  const w = ask({ tool_name: "Write", tool_input: { file_path: target } });
  assert.equal(w.blocked, true, `a Write over an existing file must ask:\n${w.say}`);
  assert.match(w.say, /ASK THE USER/, "it must say plainly that it is asking the user, not forbidding outright");

  const e = ask({ tool_name: "Edit", tool_input: { file_path: target } });
  assert.equal(e.blocked, false, `Edit changing one region must NOT be asked about:\n${e.say}`);
});

// Fixed 2026-08-24 (user approved 21/08): the delete branch scans the tokens of the EXACT SEGMENT holding the delete command,
// the same shape as the git branch. Before that `rm build.log && echo "check prod.env"` was BLOCKED WRONGLY — a
// secret name mentioned in an echo on the SAME command line. The positive case (really deleting a secret) is unchanged above.
test("NEGATIVE CASE (segment): a secret name in a segment OTHER than the delete segment is not caught", () => {
  for (const cmd of [
    'rm build.log && echo "check prod' + '.env"',
    "type prod" + ".env && rm build.log",
    "rm out.txt; cat ." + "env.example",
  ]) {
    const r = ask(bash(cmd));
    // Since 2026-10-14 every in-repo delete asks first (02-10), so the command IS blocked — but for the delete itself,
    // never for a secret named in ANOTHER segment (that wrong reason teaches people to stop writing self-checks).
    assert.doesNotMatch(r.say, /secret/i, cmd + " — a secret in another segment must not be the reason: " + r.say);
    assert.match(r.say, /Rule_Gate_10_ConfirmDelete/, cmd + " — the in-repo delete is what asks: " + r.say);
  }
  // and the positive case right beside it so a mutation cannot slip through: a secret in the ACTUAL delete segment is still BLOCKED
  const bad = ask(bash("echo ok && rm ." + "env"));
  assert.equal(bad.blocked, true, "deleting a secret in the delete segment must still be BLOCKED");
});

// 02-10 (plan/27 §2h, 2026-10-14) withdraws the 2026-08-11 "an ordinary file passes" exception: every delete of a file in
// the repo asks first. What still passes: temp/scratch folders, commands that only MENTION a delete, `git rm --cached`.
test("02-10: every in-repo file delete asks first; temp folders, mentions and git rm --cached pass", () => {
  const tmp = join(tmpdir(), "zm-scratch-x.txt");
  for (const cmd of ["rm backend/src/ui.ts", "Remove-Item backend/src/ui.ts", "del notes.txt", "git rm backend/src/ui.ts",
    `node -e "require('fs').unlinkSync('backend/src/ui.ts')"`, `python -c "import os; os.remove('a.txt')"`]) {
    const r = ask(bash(cmd));
    assert.equal(r.blocked, true, `an in-repo delete must ask first: ${cmd}\n${r.say}`);
    assert.match(r.say, /Rule_Gate_10_ConfirmDelete/, `the block must cite rule 02-10: ${cmd}`);
  }
  for (const cmd of ["rm /tmp/x.txt", `Remove-Item "${tmp}"`, "echo 'run rm build.log later'", "git rm --cached secret-free.txt"]) {
    const r = ask(bash(cmd));
    assert.equal(r.blocked, false, `must pass: ${cmd}\n${r.say}`);
  }
});

// 02-10 (b): a rule never disappears from a rule set without the user's word; retiring one keeps its number.
test("02-10 (b): an edit that drops a rule number from 01/02 is blocked; keeping the number passes", () => {
  const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const edit = (rel, o, n) => ({ tool_name: "Edit", tool_input: { file_path: join(ROOT, rel), old_string: o, new_string: n } });
  const rules = "docs_template/05_app/agent/02_RULES.md";
  const hp = "docs_template/05_app/agent/01_CONSTITUTION.md";
  const drop = ask(edit(rules, "- `02-41` Mới nhất ở trên cùng.\n- `02-42` Entry đảo", "- `02-42` Entry đảo"));
  assert.equal(drop.blocked, true, `dropping 02-41 must be blocked\n${drop.say}`);
  assert.match(drop.say, /removes rule 02-41/);
  assert.equal(ask(edit(rules, "- `02-41` Mới nhất ở trên cùng.", "- `02-41` Mới nhất luôn ở trên cùng.")).blocked, false, "rewording keeps the number");
  const hpDrop = ask(edit(hp, "3. **Mỗi lớp**\n4. **1 capability**", "4. **1 capability**"));
  assert.equal(hpDrop.blocked, true, `dropping article 3 must be blocked\n${hpDrop.say}`);
  assert.equal(ask(edit(hp, "3. **Mỗi lớp** …", "3. *(BÃI BỎ — giữ số)*")).blocked, false, "abolishing keeps the number");
});

test("02-10 (b), folder harness: changing or dropping the `id:` of a rule folder is blocked; editing the body passes", () => {
  const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const rule = join(ROOT, "docs_template/_Store/01_RULES/Rule_Gate_41_ChangelogNewestFirst/RULE.md");
  const edit = (o, n) => ({ tool_name: "Edit", tool_input: { file_path: rule, old_string: o, new_string: n } });
  const renumber = ask(edit("id: Rule_41", "id: Rule_99"));
  assert.equal(renumber.blocked, true, `renumbering must be blocked\n${renumber.say}`);
  assert.match(renumber.say, /removes rule Rule_41/);
  assert.equal(ask(edit("id: Rule_41\n", "")).blocked, true, "dropping the id line must be blocked");
  assert.equal(ask(edit("name: changelog-newest-first", "name: changelog-newest-first")).blocked, false, "a body edit keeps the number");
  const write = ask({ tool_name: "Write", tool_input: { file_path: rule, content: "---\nname: x\n---\n" } });
  assert.equal(write.blocked, true, "a Write without the id must be blocked");
});

test("an OLD policy with a NEW guard: it still blocks and must NOT throw", () => {
  // The cowork set is carried by hand to other machines, so the two files are bound to be out of step at times.
  // Before the fix, a missing `POLICY.flags[name]` meant path.join(..., undefined) => the guard DIED
  // halfway, and a dead guard guards nothing.
  const dir = mkdtempSync(join(tmpdir(), "zemory-guard-old-"));
  try {
    const hooks = join(dir, "docs", "hooks");
    mkdirSync(hooks, { recursive: true });
    cpSync(GUARD, join(hooks, "guard.cjs"));
    writeFileSync(
      join(hooks, "policy.json"),
      JSON.stringify({
        protected_write: [],
        secret_names: [],
        flags_dir: "docs/hooks",
        flags: { push: ".allow-push" }, // an OLD-generation policy: no delete/discard/overwrite
      }),
    );
    const r = ask(bash("git clean -fdx"), join(hooks, "guard.cjs"));
    assert.equal(r.blocked, true, `an old policy must still BLOCK, actual status=${r.status}:\n${r.say}`);
    assert.doesNotMatch(r.say, /TypeError|Cannot read|undefined/, `the guard threw instead of blocking:\n${r.say}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The GLOB must bite on BOTH branches (write + delete) - a hole reported from the field 2026-08-24.
//
// Before: the WRITE branch had globs while the DELETE branch compared PREFIXES only. So a repo declaring
// `protected: ["data/*/01_raw"]` blocked WRITES but NOT DELETES - exactly the silent
// hole class: whoever declared it believed the fence was up while the back door stood open. The consequence on a real estate: every repo
// had to list each `data/<case>/01_raw` BY HAND, and each new case had to be remembered - and
// "a latch you must remember by hand" rots.
//
// The NEGATIVE case here matters as much as the positive one (audit skill rule 7): the glob must not swell up and block
// NEIGHBOURING paths as well (`02_processing` is where the agent writes all day).
function guardWithPolicy(protectedWrite) {
  const dir = mkdtempSync(join(tmpdir(), "zemory-guard-glob-"));
  const hooks = join(dir, "docs", "hooks");
  mkdirSync(hooks, { recursive: true });
  cpSync(GUARD, join(hooks, "guard.cjs"));
  writeFileSync(
    join(hooks, "policy.json"),
    JSON.stringify({
      protected_write: protectedWrite,
      protected_write_reason: "test",
      secret_names: [],
      secret_allow: [],
      flags_dir: "docs/hooks",
      flags: { push: ".allow-push", delete: ".allow-delete", docs_write: ".allow-docs-write" },
    }),
  );
  return { guard: join(hooks, "guard.cjs"), root: dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("a glob in protected blocks the DELETE branch too, not only the WRITE branch", () => {
  const g = guardWithPolicy(["data/*/01_raw"]);
  try {
    // POSITIVE: deleting inside the glob path -> must BLOCK (before the fix: it slipped through)
    for (const cmd of ["rm data/case_x/01_raw/f.csv", "del data/mot_case_khac/01_raw/f.csv"]) {
      const r = ask(bash(cmd), g.guard);
      assert.equal(r.blocked, true, `the glob must block DELETE: ${cmd}
${r.say}`);
    }
    // The WRITE branch still blocks as before (nothing already working is broken)
    const w = ask({ tool_name: "Write", tool_input: { file_path: join(g.root, "data", "case_x", "01_raw", "f.csv") } }, g.guard);
    assert.equal(w.blocked, true, `the glob must block WRITE:
${w.say}`);

    // NEGATIVE: the glob path's neighbours are not PROTECTED — they still ask under 02-10 (any delete), never as protected
    for (const cmd of ["rm data/case_x/02_processing/tmp.csv", "rm build.log", "rm docs/note.md"]) {
      const r = ask(bash(cmd), g.guard);
      assert.doesNotMatch(r.say, /protected path/i, `must NOT be blocked as protected: ${cmd}
${r.say}`);
    }
  } finally {
    g.cleanup();
  }
});

test("a plain prefix still works exactly as before after the two matchers were merged", () => {
  const g = guardWithPolicy(["data"]);
  try {
    assert.equal(ask(bash("rm data/x/y.csv"), g.guard).blocked, true, "a prefix must block its child paths");
    assert.doesNotMatch(ask(bash("rm database.md"), g.guard).say, /protected path/i, "`database.md` must not count as protected merely for starting with `data`");
  } finally {
    g.cleanup();
  }
});
