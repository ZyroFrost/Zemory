// Rule_Gate_61_HookSafetyNet - after a block that asks for the requester's permission, the next action is stopped ONCE with a
// reminder: read back what the requester said; an approval or order for this action already given => make the flag and go on,
// none => ask. The same call retried passes. a department repo, 2026-11-01: the mail gate blocked a send, the agent ran the same
// send through a script the gate did not read. The requester, 2026-11-03: a latch until they write again made them confirm
// what they had just said - a reminder, not a latch.
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

// Tools that only read: never reminded.
const READ_ONLY = new Set(["Read", "Glob", "Grep", "LS", "NotebookRead"]);
// A block the guard wrote, as the host records it in the tool result.
const BLOCK = /^\s*(?:PreToolUse:\w+ hook error:\s*)?BLOCKED \(guard layer 1\):\s*([^\n]*)/;
// Blocks the agent clears by doing the work right, with no permission involved: read the file first, a one-time reminder
// (retrying the same call is the answer), and the laws on how a thing is written or finished. Every other block - mail,
// delete, push, protected path, another machine, a secret, harness, a flag of any kind - asks for permission.
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

// Which gate a block came from: its flag when it names one, else the law it cites, else its opening words.
function gateKey(what) {
  const flag = /\.allow-[\w-]+/.exec(what);
  if (flag) return flag[0];
  const law = /\b(?:Rule|Cons)_(?:Gate|Keys|Core)_\d+/.exec(what);
  return law ? law[0] : what.slice(0, 60);
}

// The guard blocks of a transcript line, as the full text and the words after "BLOCKED (guard layer 1):".
function guardBlocks(o) {
  const out = [];
  const parts = o && o.type === "user" && o.message && Array.isArray(o.message.content) ? o.message.content : [];
  for (const p of parts) {
    if (!p || p.type !== "tool_result" || !p.is_error) continue;
    const t = resultText(p.content);
    const m = BLOCK.exec(t);
    if (m) out.push({ text: t, what: m[1].trim() });
  }
  return out;
}

// The permission blocks of a transcript line, as { key, what }; this law's own reminders are not counted.
function blocksOf(o) {
  return guardBlocks(o)
    .filter((b) => !ONCE.test(b.text) && !/^Rule_Gate_61_/.test(b.what) && !FIXABLE.some((re) => re.test(b.what)))
    .map((b) => ({ key: gateKey(b.what), what: b.what.slice(0, 200) }));
}

// Whether a transcript line carries this law's own reminder (or the latch message of an older version).
function remindedIn(o) {
  return guardBlocks(o).some((b) => /^Rule_Gate_61_/.test(b.what));
}

// The latest permission block not yet followed by a reminder or by a line of the requester, or "". A gate whose block the
// requester already answered earlier in the session is not reminded again (the requester, 2026-11-01: the rule is applied
// once). Its flag is still made per command, before the command.
function pendingBlock(file) {
  const size = fs.statSync(file).size;
  if (size > 128 * 1024 * 1024) return "";
  const lines = fs.readFileSync(file, "utf8").split("\n");
  let open = null, closed = false, answered = false;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    // only two kinds of line matter; skip the rest without parsing
    if (!line.includes("BLOCKED (guard layer 1)") && !line.includes("\"type\":\"user\"")) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (isRequesterTurn(o)) {
      if (!open || !open.length) return "";
      closed = answered = true;
      continue;
    }
    if (!closed && remindedIn(o)) {
      // the reminder was shown after every older block: only the blocks after it are still open
      if (!open || !open.length) return "";
      closed = true;
      continue;
    }
    const found = blocksOf(o);
    if (!closed) { open = (open || []).concat(found); continue; }
    if (!answered) continue;
    for (const b of found) open = open.filter((x) => x.key !== b.key);
    if (!open.length) return "";
  }
  return open && open.length ? open[0].what : "";
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
    return "BLOCKED (guard layer 1): Rule_Gate_61_HookSafetyNet - a hook blocked an action earlier in this turn: \"" + what +
      "\". Read back what the user said in this session: they already approved or ordered this exact action => make its " +
      ".allow-* flag and go on, saying in one line what passed; nothing that covers it => ask the user in one line. Never " +
      "route round the hook (another script, tool or copy of the command).\nThis is a reminder, shown once per block: retry " +
      "the same call to continue." + (own && own.text ? "\n\nThe rule (" + own.rel + "):\n" + own.text : "");
  } catch {
    return null; // a failing hook lets the action through
  }
}
module.exports = { check };
