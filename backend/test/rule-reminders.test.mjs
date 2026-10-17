// UserPromptSubmit RULE REMINDERS (rule audit 2026-10-07, class C): rules a machine can only remind of. Each fires at most
// ONCE per session, so the hook stays silent otherwise. Run through the real CLI (`zemory hook prompt`) on a temp store.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { tempDir } from "./helpers.mjs";

const cli = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");
// `away`: the session stands in a folder outside the repo (its scratch folder) while the host names the repo as the project.
function setup(t, title, { away = false } = {}) {
  const dir = tempDir(t, "zemory-remind-");
  const repo = join(dir, "Dept_FA");
  mkdirSync(repo, { recursive: true });
  const scratch = join(dir, "scratchpad");
  mkdirSync(scratch, { recursive: true });
  const transcript = join(dir, "s1.jsonl");
  const lines = [JSON.stringify({ type: "user", cwd: repo, timestamp: "2026-10-07T01:00:00Z", message: { role: "user", content: "x" } })];
  if (title) lines.push(JSON.stringify({ type: "custom-title", customTitle: title, sessionId: "s1" }));
  writeFileSync(transcript, lines.join("\n") + "\n");
  // The gate itself runs inside a Claude session: its own CLAUDE_PROJECT_DIR must not leak into the case.
  const base = { ...process.env };
  delete base.CLAUDE_PROJECT_DIR;
  const env = { ...base, GLOBAL_MEMORY_DB: join(dir, "store", "gm.db"), ZEMORY_PEER_TITLE_CACHE: join(dir, "cache.json"),
    ...(away ? { CLAUDE_PROJECT_DIR: repo } : {}) };
  const prompt = (text) =>
    spawnSync(process.execPath, [cli, "hook", "prompt"], {
      input: JSON.stringify({ session_id: "s1", transcript_path: transcript, cwd: away ? scratch : repo, prompt: text }),
      encoding: "utf8",
      env,
      timeout: 60_000,
    }).stdout;
  return { prompt };
}

test("a titled session whose title breaks the rule is reminded ONCE", (t) => {
  const s = setup(t, "Dept_FA-1-9-2026");
  assert.match(s.prompt("hello"), /breaks the session-title rule/);
  assert.doesNotMatch(s.prompt("hello again"), /session-title rule/, "second prompt ⇒ silent");
});

test("NEGATIVE: an untitled session and a standard title get nothing", (t) => {
  assert.doesNotMatch(setup(t, null).prompt("hello"), /session-title/);
  assert.doesNotMatch(setup(t, "Dept_FA_Claude_7-10-2026").prompt("hello"), /session-title/);
});

test("a session standing in its scratch folder is judged by its PROJECT's name, not the folder's", (t) => {
  assert.doesNotMatch(setup(t, "Dept_FA_Claude_7-10-2026", { away: true }).prompt("hello"), /session-title/,
    "standard title of the project ⇒ silent although cwd is `scratchpad`");
  assert.match(setup(t, "Dept_FA-1-9-2026", { away: true }).prompt("hello"), /retitle it Dept_FA_/,
    "a broken title is still caught, and the advice names the project");
});

test("keyword reminders: closing the session and auditing the ledger, each once", (t) => {
  const s = setup(t, null);
  assert.match(s.prompt("ok chốt phiên nhé"), /session-close/);
  assert.doesNotMatch(s.prompt("chốt phiên lần nữa"), /session-close/, "once per session");
  assert.match(s.prompt("giờ còn gì không"), /three sources/);
  assert.equal(s.prompt("làm tiếp đi").trim(), "", "an ordinary prompt adds 0 characters");
});

test("core-rule doors (plan/27 §6): interface work and a design proposal, each once; an ordinary prompt stays silent", (t) => {
  const s = setup(t, null);
  assert.match(s.prompt("làm tiếp phần UI"), /02-62/);
  assert.doesNotMatch(s.prompt("sửa lại giao diện"), /02-62/, "once per session");
  assert.match(s.prompt("đề xuất phương án cho kênh sync"), /plan search/);
  assert.doesNotMatch(s.prompt("thêm một phương án nữa"), /plan search/, "once per session");
  const host = setup(t, null);
  assert.equal(
    host.prompt("<task-notification>\n<result>Đề xuất phương án sửa giao diện; ghi sổ rồi chốt phiên</result>\n</task-notification>").trim(),
    "",
    "a host notification quoting agent text is not the user speaking ⇒ no keyword door fires",
  );
  assert.match(host.prompt("đề xuất phương án mới"), /plan search/, "the same session still gets the door from a real prompt");
  const quiet = setup(t, null);
  assert.equal(quiet.prompt("chạy test đi").trim(), "", "no door word ⇒ 0 characters");
  assert.equal(quiet.prompt("build xong chưa").trim(), "", "no door word ⇒ 0 characters");
});
