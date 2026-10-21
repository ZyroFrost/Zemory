// Rule_Gate_89_MessageOnlyWithWork — the send guard's second check (send-guard.ts judgeSendPurpose): a message to
// another repo's session carries work for it, or answers it. Measured 2026-10-21: status-only messages ("HS is red
// because of another repo's part") reached two department sessions mid-task that had nothing to do with them.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileHasAny, judgeSendPurpose } from "../../dist/memory/send-guard.js";
import { tempDir } from "./helpers.mjs";

const PEERS = [
  { pid: 1, sessionId: "a", cwd: "D:\\w\\Dept_OPS", name: "dept-ops-45", title: "Dept_OPS_Claude_21-10-2026", titleDate: 1, chosen: true, repo: "Dept_OPS" },
];
const never = () => false;
const spoke = () => true;

test("a status message to a session that never wrote here is blocked, and the reason names the way out", () => {
  const why = judgeSendPurpose({ to: "dept-ops-45", message: "Zemory: HS đang đỏ do phần của repo khác." }, "t.jsonl", PEERS, never);
  assert.match(why, /Rule_Gate_89_MessageOnlyWithWork/);
  assert.match(why, /Cần <repo>: <việc>/);
});

test("the recipient addressed by its title is judged the same way", () => {
  assert.ok(judgeSendPurpose({ to: "Dept_OPS_Claude_21-10-2026", message: "FYI" }, "t.jsonl", PEERS, never));
});

test("a first line naming its work passes (Vietnamese and English)", () => {
  assert.equal(judgeSendPurpose({ to: "dept-ops-45", message: "Cần OPS: đưa header-color lên HS.\nchi tiết…" }, "t.jsonl", PEERS, never), null);
  assert.equal(judgeSendPurpose({ to: "dept-ops-45", message: "\n  Need Dept_OPS: rerun the gate" }, "t.jsonl", PEERS, never), null);
});

test("NEGATIVE: work named somewhere below the first line does not count", () => {
  assert.ok(judgeSendPurpose({ to: "dept-ops-45", message: "Báo cáo tình hình\nCần OPS: x" }, "t.jsonl", PEERS, never));
});

test("an answer to a session that wrote here passes; a uds reply, an idle subscription and a non-peer pass", () => {
  assert.equal(judgeSendPurpose({ to: "dept-ops-45", message: "Đã xong v24." }, "t.jsonl", PEERS, spoke), null);
  assert.equal(judgeSendPurpose({ to: "uds:\\\\.\\pipe\\x", message: "ok" }, "t.jsonl", PEERS, never), null);
  assert.equal(judgeSendPurpose({ to: "dept-ops-45", message: "" }, "t.jsonl", PEERS, never), null);
  assert.equal(judgeSendPurpose({ to: "worker", message: "status" }, "t.jsonl", PEERS, never), null);
});

test("the sender search reads the transcript as stored: JSON-escaped quotes, across a chunk edge", (t) => {
  const d = tempDir(t, "zemory-purpose-");
  const f = join(d, "s.jsonl");
  const line = JSON.stringify({ content: '<cross-session-message from="uds:a" from-name="Dept_OPS_Claude_21-10-2026">' }) + "\n";
  // the 4 MB chunk edge falls in the middle of the sender mark
  const pad = "x".repeat(4 * 1024 * 1024 - line.indexOf("from-name") - 8);
  writeFileSync(f, pad + line);
  const needles = ['from-name="Dept_OPS_Claude_21-10-2026"', 'from-name=\\"Dept_OPS_Claude_21-10-2026\\"'];
  assert.equal(fileHasAny(f, needles), true);
  assert.equal(fileHasAny(f, ['from-name=\\"dept-mkt-a8\\"']), false);
  assert.equal(judgeSendPurpose({ to: "dept-ops-45", message: "Đã xong." }, f, PEERS), null, "the real reader finds the sender");
  assert.equal(fileHasAny(join(d, "missing.jsonl"), needles), false);
});
