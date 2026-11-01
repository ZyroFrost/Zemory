// Rule_Gate_61_HookSafetyNet - after a block that asks for the requester's permission, the agent stops and asks: every further
// action is blocked until the requester writes again. Reading stays open. a department repo, 2026-11-01: the mail gate blocked a send, the
// agent ran the same send through a script the gate did not read, and a wrong file reached the recipient.
"use strict";
const fs = require("node:fs");
const path = require("node:path");

// The rule's own text, capped: the body of the header file beside this hook, English half only.
function ownRule(root) {
  try {
    const file = path.join(__dirname, path.basename(__dirname) + ".md");
    let lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    if (lines[0] === "---") lines = lines.slice(lines.indexOf("---", 1) + 1);
    const vi = lines.findIndex((l) => /^##\s+Luật là gì\s*$/.test(l));
    if (vi > 0) lines = lines.slice(0, vi);
    const body = lines.filter((l, i) => i > 0 || l.trim()).slice(0, 30).map((l) => (l.length > 400 ? l.slice(0, 400) + "…" : l));
    return { rel: path.relative(root, file).replace(/\\/g, "/"), text: body.join("\n").trim() };
  } catch {
    return null;
  }
}

// Tools that only read: never latched, the agent may still look while it waits for the answer.
const READ_ONLY = new Set(["Read", "Glob", "Grep", "LS", "NotebookRead"]);
// A block the guard wrote, as the host records it in the tool result.
const BLOCK = /^\s*(?:PreToolUse:\w+ hook error:\s*)?BLOCKED \(guard layer 1\):\s*([^\n]*)/;
// Blocks the agent clears by doing the work right, with no permission involved: read the file first, a one-time reminder
// (retrying the same call is the answer), and the laws on how a thing is written or finished. Every other block - mail,
// delete, push, protected path, another machine, a secret, harness, a flag of any kind - asks for permission and latches.
const FIXABLE = [
  /^NOT READ IN FULL\b/,
  /^Rule_Gate_(01|02|04|24|27|29|31|35|84|85|91|92)_/,
];
const ONCE = /reminder, shown once per session/;

function resultText(c) {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((x) => (x && typeof x.text === "string" ? x.text : "")).join("\n");
  return "";
}

// A turn of the requester: a user line typed by a person - not a tool result, not a host note, not a compaction summary,
// not a local slash command echo.
function isRequesterTurn(o) {
  if (!o || o.type !== "user" || o.isMeta || o.isCompactSummary) return false;
  const c = o.message && o.message.content;
  if (typeof c === "string") return !/^\s*<(local-command|command-name|command-message|command-args)/.test(c);
  if (!Array.isArray(c)) return false;
  return c.some((p) => p && p.type === "text") && !c.some((p) => p && p.type === "tool_result");
}

// The latest permission block since the requester last wrote, or "" - read from the end of the transcript, a growing tail.
function pendingBlock(file) {
  const size = fs.statSync(file).size;
  const fd = fs.openSync(file, "r");
  try {
    for (let want = 256 * 1024; ; want *= 4) {
      const n = Math.min(size, want);
      const buf = Buffer.alloc(n);
      fs.readSync(fd, buf, 0, n, size - n);
      const lines = buf.toString("utf8").split("\n");
      if (n < size) lines.shift(); // the first line may be cut
      for (let i = lines.length - 1; i >= 0; i--) {
        if (!lines[i].trim()) continue;
        let o;
        try { o = JSON.parse(lines[i]); } catch { continue; }
        if (isRequesterTurn(o)) return "";
        const parts = o && o.type === "user" && o.message && Array.isArray(o.message.content) ? o.message.content : [];
        for (const p of parts) {
          if (!p || p.type !== "tool_result" || !p.is_error) continue;
          const t = resultText(p.content);
          const m = BLOCK.exec(t);
          if (!m || ONCE.test(t) || FIXABLE.some((re) => re.test(m[1].trim()))) continue;
          return m[1].trim().slice(0, 200);
        }
      }
      if (n >= size || want > 64 * 1024 * 1024) return ""; // no requester line found: nothing to hold on to
    }
  } finally {
    fs.closeSync(fd);
  }
}

function check(payload, root) {
  try {
    if (READ_ONLY.has(String(payload.tool_name || ""))) return null;
    // the host passes transcript_path; a gate example passes its transcript as the file .transcript.jsonl in its folder
    const file = payload.transcript_path || path.join(root, ".transcript.jsonl");
    if (!fs.existsSync(file)) return null;
    const what = pendingBlock(file);
    if (!what) return null;
    const own = ownRule(root);
    return "BLOCKED (guard layer 1): Rule_Gate_61_HookSafetyNet - a hook blocked an action earlier in this turn and has not " +
      "been answered by the user: \"" + what + "\". Stop here: no other way round it, no .allow-* flag of your own making, " +
      "no further action until the user replies. Tell the user in one line what was blocked and what needs their approval; " +
      "reading stays open." + (own && own.text ? "\n\nThe rule (" + own.rel + "):\n" + own.text : "");
  } catch {
    return null; // a failing hook lets the action through
  }
}
module.exports = { check };
