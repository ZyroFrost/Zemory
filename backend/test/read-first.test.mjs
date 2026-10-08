// READ BEFORE WRITE (user 2026-10-08, from Dept_FA: an agent skimmed — offset/limit · grep · sed — and acted, three times).
// The latch reads the session TRANSCRIPT the hook receives and blocks acting until the required files were read IN FULL.
// Each case is one way it can go wrong; the negatives keep it from blocking work it must let through.
// Real trial 2026-10-08 in the zemory session that built it: a plan file touched by "someone else" blocked the next edit;
// reading that file in full let the same edit through.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync, readFileSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { READ_FIRST_SOURCE } from "../../dist/docs/read-first-src.js";
import { tempDir } from "./helpers.mjs";

function setup(t) {
  const base = tempDir(t, "zemory-rf-");
  const root = join(base, "repo");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  mkdirSync(join(root, "tasks", "FA_Weekly"), { recursive: true });
  const lines = (n) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n");
  writeFileSync(join(root, "docs", "agent", "02_RULES.md"), lines(10));
  writeFileSync(join(root, "docs", "plan", "01_x.md"), lines(4));
  writeFileSync(join(root, "tasks", "FA_Weekly", "spec.md"), lines(3));
  writeFileSync(join(base, "read-first.cjs"), READ_FIRST_SOURCE);
  const RF = createRequire(import.meta.url)(join(base, "read-first.cjs"));
  const policy = { read_first: { required: ["docs/agent/02_RULES.md", "docs/plan/*.md"], case_root: "tasks", case_files: ["spec.md"], triggers: [] } };
  const tx = join(base, "session.jsonl");
  const entries = [];
  const now = Date.now();
  const api = {
    root,
    // A Read record carries the TEXT the tool returned (as in a real transcript) — taken from the file as it is NOW.
    read(rel, start, num, total, at = now + 60_000) {
      const content = readFileSync(join(root, rel), "utf8").split("\n").slice(start - 1, start - 1 + num).join("\n");
      entries.push({ type: "user", timestamp: new Date(at).toISOString(), toolUseResult: { type: "text", file: { filePath: join(root, rel), content, startLine: start, numLines: num, totalLines: total } } });
    },
    // Our own Write: the file gets "text" and the record carries it.
    own(rel, text, at = now + 60_000) {
      writeFileSync(join(root, rel), text);
      entries.push({ type: "user", timestamp: new Date(at).toISOString(), toolUseResult: { type: "update", filePath: join(root, rel), content: text, structuredPatch: [] } });
    },
    // Our own Edit: the record carries the patched hunk (context " " + added "+" lines), as Claude Code writes it.
    patch(rel, from, to) {
      const f = join(root, rel);
      writeFileSync(f, readFileSync(f, "utf8").replace(from, to));
      entries.push({ type: "user", timestamp: new Date().toISOString(), toolUseResult: { filePath: f, oldString: from, newString: to, structuredPatch: [{ lines: ["-" + from, ...to.split("\n").map((l) => "+" + l)] }] } });
    },
    compact() { entries.push({ type: "system", subtype: "compact_boundary", timestamp: new Date().toISOString() }); },
    check(payload) {
      writeFileSync(tx, entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
      return RF.readFirst({ ...payload, transcript_path: tx }, root, policy);
    },
    edit: (rel) => ({ tool_name: "Edit", tool_input: { file_path: join(root, rel) } }),
    sh: (command) => ({ tool_name: "PowerShell", tool_input: { command } }),
  };
  // the files on disk predate every read of the session
  for (const f of ["docs/agent/02_RULES.md", "docs/plan/01_x.md", "tasks/FA_Weekly/spec.md"]) utimesSync(join(root, f), new Date(now - 3_600_000), new Date(now - 3_600_000));
  return api;
}

test("nothing read ⇒ an edit in the repo is BLOCKED and names every missing file", (t) => {
  const s = setup(t);
  const msg = s.check(s.edit("docs/agent/05_TODO.md"));
  assert.match(msg, /NOT READ IN FULL/);
  assert.match(msg, /docs\/agent\/02_RULES\.md {2}\(read 0\/10 lines\)/);
  assert.match(msg, /docs\/plan\/01_x\.md/);
});

test("everything read in full ⇒ the edit passes", (t) => {
  const s = setup(t);
  s.read("docs/agent/02_RULES.md", 1, 10, 10);
  s.read("docs/plan/01_x.md", 1, 4, 4);
  assert.equal(s.check(s.edit("docs/agent/05_TODO.md")), null);
});

test("a long file read in PIECES (the tool cut it) counts once the pieces cover it; a gap does not", (t) => {
  const s = setup(t);
  s.read("docs/plan/01_x.md", 1, 4, 4);
  s.read("docs/agent/02_RULES.md", 1, 6, 10);
  assert.match(s.check(s.edit("x.md")), /02_RULES\.md {2}\(read 6\/10 lines - still to read: lines 7-10\)/);
  s.read("docs/agent/02_RULES.md", 6, 5, 10);
  assert.equal(s.check(s.edit("x.md")), null);
});

test("a file changed by SOMEONE ELSE after it was read: ONLY the changed lines must be read again (user 2026-10-08)", (t) => {
  // "có cách nào để biết agent nó đọc rồi, ko bắt nó đọc lại nữa ko, để phí token quá" — one changed line used to void the
  // whole file (measured that day: 1 line edited by a script ⇒ all 319 lines of 02_RULES re-read).
  const s = setup(t);
  s.read("docs/agent/02_RULES.md", 1, 10, 10);
  s.read("docs/plan/01_x.md", 1, 4, 4);
  const f = join(s.root, "docs/agent/02_RULES.md");
  writeFileSync(f, readFileSync(f, "utf8").replace("line 3", "line 3 changed by a script")); // not through Edit/Write
  const msg = s.check(s.edit("x.md"));
  assert.match(msg, /02_RULES\.md {2}\(read 9\/10 lines - still to read: lines 3\)/);
  assert.doesNotMatch(msg, /01_x\.md/, "an unchanged file is not asked again");
  s.read("docs/agent/02_RULES.md", 3, 1, 10); // just that line
  assert.equal(s.check(s.edit("x.md")), null);
});

test("lines INSERTED by someone else shift the rest: only the inserted ones are asked for", (t) => {
  const s = setup(t);
  s.read("docs/agent/02_RULES.md", 1, 10, 10);
  s.read("docs/plan/01_x.md", 1, 4, 4);
  const f = join(s.root, "docs/agent/02_RULES.md");
  writeFileSync(f, "new top A\nnew top B\n" + readFileSync(f, "utf8")); // "zemory archive" / another session
  assert.match(s.check(s.edit("x.md")), /02_RULES\.md {2}\(read 10\/12 lines - still to read: lines 1-2\)/);
});

test("NEGATIVE: our OWN Edit / Write after reading needs no re-read — the session wrote those lines", (t) => {
  const s = setup(t);
  s.read("docs/agent/02_RULES.md", 1, 10, 10);
  s.read("docs/plan/01_x.md", 1, 4, 4);
  s.patch("docs/agent/02_RULES.md", "line 5", "line 5 edited\nand a new line");
  assert.equal(s.check(s.edit("x.md")), null, "an Edit");
  s.own("docs/plan/01_x.md", "a whole\nnew file\nwritten by us\n");
  assert.equal(s.check(s.edit("x.md")), null, "a Write");
});

test("NEGATIVE: a context compaction does NOT void earlier reads (user 2026-10-08: the session already knows them)", (t) => {
  const s = setup(t);
  s.read("docs/agent/02_RULES.md", 1, 10, 10);
  s.read("docs/plan/01_x.md", 1, 4, 4);
  s.compact();
  assert.equal(s.check(s.edit("x.md")), null);
});

test("touching a CASE requires its spec; NEGATIVE: an unrelated write does not", (t) => {
  const s = setup(t);
  s.read("docs/agent/02_RULES.md", 1, 10, 10);
  s.read("docs/plan/01_x.md", 1, 4, 4);
  assert.match(s.check(s.edit("tasks/FA_Weekly/vm_deploy.json")), /tasks\/FA_Weekly\/spec\.md/);
  assert.match(s.check(s.sh("python tasks\\FA_Weekly\\pipeline\\run.py")), /tasks\/FA_Weekly\/spec\.md/, "running the case's script needs the spec too");
  assert.equal(s.check(s.edit("docs/agent/05_TODO.md")), null);
});

test("NEGATIVE: looking is never blocked — Read, git status, memory search, a listing", (t) => {
  const s = setup(t);
  assert.equal(s.check({ tool_name: "Read", tool_input: { file_path: join(s.root, "docs/agent/02_RULES.md") } }), null);
  for (const c of ["git status --short", 'zemory memory search "x" --all', "Get-ChildItem docs | Select-Object Name", "git log --oneline -3 | head -5"]) {
    assert.equal(s.check(s.sh(c)), null, c);
  }
  assert.match(s.check(s.sh("npm run check")), /NOT READ IN FULL/, "running anything else acts");
  assert.match(s.check(s.sh("git log > out.txt")), /NOT READ IN FULL/, "a redirect into a file writes");
  // Found by the real trial: these START with a looking command but write or send.
  assert.match(s.check(s.sh("(Get-Item docs/plan/01_x.md).LastWriteTime = Get-Date")), /NOT READ IN FULL/, "a property assignment writes");
  assert.match(s.check(s.sh('curl -X POST https://example.invalid/mail -d "x"')), /NOT READ IN FULL/, "a request that sends data acts");
  assert.equal(s.check(s.sh("curl -s http://127.0.0.1:4444/ping")), null, "a plain GET only looks");
});

test("NEGATIVE: reading Global Memory and finding sessions is never blocked, in every common spelling (user 2026-10-08)", (t) => {
  // "đọc zemory và dò là lệnh để nó trỏ lên GM… ko nên cấm" — a session that read NOTHING must still reach these.
  const s = setup(t);
  for (const c of ["zemory peers 2>&1 | Select-Object -First 20", "zemory memory search x --all --limit 8 2>&1 | Select-Object -First 40",
    "zemory memory context", "zemory memory conflicts", "zemory graph impact backend/src/ui.ts", "zemory graph neighbors x",
    "zemory.cmd peers", "npx zemory peers"]) {
    assert.equal(s.check(s.sh(c)), null, c);
  }
  assert.match(s.check(s.sh("zemory hook guard")), /NOT READ IN FULL/, "a zemory command that WRITES still acts");
  assert.match(s.check(s.sh("zemory memory search x > out.txt")), /NOT READ IN FULL/, "a redirect into a file still writes");
  assert.match(s.check(s.sh("zemory peers 2>&1; npm run check")), /NOT READ IN FULL/, "2>&1 no longer splits, but a real second command still counts");
});

test("NEGATIVE: git's GLOBAL options do not turn a look into an act — git -C <dir> status (Dept_FA 2026-10-08)", (t) => {
  const s = setup(t);
  for (const c of ['git -C "D:\\w\\Dept_FA" status --short', "git -c core.pager=cat log -3", "git --no-pager diff --stat", "git --git-dir=.git --work-tree=. status",
    'Test-Path "tasks\\FA_Weekly\\_x.md"; git -C "D:\\w\\Dept_FA" status --short']) {
    assert.equal(s.check(s.sh(c)), null, c);
  }
  assert.match(s.check(s.sh("git -C . commit -m x")), /NOT READ IN FULL/, "a global option in front of commit still acts");
});

test("a sender script is recognised by its CONTENT, one hop through a launcher; NEGATIVE: a script that sends nothing (Dept_FA 2026-10-08)", (t) => {
  const s = setup(t);
  s.read("docs/agent/02_RULES.md", 1, 10, 10);
  s.read("docs/plan/01_x.md", 1, 4, 4);
  const pipe = join(s.root, "tasks", "FA_Weekly", "pipeline");
  mkdirSync(pipe, { recursive: true });
  mkdirSync(join(s.root, ".claude", "skills", "write-style"), { recursive: true });
  writeFileSync(join(s.root, ".claude", "skills", "write-style", "SKILL.md"), "a\nb\n");
  writeFileSync(join(pipe, "03_send.py"), "import smtplib\nsmtplib.SMTP('h').send_message(m)\n");
  writeFileSync(join(pipe, "01_pull.py"), "import pandas\n");
  writeFileSync(join(s.root, "run_weekly.py"), "import subprocess\nsubprocess.run(['python', 'tasks/FA_Weekly/pipeline/03_send.py'])\n");
  s.read("tasks/FA_Weekly/spec.md", 1, 3, 3);
  const policy = { read_first: { required: ["docs/agent/02_RULES.md", "docs/plan/*.md"], case_root: "tasks", case_files: ["spec.md"],
    triggers: [{ when: "script_re", re: "smtplib|send-mailmessage|smtpclient", read: ".claude/skills/write-style/SKILL.md" }] } };
  const RFmod = createRequire(import.meta.url)(join(s.root, "..", "read-first.cjs"));
  const globalCheck = (command) => RFmod.readFirst({ tool_name: "PowerShell", tool_input: { command }, transcript_path: join(s.root, "..", "session.jsonl") }, s.root, policy);
  s.check(s.sh("echo warm")); // writes the transcript file
  assert.match(globalCheck("python tasks\\FA_Weekly\\pipeline\\03_send.py"), /write-style\/SKILL\.md/, "the sender itself");
  assert.match(globalCheck("python run_weekly.py"), /write-style\/SKILL\.md/, "a launcher one hop away");
  assert.equal(globalCheck("python tasks\\FA_Weekly\\pipeline\\01_pull.py"), null, "a script that sends nothing");
  // Caught live while fixing this: a TEST whose fixture says "smtplib" is not a sender, and a file only NAMED is not run.
  mkdirSync(join(s.root, "test"), { recursive: true });
  writeFileSync(join(s.root, "test", "mail.test.mjs"), "const fx = 'import smtplib';\n");
  assert.equal(globalCheck("node --test test/mail.test.mjs"), null, "a test file mentioning smtplib");
  assert.equal(globalCheck("npm run build -- tasks\\FA_Weekly\\pipeline\\03_send.py"), null, "named, not run by an interpreter");
  assert.equal(globalCheck("$f='tasks\\FA_Weekly\\pipeline\\03_send.py'; Get-Content $f"), null, "a quoted value assigned to a variable is not run");
  assert.equal(globalCheck("$files=@('x.json','tasks/FA_Weekly/pipeline/03_send.py'); git add -- $files"), null, "a PowerShell array of paths is data, not a run");
});

test("a SUBAGENT's reads and edits count for the session — its hook gets the parent transcript (measured 2026-10-08)", (t) => {
  // Four trimming subagents were blocked for good: their first edit read as "someone else changed it", re-reads never seen.
  const s = setup(t);
  s.read("docs/agent/02_RULES.md", 1, 10, 10);
  s.read("docs/plan/01_x.md", 1, 4, 4, Date.now() - 120_000);
  s.check(s.sh("echo warm")); // writes the parent transcript
  const tx = join(s.root, "..", "session.jsonl");
  const sub = join(s.root, "..", "session", "subagents");
  mkdirSync(sub, { recursive: true });
  // the subagent rewrites plan/01_x.md (now 6 lines) and re-reads it — both only in ITS transcript
  const at = new Date(Date.now() + 120_000);
  const next = "s1\ns2\ns3\ns4\ns5\ns6";
  writeFileSync(join(s.root, "docs/plan/01_x.md"), next);
  const RF0 = createRequire(import.meta.url)(join(s.root, "..", "read-first.cjs"));
  const p0 = { read_first: { required: ["docs/plan/*.md"], triggers: [] } };
  const editPlan = { tool_name: "Edit", tool_input: { file_path: join(s.root, "docs/plan/01_x.md") }, transcript_path: tx };
  assert.match(RF0.readFirst(editPlan, s.root, p0), /01_x\.md {2}\(read 0\/6 lines - still to read: lines 1-6\)/, "the parent alone never saw the new text");
  writeFileSync(join(sub, "agent-a1.jsonl"), [
    { type: "user", timestamp: at.toISOString(), toolUseResult: { type: "update", filePath: join(s.root, "docs/plan/01_x.md"), content: next, structuredPatch: [] } },
    { type: "user", timestamp: new Date(at.getTime() + 1000).toISOString(), toolUseResult: { type: "text", file: { filePath: join(s.root, "docs/plan/01_x.md"), content: next, startLine: 1, numLines: 6, totalLines: 6 } } },
  ].map((e) => JSON.stringify(e)).join("\n") + "\n");
  const RF = createRequire(import.meta.url)(join(s.root, "..", "read-first.cjs"));
  const policy = { read_first: { required: ["docs/agent/02_RULES.md", "docs/plan/*.md"], triggers: [] } };
  assert.equal(RF.readFirst({ tool_name: "Edit", tool_input: { file_path: join(s.root, "docs/plan/01_x.md") }, transcript_path: tx }, s.root, policy), null);
});

test("NEGATIVE: writing OUTSIDE the repo (a scratchpad) is not this latch's business", (t) => {
  const s = setup(t);
  assert.equal(s.check({ tool_name: "Write", tool_input: { file_path: join(s.root, "..", "scratch", "x.mjs") } }), null);
});
