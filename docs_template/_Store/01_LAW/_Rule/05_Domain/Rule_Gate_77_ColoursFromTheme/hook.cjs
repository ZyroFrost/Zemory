// Rule_Gate_77_ColoursFromTheme - a stylesheet line that adds a colour literal is blocked (built 25/11 for the user's
// "chọn theme phải đổi toàn bộ ko chỉ cái ảnh nền ... cái này là quy luật chung cần skill và hook đầy đủ để kiểm").
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const relOf = (root, abs) => path.relative(root, path.resolve(root, abs)).replace(/\\/g, "/");
const inside = (rel) => rel && !rel.startsWith("..") && !path.isAbsolute(rel);

// What the call ADDS for a file tool: the added lines not already present (multiset, trimmed).
function edit(payload, root) {
  const tool = payload.tool_name || "";
  const ti = payload.tool_input || {};
  const abs = ti.file_path || "";
  if (!abs || !["Write", "Edit", "MultiEdit"].includes(tool)) return null;
  const rel = relOf(root, abs);
  if (!inside(rel)) return null;
  let added = "", removed = "";
  if (tool === "Write") {
    added = String(ti.content || "");
    try { removed = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : ""; } catch { removed = ""; }
  } else if (tool === "Edit") {
    added = String(ti.new_string || ""); removed = String(ti.old_string || "");
  } else {
    for (const e of ti.edits || []) { added += "\n" + (e.new_string || ""); removed += "\n" + (e.old_string || ""); }
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
  return { rel, newLines };
}

function ownRule(root) {
  try {
    const file = path.join(__dirname, path.basename(__dirname) + ".md");
    let lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    if (lines[0] === "---") lines = lines.slice(lines.indexOf("---", 1) + 1);
    const body = lines.filter((l, i) => i > 0 || l.trim()).slice(0, 30).map((l) => (l.length > 400 ? l.slice(0, 400) + "…" : l));
    return { rel: path.relative(root, file).replace(/\\/g, "/"), text: body.join("\n").trim() };
  } catch {
    return null;
  }
}

const SHEET = /\.(css|scss|sass|less)$/i;
// other people's code, built output, the design store and hand-overs are not this repo's stylesheets
const EXEMPT = [/(^|\/)(node_modules|dist|dist-shell|build|vendor|external|attic|_Design|\.claude)\//i];
const LITERAL = /#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z_-])|\b(?:rgba?|hsla?)\(\s*[\d.]/i;
const FN = /\b(?:rgba?|hsla?)\(\s*[\d.]/i;

// true = the line writes a colour of the page as a literal
function offending(line) {
  if (/theme-fixed:/i.test(line)) return false;
  const text = line.replace(/\/\*.*?\*\//g, " ").replace(/\/\*.*$/, " ").replace(/url\(\s*#[^)]*\)/gi, " ");
  if (/\.sw\[data-w/.test(text)) return false;
  let declared = false;
  for (const part of text.split(/[;{}]/)) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    const prop = part.slice(0, i).trim();
    if (!/^-?-?[a-z][a-z-]*$/i.test(prop)) continue;          // a selector with a pseudo-class, not a declaration
    declared = true;
    if (prop.startsWith("--") || /mask/i.test(prop)) continue;
    if (LITERAL.test(part.slice(i + 1))) return true;
  }
  // the next line of a value written over several lines (a shadow list): its colour functions count
  return !declared && !/\{/.test(text) && FN.test(text);
}

function check(payload, root) {
  try {
    const e = edit(payload, root);
    if (!e || !SHEET.test(e.rel) || EXEMPT.some((re) => re.test(e.rel))) return null;
    const bad = e.newLines.filter(offending);
    if (!bad.length) return null;
    const own = ownRule(root);
    const what = "a colour written as a literal in " + e.rel + ":\n" + bad.slice(0, 4).map((l) => "  " + l.trim().slice(0, 110)).join("\n") +
      "\nTake a token of the frame so the chosen tone reaches it: var(--g-accent) · rgba(var(--g-accent-rgb), .16) · var(--g-on-accent)" +
      " · var(--g-text) · rgba(var(--g-shade-rgb), .3). A colour that must not follow the tone carries /* theme-fixed: <why> */ on its line.";
    return "BLOCKED (guard layer 1): " + path.basename(__dirname) + " - " + what + (own && own.text ? "\n\nThe rule (" + own.rel + "):\n" + own.text : "");
  } catch {
    return null;
  }
}
module.exports = { check };
