// Hooks over HTTP for the Docker path (plan/30 §5 ②): host paths in the payload are translated to the container's
// mounts; the answer carries what `zemory hook <event>` would print and exit with.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { tempDir } from "./helpers.mjs";
import { mapHostPath, mapPayload, parsePathMap, relayHook } from "../../dist/memory/hook-relay.js";

const MAP = parsePathMap("C:\\Users\\u\\.claude=>/home/node/.claude;/home/u/.codex=>/home/node/.codex");

test("the path map parses pairs and skips a malformed entry", () => {
  assert.equal(MAP.length, 2);
  assert.equal(parsePathMap("broken;=>x;a=>").length, 0);
});

test("a host transcript path becomes the container path, case-insensitively, on whole segments only", () => {
  assert.equal(mapHostPath("C:\\Users\\u\\.claude\\projects\\d--W\\s.jsonl", MAP), "/home/node/.claude/projects/d--W/s.jsonl");
  assert.equal(mapHostPath("c:/users/U/.Claude/x.jsonl", MAP), "/home/node/.claude/x.jsonl");
  assert.equal(mapHostPath("/home/u/.codex/sessions/a.jsonl", MAP), "/home/node/.codex/sessions/a.jsonl");
  assert.equal(mapHostPath("C:\\Users\\u\\.claude-other\\x", MAP), "C:\\Users\\u\\.claude-other\\x", "NEGATIVE: a longer folder name is not under the prefix");
  assert.equal(mapHostPath("D:\\Workspace\\repo", MAP), "D:\\Workspace\\repo", "NEGATIVE: an unmapped path is left as given");
});

test("an unknown event is not run: says nothing and lets the call through", () => {
  assert.deepEqual(relayHook("rm-everything", {}, MAP), { stdout: "", stderr: "", code: 0, known: false });
  assert.equal(relayHook("send-guard", { tool_input: { to: "worker", message: "x" } }, MAP).known, true);
});

test("the payload the container reads has its transcript under the mount; the rest is as posted", () => {
  const out = mapPayload({ transcript_path: "C:\\Users\\u\\.claude\\projects\\p\\s.jsonl", cwd: "D:\\Workspace\\repo", session_id: "s" }, MAP);
  assert.equal(out.transcript_path, "/home/node/.claude/projects/p/s.jsonl");
  assert.equal(out.cwd, "D:\\Workspace\\repo", "cwd stays the host path: the store keys projects by it");
  assert.equal(out.session_id, "s");
});

test("send-guard over HTTP answers like the stdin hook: a non-peer target passes", () => {
  assert.equal(relayHook("send-guard", { tool_input: { to: "worker", message: "x" } }, MAP).code, 0);
});

test("send-guard in the container judges by the pids the host client reports alive (it cannot probe host pids)", (t) => {
  const home = tempDir(t, "zemory-relay-peers-");
  const pid = 999999; // not a process here: only the host client's word makes it alive
  mkdirSync(join(home, "sessions"), { recursive: true });
  const proj = join(home, "projects", "D--w-Dept_X");
  mkdirSync(proj, { recursive: true });
  writeFileSync(join(home, "sessions", `${pid}.json`), JSON.stringify({ pid, sessionId: "s1", cwd: "D:/w/Dept_X", name: "dept-x-1", nameSource: "derived" }));
  writeFileSync(join(proj, "s1.jsonl"), [JSON.stringify({ type: "user", message: "x", cwd: "D:/w/Dept_X" }), JSON.stringify({ type: "custom-title", customTitle: "Dept_X_Claude_21-10-2026", sessionId: "s1" })].join("\n") + "\n");
  const prev = [process.env.ZEMORY_CLAUDE_HOME, process.env.ZEMORY_PEER_TITLE_CACHE];
  process.env.ZEMORY_CLAUDE_HOME = home;
  process.env.ZEMORY_PEER_TITLE_CACHE = join(home, "c.json");
  t.after(() => {
    if (prev[0] === undefined) delete process.env.ZEMORY_CLAUDE_HOME; else process.env.ZEMORY_CLAUDE_HOME = prev[0];
    if (prev[1] === undefined) delete process.env.ZEMORY_PEER_TITLE_CACHE; else process.env.ZEMORY_PEER_TITLE_CACHE = prev[1];
  });
  const send = (live_pids) => relayHook("send-guard", { tool_input: { to: "dept-x-1", message: "status only" }, transcript_path: "", live_pids }, MAP);
  const blocked = send([pid]);
  assert.equal(blocked.code, 2, "the host says the session is alive ⇒ a status-only message is blocked");
  assert.match(blocked.stderr, /Rule_Gate_89/);
  assert.equal(send([]).code, 0, "NEGATIVE: no live session ⇒ nothing to judge");
});

test("a stop event for a transcript that does not exist is fail-open", () => {
  const r = relayHook("stop", { transcript_path: "C:\\Users\\u\\.claude\\projects\\none\\gone.jsonl", cwd: "D:\\nowhere" }, MAP);
  assert.equal(r.code, 0);
});
