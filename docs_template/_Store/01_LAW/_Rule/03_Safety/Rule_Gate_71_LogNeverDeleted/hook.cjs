// 03-71_log-never-deleted.cjs - Rule_Gate_71_LogNeverDeleted: a log is never deleted, only compressed. No flag gets past it.
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const relOf = (root, abs) => path.relative(root, path.resolve(root, abs)).replace(/\\/g, "/");

// What the call ADDS and REMOVES for a file tool; newLines = added lines not already present (multiset, trimmed).
function edit(payload, root) {
  const tool = payload.tool_name || "";
  const ti = payload.tool_input || {};
  const abs = ti.file_path || ti.notebook_path || "";
  if (!abs || !["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(tool)) return null;
  const rel = relOf(root, abs);
  let added = "", removed = "", exists = false;
  try { exists = fs.existsSync(abs); } catch { exists = false; }
  if (tool === "Write") {
    added = String(ti.content || "");
    try { removed = exists ? fs.readFileSync(abs, "utf8") : ""; } catch { removed = ""; }
  } else if (tool === "Edit") {
    added = String(ti.new_string || ""); removed = String(ti.old_string || "");
  } else if (tool === "MultiEdit") {
    for (const e of ti.edits || []) { added += "\n" + (e.new_string || ""); removed += "\n" + (e.old_string || ""); }
  } else {
    added = String(ti.new_source || "");
  }
  const seen = new Map();
  for (const l of removed.split(/\r?\n/)) { const k = l.trim(); if (k) seen.set(k, (seen.get(k) || 0) + 1); }
  const newLines = [];
  for (const l of added.split(/\r?\n/)) {
    const k = l.trim();
    if (!k) continue;
    const n = seen.get(k) || 0;
    if (n > 0) seen.set(k, n - 1); else newLines.push(l);
  }
  return { tool, abs, rel, newLines };
}

// The rule's own text (the English half of the header file beside this hook), capped.
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
function citation() {
  const folder = path.basename(__dirname);
  return /^(Rule|Cons)_(Gate|Keys|Core)_\d+_/.test(folder) ? folder : "rule 03-71";
}
// A string blocks with NO flag: there is no way around this law, the way through is to compress instead.
function blocked(root, what) {
  const own = ownRule(root);
  const way = "\nThere is no flag for this: a log is kept. Compress it instead (gzip a closed file, compress the table, journald Compress=yes).";
  return "BLOCKED (guard layer 1): " + citation() + " - " + what + way + (own && own.text ? "\n\nThe rule (" + own.rel + "):\n" + own.text : "");
}

// A log table: Log_<x> (any schema, brackets allowed), <x>_log / <x>_logs, or a table named log / logs.
const LOG_TABLE = String.raw`(?:\[?\w+\]?\.)*\[?(?:Log_\w+|\w+_[Ll]ogs?|[Ll]ogs?)\]?(?![\w.])`;
const SQL_KILL = new RegExp(String.raw`\b(?:DELETE\s+(?:TOP\s*\(\s*\d+\s*\)\s+)?(?:FROM\s+)?|TRUNCATE\s+TABLE\s+|DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?)` + LOG_TABLE, "i");
// A log path: a *.log file (rotated .log.1 / compressed .log.gz too), a logs folder, /var/log, a journal folder.
const LOG_PATH = /(\.log(\.\d+)?(\.gz)?(?![\w])|(^|[\s"'=/\\])logs?([/\\"'\s*]|$)|\/var\/log\b|[/\\]journal([/\\\s"']|$))/i;
// A command that removes or empties what it names. PowerShell aliases included (ri · rm · del · erase · rd · rmdir · clc).
const KILL_VERB = /^(?:sudo\s+(?:-\S+\s+)*)?(?:rm|rmdir|rd|del|erase|unlink|shred|truncate|git\s+rm|Remove-Item|ri|Clear-Content|clc)\b/i;
const VACUUM = /\bjournalctl\b[^\n;|&]*--vacuum-(size|time|files)\b/i;
// A file of tests may hold such SQL on purpose (the store refusing it); a path segment test/ tests/ __tests__, or a test file.
const TEST_FILE = /(^|\/)(tests?|__tests__|spec)\/|(^|\/)test_[^/]*$|[._-](test|spec)\.[a-z]+$/i;
// A DELETE route on a log path: FastAPI / Flask / Express / ASP.NET forms.
const DELETE_ROUTE = /(\.delete\(\s*["'`][^"'`]*\blogs?\b|methods\s*=\s*\[?[^\]]*["']DELETE["'][^\n]*\blogs?\b|\blogs?\b[^\n]*methods\s*=\s*\[?[^\]]*["']DELETE["']|\[HttpDelete\([^)]*\blogs?\b)/i;
const JOURNALD_CAP = /^\s*(SystemMaxUse|SystemMaxFiles|MaxRetentionSec|RuntimeMaxUse|RuntimeMaxFiles)\s*=/;
const LOGROTATE_DROP = /^\s*(rotate\s+\d+|maxage\s+\d+)\b/;

function judgeCommand(cmd) {
  if (VACUUM.test(cmd)) return "`journalctl --vacuum-*` throws old journal lines away";
  if (SQL_KILL.test(cmd)) return "this SQL deletes, truncates or drops a log table";
  // each piece of a compound command on its own: `cd x && rm app.log`, a pipe, a script line
  for (const raw of cmd.split(/\r?\n|;|&&|\|\||\|/)) {
    const seg = raw.trim();
    if (KILL_VERB.test(seg) && LOG_PATH.test(seg.replace(KILL_VERB, " "))) return "`" + seg.slice(0, 160) + "` deletes or empties a log";
  }
  return null;
}

function judgeEdit(e) {
  if (TEST_FILE.test(e.rel)) return null;
  const journald = /journald\.conf(\.d\/[^/]*)?$|journald\.conf\.d\//i.test(e.rel);
  const logrotate = /(^|\/)logrotate(\.conf|\.d\/)/i.test(e.rel);
  for (const line of e.newLines) {
    if (SQL_KILL.test(line)) return e.rel + " gets SQL that deletes, truncates or drops a log table: `" + line.trim().slice(0, 160) + "`";
    if (DELETE_ROUTE.test(line)) return e.rel + " gets a DELETE route on a log: `" + line.trim().slice(0, 160) + "`";
    if (journald && JOURNALD_CAP.test(line)) return e.rel + " gets a journald limit that drops old lines: `" + line.trim() + "`";
    if (logrotate && LOGROTATE_DROP.test(line) && !/rotate\s+-1\b/.test(line)) return e.rel + " gets a logrotate count or age that drops old files: `" + line.trim() + "` (keep every file: `rotate -1` with `compress`)";
  }
  return null;
}

function check(payload, root) {
  try {
    const tool = payload.tool_name || "";
    const ti = payload.tool_input || {};
    if (tool === "Bash" || tool === "PowerShell") {
      const why = judgeCommand(String(ti.command || ""));
      return why ? blocked(root, why) : null;
    }
    const e = edit(payload, root);
    if (!e) return null;
    const why = judgeEdit(e);
    return why ? blocked(root, why) : null;
  } catch { return null; }                  // the hook failing lets the call through (Rule_Gate_61)
}
module.exports = { check };
