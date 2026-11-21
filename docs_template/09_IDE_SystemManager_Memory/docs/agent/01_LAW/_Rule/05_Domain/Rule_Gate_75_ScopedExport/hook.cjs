// 05-75_scoped-export.cjs - Rule_Gate_75_ScopedExport: a backend file answer (an export) is written beside its log row.
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const BT = String.fromCharCode(96);
const relOf = (root, abs) => path.relative(root, path.resolve(root, abs)).replace(/\\/g, "/");
const inside = (rel) => rel && !rel.startsWith("..") && !path.isAbsolute(rel);

// What the call ADDS, and the whole file as it will stand after it (Write: the new content; Edit / MultiEdit: the file with the
// replacements made).
function edit(payload, root) {
  const tool = payload.tool_name || "";
  const ti = payload.tool_input || {};
  const abs = ti.file_path || "";
  if (!abs || !["Write", "Edit", "MultiEdit"].includes(tool)) return null;
  const rel = relOf(root, abs);
  if (!inside(rel)) return null;
  let before = "";
  try { before = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : ""; } catch { before = ""; }
  let added = "", after = before;
  if (tool === "Write") {
    added = String(ti.content || ""); after = added;
  } else {
    const edits = tool === "Edit" ? [ti] : ti.edits || [];
    for (const e of edits) {
      added += "\n" + String(e.new_string || "");
      after = after.split(String(e.old_string || "")).join(String(e.new_string || ""));
    }
  }
  return { rel, before, added, after };
}

// The rule's own text, capped (the header file beside this hook).
function ownRule(root) {
  try {
    const own = path.join(__dirname, path.basename(__dirname) + ".md");
    let lines = fs.readFileSync(own, "utf8").split(/\r?\n/);
    if (lines[0] === "---") lines = lines.slice(lines.indexOf("---", 1) + 1);
    const body = lines.filter((l, i) => i > 0 || l.trim()).slice(0, 30).map((l) => (l.length > 400 ? l.slice(0, 400) + "…" : l));
    return { rel: path.relative(root, own).replace(/\\/g, "/"), text: body.join("\n").trim() };
  } catch {
    return null;
  }
}
function citation(id) {
  const folder = path.basename(__dirname);
  return /^(Rule|Cons)_(Gate|Keys|Core)_\d+_/.test(folder) ? folder : "rule " + id;
}
function blocked(root, id, what) {
  const own = ownRule(root);
  return "BLOCKED (guard layer 1): " + citation(id) + " - " + what + (own && own.text ? "\n\nThe rule (" + own.rel + "):\n" + own.text : "");
}

// A source file of the backend of an app (the server that answers the page).
const BACKEND = /^(backend|server|api|services?)\/.+\.(py|ts|js|mjs|cjs|cs|go|java|kt|rb|php)$/i;
// A file answer: the header that makes the browser save the answer as a file.
const ATTACHMENT = /content-disposition[\s\S]{0,120}?attachment|attachment;\s*filename/i;
// The app's operation log written with a named action ("member_export"), or a log function of the family by its name. A logger
// of the language (log.warning, console.log("...")) does not count: it keeps no row of who exported what.
const APP_LOG = [
  /\.log\s*(\(|,)\s*["'][a-z][a-z0-9]*_[a-z0-9_]+["']/i,
  /\b(log_?operation|write_?log|audit_?log|log_?export|operation_?log)\s*\(/i,
  /\bLog_Operation\b/,
];

function check(payload, root) {
  try {
    const e = edit(payload, root);
    if (!e || !BACKEND.test(e.rel)) return null;
    if (!ATTACHMENT.test(e.added)) return null;                     // the call adds no file answer
    if (ATTACHMENT.test(e.before) && e.before.split(ATTACHMENT).length >= e.after.split(ATTACHMENT).length) return null;
    if (APP_LOG.some((re) => re.test(e.after))) return null;        // the file writes the export's log row
    return blocked(root, "05-75", e.rel + ": a file answer (" + BT + "Content-Disposition: attachment" + BT + ") with no log row of " +
      "the export in the file. An export opens a dialog (scope · columns · purpose · format), the route checks them and writes the " +
      "app's export log row BEFORE the answer - no row, no file (skill app-export §3).");
  } catch {
    return null;                                                     // the hook failing lets the call through
  }
}
module.exports = { check };
