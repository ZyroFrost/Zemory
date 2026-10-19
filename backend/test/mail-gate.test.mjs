// Rule_Gate_82_MailGate: the agent never sends mail on its own. Measured 2026-10-19 (Dept_IT): two real mails went out
// through `scripts/task_run.py ... -- bin\<Task>.cmd` (no "mail" in any name, no "live" argument), while `git commit` was
// blocked for a message that said "mail". The hook reads what runs: the launcher, the pipeline it calls, not commit text.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { join } from "node:path";
import { RULE_HOOKS } from "../../dist/docs/rule-hooks-src.js";
import { tempDir } from "./helpers.mjs";

function write(root, rel, body) {
  const p = join(root, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, body);
}

function setup(t) {
  const root = tempDir(t, "zemory-mail-");
  write(root, "bin/XY_Monthly_Sales.cmd", "@echo off\r\npython \"%~dp0..\\tasks\\XY_Monthly_Sales\\pipeline\\run.py\" %*\r\n");
  write(root, "tasks/XY_Monthly_Sales/pipeline/run.py", "import importlib\nfor s in ('01_pull', '03_send'): importlib.import_module(s)\n");
  write(root, "tasks/XY_Monthly_Sales/pipeline/03_send.py", "from smtp_mail import send\nsend(to=OPERATOR)\n");
  write(root, "bin/XY_Case_Audit.cmd", "@echo off\r\npython \"%~dp0..\\tasks\\XY_Case_Audit\\pipeline\\run.py\"\r\n");
  write(root, "tasks/XY_Case_Audit/pipeline/run.py", "print('checks only')\n");
  const src = RULE_HOOKS.find((h) => h.file.startsWith("02-82_")).source;
  write(root, "hook.cjs", src);
  const hook = createRequire(import.meta.url)(join(root, "hook.cjs"));
  const ask = (command) => hook.check({ tool_name: "Bash", tool_input: { command } }, root, {});
  return { root, ask };
}

test("a launcher whose pipeline sends mail is caught — run through task_run, with no 'live' and no 'mail' in any name", (t) => {
  const s = setup(t);
  for (const cmd of ["python scripts/task_run.py --task XY_Monthly_Sales --no-log -- bin\\XY_Monthly_Sales.cmd",
    "python scripts/task_run.py --task XY_Monthly_Sales -- bin\\XY_Monthly_Sales.cmd live", "bin\\XY_Monthly_Sales.cmd"]) {
    const r = s.ask(cmd);
    assert.ok(r && r.flag === "mail", `must ask first: ${cmd}`);
    assert.match(r.msg, /03_send\.py sends mail|real-send argument/);
  }
});

test("NEGATIVE: a launcher whose pipeline sends nothing passes", (t) => {
  assert.equal(setup(t).ask("python scripts/task_run.py --task XY_Case_Audit --no-log -- bin\\XY_Case_Audit.cmd"), null);
});

test("NEGATIVE: a commit message that says mail / live / 03_alert.py is text, not a send — and git send-email is still a send", (t) => {
  const s = setup(t);
  assert.equal(s.ask('git commit -m "fix 03_alert.py: send the mail live"'), null);
  assert.equal(s.ask("git add -A && git commit -q -F - <<'EOF'\nmail gate: bin\\XY_Monthly_Sales.cmd live sends mail\nEOF\ngit log --oneline -1"), null);
  assert.ok(s.ask("git send-email --to=a@example.com 0001.patch"), "git send-email sends");
  assert.ok(s.ask("git status && python 03_alert.py"), "a mail script after a git command is still caught");
});
