// 05-98_figure-card-tone.cjs - Rule_Gate_98_FigureCardTone: a figure card wears the tinted fill of its tone.
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const BT = String.fromCharCode(96);
const relOf = (root, abs) => path.relative(root, path.resolve(root, abs)).replace(/\\/g, "/");
const inside = (rel) => rel && !rel.startsWith("..") && !path.isAbsolute(rel);

// What the call ADDS and REMOVES for a file tool; newLines = added lines not already present (multiset, trimmed).
function edit(payload, root) {
  const tool = payload.tool_name || "";
  const ti = payload.tool_input || {};
  const abs = ti.file_path || ti.notebook_path || "";
  if (!abs || !["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(tool)) return null;
  const rel = relOf(root, abs);
  if (!inside(rel)) return null;
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
  return { tool, abs, rel, added, removed, exists, newLines };
}

// The rule's own text, capped. Folder harness (plan/28 §0d): the body of the rule's header file beside this hook. File harness: the line
// carrying its number in the rules file plus its continuation lines.
function ownRule(root) {
  try {
    // the header file is named after the rule folder (plan/28 §0p); an older copy still has RULE.md
    const own = path.join(__dirname, path.basename(__dirname) + ".md");
    const file = fs.existsSync(own) ? own : path.join(__dirname, "RULE.md");
    let lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    if (lines[0] === "---") lines = lines.slice(lines.indexOf("---", 1) + 1);
    // a bilingual law (plan/29 §11): English first, the Vietnamese half under "## Luật là gì" - the block quotes the English
    const vi = lines.findIndex((l) => /^##\s+Luật là gì\s*$/.test(l));
    if (vi > 0) lines = lines.slice(0, vi);
    const body = lines.filter((l, i) => i > 0 || l.trim()).slice(0, 30).map((l) => (l.length > 400 ? l.slice(0, 400) + "…" : l));
    return { rel: path.relative(root, file).replace(/\\/g, "/"), text: body.join("\n").trim() };
  } catch {
    return null;
  }
}
function ruleText(root, file, id) {
  try {
    const lines = fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/);
    const at = lines.findIndex((l) => l.includes(BT + id + BT) || l.startsWith(id + " "));
    if (at < 0) return "";
    const out = [lines[at]];
    for (let i = at + 1; i < lines.length && out.length < 12; i++) {
      const l = lines[i];
      if (!l.trim() || /^(- |#|\x60\x60\x60|\d{2}-\d+ |<!--)/.test(l)) break;
      out.push(l);
    }
    return out.map((l) => (l.length > 400 ? l.slice(0, 400) + "…" : l)).join("\n");
  } catch {
    return "";
  }
}
// The citation: a hook inside a renamed rule folder (plan/28 §0o) cites the folder's full name, which is always the rule's
// current name; a legacy folder or the file harness keeps "rule <id>".
function citation(id) {
  const folder = path.basename(__dirname);
  return /^(Rule|Cons)_(Gate|Keys|Core)_\d+_/.test(folder) ? folder : "rule " + id;
}
function blocked(root, policy, id, what) {
  const own = ownRule(root);
  if (own && own.text) return "BLOCKED (guard layer 1): " + citation(id) + " - " + what + "\n\nThe rule (" + own.rel + "):\n" + own.text;
  const text = ruleText(root, policy.rules_file || "", id);
  return "BLOCKED (guard layer 1): rule " + id + " - " + what + (text ? "\n\nThe rule (" + policy.rules_file + "):\n" + text : "");
}

// Rule_Gate_98_FigureCardTone: a figure card of a report wears the tinted fill of its tone - never bare glass, never a stripe.
const STYLE_EXT = /\.(css|scss|less)$/i;
// the selector ends on a figure card itself (its children - title, figure, % line, icon - are not the card)
const lastPart = (sel) => sel.split(/\s+|\s*[>+~]\s*/).filter(Boolean).pop() || "";
const CARD = /(\.kpi-card|\[data-tone)/;
const NOT_THE_CARD = /(::?before|::?after|\.kpi-title|\.kpi-main|\.kpi-percentage|\.kpi-secondary|\.avatar|\.bx\b|\bsvg\b|\.card-body|\.card-title|:hover|:focus)/;
// a fill that drops the tone: none, transparent, white, or the plain glass of the frame
const BARE = /^(none|transparent|initial|unset|inherit|#fff(fff)?|white|rgba?\(\s*255\s*,\s*255\s*,\s*255\b[^)]*\)|var\(--g-glass[\w-]*\))\s*(!important)?$/i;
// a tone shown as an edge: a coloured stripe on one side of the card
const STRIPE = /^border-(left|top|right|bottom|inline-start|inline-end|block-start|block-end)(-color|-width)?\s*:/i;
function ownUi(root) {
  for (const rel of ["frontend/config/ui.json", "config/ui.json"]) {
    try { return String(JSON.parse(fs.readFileSync(path.join(root, rel), "utf8")).style || ""); } catch { /* next */ }
  }
  return "";
}
function blocks(e, payload) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(e.added))) out.push({ sel: m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim(), body: m[2] });
  if (!out.length && e.tool === "Edit" && !/[{}]/.test(e.added) && e.exists) {
    const text = fs.readFileSync(e.abs, "utf8"), at = text.indexOf(String(payload.tool_input.old_string || ""));
    if (at >= 0) {
      const before = text.slice(0, at), open = before.lastIndexOf("{"), close = before.lastIndexOf("}");
      if (open > close) {
        const start = Math.max(before.lastIndexOf("}", open), before.lastIndexOf("*/", open) + 1, 0);
        out.push({ sel: before.slice(start + (before[start] === "}" ? 1 : 0), open).replace(/\/\*[\s\S]*?\*\//g, "").trim(), body: e.added });
      }
    }
  }
  return out;
}
function check(payload, root, policy) {
  try {
    const e = edit(payload, root);
    if (!e || !STYLE_EXT.test(e.rel) || !/sneat|glass/i.test(ownUi(root))) return null;
    const oldDecls = new Set(e.removed.split(/[;\n{}]/).map((d) => d.trim().replace(/\s+/g, " ")).filter(Boolean));
    for (const b of blocks(e, payload)) {
      for (const sel of b.sel.split(",").map((s) => s.trim()).filter(Boolean)) {
        if (sel.startsWith("@") || !CARD.test(lastPart(sel)) || NOT_THE_CARD.test(lastPart(sel))) continue;
        for (const raw of b.body.split(/;|\n/)) {
          const decl = raw.trim().replace(/\s+/g, " ");
          if (!decl || oldDecls.has(decl)) continue;
          const bg = /^background(-color|-image)?\s*:\s*(.+)$/i.exec(decl);
          if (bg && BARE.test(bg[2].trim())) {
            return blocked(root, policy, "05-98", e.rel + ": `" + sel + " { " + decl + " }` takes the tone's fill off a figure card. A " +
              "figure card wears the tinted (pastel) fill of its tone: `data-tone` on the card, `background: var(--tone-bg)` (its slot " +
              "colour at a low alpha), the words in the text colour.");
          }
          if (STRIPE.test(decl) && !/:\s*(0|none|0px)\s*(!important)?$/i.test(decl)) {
            return blocked(root, policy, "05-98", e.rel + ": `" + sel + " { " + decl + " }` shows a figure card's tone as an edge. The tone " +
              "is the card's tinted fill (`background: var(--tone-bg)`), never a stripe on one side or a border alone.");
          }
        }
      }
    }
    return null;
  } catch { return null; }
}
module.exports = { check };
