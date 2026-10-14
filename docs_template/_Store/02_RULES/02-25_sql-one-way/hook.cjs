// 02-25 SQL one way - a store part (plan/28 §0n). guard.cjs calls check(); the settings live in policy.json (sql).
// A NEW SQL string written straight into code is blocked at write time. If the same query already has a name in a
// `store/queries.*` file the message names it; if not, the agent is told to add ONE named entry there. Comparison is
// case- and whitespace-insensitive. Only SQL that the edit ADDS is judged. Inactive until the repo has at least one store
// file (policy.sql is written only then). The block message carries the rule text from RULE.md next to this file. Every
// failure of the hook itself lets the action through (a broken hook must not block blindly).
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const BT = String.fromCharCode(96);
const norm = (s) => String(s).replace(/\s+/g, " ").trim().toLowerCase();
const LITERAL = () => new RegExp("\\.prepare\\(\\s*([\"'" + BT + "])([\\s\\S]*?)\\1\\s*,?\\s*\\)", "g");
const NAMED = () => new RegExp("^\\s*(\\w+):\\s*([\"'" + BT + "])([\\s\\S]*?)\\2,\\s*$", "gm");

function literals(text) {
  const out = [];
  for (const m of String(text || "").matchAll(LITERAL())) out.push(m[2]);
  return out;
}

function namedQueries(root, stores) {
  const out = new Map();
  for (const rel of stores || []) {
    let txt = "";
    try { txt = fs.readFileSync(path.join(root, rel), "utf8"); } catch { continue; }
    for (const m of txt.matchAll(NAMED())) if (!out.has(norm(m[3]))) out.set(norm(m[3]), { name: m[1], store: rel });
  }
  return out;
}

// The rule's own text: the body of RULE.md beside this file (front matter dropped), capped.
function ruleText(root) {
  try {
    const file = path.join(__dirname, "RULE.md");
    let lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    if (lines[0] === "---") lines = lines.slice(lines.indexOf("---", 1) + 1);
    const body = lines.filter((l, i) => i > 0 || l.trim()).slice(0, 20);
    const rel = path.relative(root, file).replace(/\\/g, "/");
    return { rel, text: body.map((l) => (l.length > 400 ? l.slice(0, 400) + "…" : l)).join("\n").trim() };
  } catch {
    return { rel: "", text: "" };
  }
}

function check(payload, root, policy) {
  try {
    const sql = policy && policy.sql;
    if (!sql || !Array.isArray(sql.stores) || sql.stores.length === 0) return null;
    const tool = payload.tool_name || "";
    if (tool !== "Write" && tool !== "Edit" && tool !== "MultiEdit") return null;
    const ti = payload.tool_input || {};
    const abs = ti.file_path || "";
    if (!abs) return null;
    const rel = path.relative(root, path.resolve(root, abs)).replace(/\\/g, "/");
    if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
    if (!(sql.code_ext || []).some((e) => rel.toLowerCase().endsWith(e))) return null;
    if ((sql.exclude || []).some((p) => rel.startsWith(p))) return null;
    if (/(^|\/)store\/queries\.[a-z]+$/i.test(rel)) return null;

    let added = "", removed = "";
    if (tool === "Write") {
      added = ti.content || "";
      const full = path.resolve(root, abs);
      try { removed = fs.existsSync(full) ? fs.readFileSync(full, "utf8") : ""; } catch { removed = ""; }
    } else if (tool === "Edit") {
      added = ti.new_string || ""; removed = ti.old_string || "";
    } else {
      for (const e of ti.edits || []) { added += "\n" + (e.new_string || ""); removed += "\n" + (e.old_string || ""); }
    }
    const before = new Map();
    for (const s of literals(removed)) before.set(norm(s), (before.get(norm(s)) || 0) + 1);
    const fresh = [];
    for (const s of literals(added)) {
      const k = norm(s);
      const n = before.get(k) || 0;
      if (n > 0) before.set(k, n - 1); else fresh.push(s);
    }
    if (fresh.length === 0) return null;

    const named = namedQueries(root, sql.stores);
    const lines = fresh.map((s) => {
      const short = norm(s).slice(0, 90);
      if (s.includes("$" + "{")) return "  - built at run time: " + short + "\n    -> assemble it inside a store file, not at the call site";
      const hit = named.get(norm(s));
      if (hit) return "  - " + short + "\n    -> ALREADY NAMED: use Q." + hit.name + " (" + hit.store + ")";
      return "  - " + short + "\n    -> not named yet: add ONE named entry to " + sql.stores[0] + " and call it by name";
    });
    const rt = ruleText(root);
    return "BLOCKED (guard layer 1): rule 02-25 - new SQL written inline in " + rel + ":\n" +
      lines.join("\n") + (rt.text ? "\n\nThe rule (" + rt.rel + "):\n" + rt.text : "");
  } catch {
    return null;
  }
}

module.exports = { check };
