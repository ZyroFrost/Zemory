// Rule_Gate_78_ScreenSizes - a browser check of an app takes its page sizes from the system's list of screens (skill
// app-screens, scripts/screens.mjs), never from a list of its own (built 27/11 for the requester's "cho t 1 list các tỉ lệ màn
// hình chính ... để mọi app dựa vào list áp vào dc ... có cổng kiểm và luật chung").
//   (1) Write / Edit: a line of code that sets a browser page's size with a number, in a file that does not take the list => blocked.
//   (2) the deploy of an app whose browser check does not take the list, or passes --widths => blocked once per session (a warning).
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const BT = String.fromCharCode(96);
const relOf = (root, abs) => path.relative(root, path.resolve(root, abs)).replace(/\\/g, "/");
const inside = (rel) => rel && !rel.startsWith("..") && !path.isAbsolute(rel);
const readOr = (f, d) => { try { return fs.readFileSync(f, "utf8"); } catch { return d; } };

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
function blocked(root, what) {
  const own = ownRule(root);
  return "BLOCKED (guard layer 1): " + path.basename(__dirname) + " - " + what + (own && own.text ? "\n\nThe rule (" + own.rel + "):\n" + own.text : "");
}
// A warning: the FIRST matching call of a session is blocked; the same call retried passes. No session id => never block.
function remindOnce(payload, root, policy, key) {
  const sid = String(payload.session_id || payload.transcript_path || "");
  if (!sid) return false;
  const file = path.join(root, (policy && policy.flags_dir) || "docs/hooks", ".seen.json");
  let all = {};
  try { all = JSON.parse(fs.readFileSync(file, "utf8")) || {}; } catch { all = {}; }
  const list = Array.isArray(all[sid]) ? all[sid] : [];
  if (list.includes(key)) return false;
  all[sid] = list.concat(key);
  const keys = Object.keys(all);
  for (const k of keys.slice(0, Math.max(0, keys.length - 50))) delete all[k];
  try { fs.writeFileSync(file, JSON.stringify(all)); } catch { return false; }
  return true;
}

// an app of the system: it pins a frame build, or it is the system manager that holds the frame
const isApp = (root) => fs.existsSync(path.join(root, "frontend", "config", "shell.json")) || fs.existsSync(path.join(root, "frontend", "shell", "CONTRACT.md"));
// a line that sets the size of a browser page
const SIZER = /setDeviceMetricsOverride|setViewportSize|set_viewport_size|\bsetViewport\s*\(|--window-size|defaultViewport|--widths\b|\bwidths\s*[:=]\s*\[|\bviewport\s*[:=]\s*\{/;
// a page size written as a number (300 - 3999 px)
const NUM = /(^|[^\w.])([3-9]\d{2}|[1-3]\d{3})(?![\w.])/;
// the file takes the list
const USES = /screens\.mjs|REQUIRED_SCREENS|\bSCREENS\b|--screens\b/;
// the shared scripts, the harness, built or scratch files are not read
const EXEMPT = [/(^|\/)docs\/agent\//, /(^|\/)\.claude\//, /(^|\/)docs_template\//, /(^|\/)node_modules\//, /(^|\/)dist\//, /(^|\/)_scratch_/,
  /(^|\/)scripts\/(screens|sneat_glass_check|report_layout_check|ui_check)\.mjs$/];
const CODE = /\.(mjs|cjs|js|ts|py|ps1|psm1|sh)$/i;
const COMMENT = /^\s*(\/\/|#|\*|\/\*|<#|--\s)/;

// (1) what the call adds to a code file, and the file as it will stand
function edit(payload, root) {
  const tool = payload.tool_name || "";
  const ti = payload.tool_input || {};
  const abs = ti.file_path || "";
  if (!abs || !["Write", "Edit", "MultiEdit"].includes(tool)) return null;
  const rel = relOf(root, abs);
  if (!inside(rel) || !CODE.test(rel) || EXEMPT.some((re) => re.test(rel))) return null;
  const full = path.resolve(root, abs);
  const before = readOr(full, "");
  let added = "", after = "";
  if (tool === "Write") { added = String(ti.content || ""); after = added; }
  else if (tool === "Edit") { added = String(ti.new_string || ""); after = before + "\n" + added; }
  else { for (const e of ti.edits || []) added += "\n" + (e.new_string || ""); after = before + "\n" + added; }
  const had = new Set(before.split(/\r?\n/).map((l) => l.trim()));
  const lines = added.split(/\r?\n/).filter((l) => l.trim() && !had.has(l.trim()) && !COMMENT.test(l));
  return { rel, lines, after };
}
function writeCheck(payload, root) {
  const e = edit(payload, root);
  if (!e) return null;
  const bad = e.lines.filter((l) => SIZER.test(l) && NUM.test(l));
  if (!bad.length || USES.test(e.after)) return null;
  return blocked(root, "a browser check sets its own page size in " + e.rel + ":\n" + bad.slice(0, 3).map((l) => "  " + l.trim().slice(0, 120)).join("\n") +
    "\nTake the sizes from the system's list (skill app-screens): " + BT + "import {REQUIRED_SCREENS, metricsOf} from './screens.mjs'" + BT +
    ", then " + BT + "for (const s of REQUIRED_SCREENS) await cmd('Emulation.setDeviceMetricsOverride', metricsOf(s))" + BT +
    ". A size the list lacks is added to the list on HS, never written in one check.");
}

// (2) the deploy: a command segment that RUNS a deploy script (as Rule_Gate_76_DeployChecksFrame reads it)
const DEPLOY = /^(?:&\s*|\.\s+)?(?:(?:powershell|pwsh)(?:\.exe)?\s+(?:-\w+(?:\s+(?!-)[^\s"']+)?\s+)*?(?:-File\s+)?|(?:bash|sh)\s+)?["']?((?:\.{0,2}[\\/])?(?:[\w.:-]+[\\/])*deploy[\w-]*\.(?:ps1|sh))\b/i;
const DRY = /\s-{1,2}(check|rollback|dryrun|dry-run|whatif|help)\b/i;
function deployRun(cmd) {
  for (const seg of String(cmd).split(/&&|\|\||[;\n|]/)) {
    const m = DEPLOY.exec(seg.trim().replace(/^cd\s+\S+\s*$/i, ""));
    if (m) return { path: m[1].replace(/^\.[\\/]/, ""), seg };
  }
  return null;
}
const kindOf = (f) => (/\.py$/i.test(f) ? "py" : /\.(ps1|psm1)$/i.test(f) ? "ps" : /\.(sh|bash)$/i.test(f) ? "sh" : "js");
function codeOf(text, kind) {
  let t = String(text || "");
  if (kind === "js") t = t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:'"`\\])\/\/.*$/gm, "$1");
  if (kind === "py") t = t.replace(/[rRbBuU]?("""|''')[\s\S]*?\1/g, "").replace(/(^|\s)#.*$/gm, "$1");
  if (kind === "ps") t = t.replace(/<#[\s\S]*?#>/g, "").replace(/(^|\s)#.*$/gm, "$1");
  if (kind === "sh") t = t.replace(/(^|\s)#.*$/gm, "$1");
  return t;
}
const SCRIPT = /((?:\.{0,2}[\\/])?(?:[\w.-]+[\\/])*[\w.-]+\.(?:mjs|py))\b/g;
const NPM = /\bnpm(?:\.cmd)?\s+(?:run\s+|run-script\s+)?([\w:.-]+)/g;
const LOOK_IN = ["", "scripts", "frontend/test", "backend/test", "backend/scripts", "test", "frontend/scripts"];
// the code the deploy runs: the script, the .mjs / .py it names or reaches through npm run, three levels down, inside the repo
function runTexts(root, script) {
  const seen = new Set([path.resolve(script)]), files = [], texts = [];
  const npmScripts = (dir) => { try { return JSON.parse(readOr(path.join(dir, "package.json"), "{}")).scripts || {}; } catch { return {}; } };
  const scan = (raw, from, kind) => {
    const text = codeOf(raw, kind);
    texts.push(text);
    let m;
    const re = new RegExp(SCRIPT.source, "g");
    while ((m = re.exec(text))) {
      const name = m[1];
      const tries = [path.resolve(from, name), path.resolve(root, name.replace(/^\.[\\/]/, ""))];
      for (const d of LOOK_IN) tries.push(path.join(root, d, path.basename(name)));
      const hit = tries.find((t) => { try { return fs.statSync(t).isFile(); } catch { return false; } });
      if (hit && !seen.has(path.resolve(hit)) && !path.relative(root, hit).startsWith("..")) { seen.add(path.resolve(hit)); files.push(hit); }
    }
    const runs = [];
    const npm = new RegExp(NPM.source, "g");
    while ((m = npm.exec(text))) runs.push(m[1]);
    for (const name of runs) for (const dir of [root, path.join(root, "frontend")]) {
      const key = "npm:" + dir + ":" + name;
      if (seen.has(key)) continue;
      seen.add(key);
      const s = npmScripts(dir)[name];
      if (typeof s === "string") scan(s, dir, "sh");
    }
  };
  scan(readOr(script, ""), path.dirname(script), kindOf(script));
  for (let depth = 0, done = 0; depth < 3; depth++) {
    const now = files.slice(done);
    done = files.length;
    for (const f of now) scan(readOr(f, ""), path.dirname(f), kindOf(f));
  }
  return { files, texts };
}
// What the deploy's check does with the screens, in one sentence; null when it takes the list and passes no list of its own.
function screenGap(root, script, seg) {
  const rel = (p) => path.relative(root, p).replace(/\\/g, "/");
  const { texts } = runTexts(root, script);
  const own = /--widths\b/.test(seg || "") || texts.some((t) => /--widths\b/.test(t));
  const takes = texts.some((t) => USES.test(t));
  if (takes && !own) return null;
  return rel(script) + (own ? " hands its browser check a list of widths of its own (--widths)" : " runs a browser check that does not take the system's list of screens (scripts/screens.mjs)") +
    ": the check measures every page on " + BT + "REQUIRED_SCREENS" + BT + " (D1 D2 D4 D9 T2 P1 P4, skill app-screens).";
}
function scriptOf(root, p) {
  const s = path.isAbsolute(p) ? p : path.join(root, p);
  if (fs.existsSync(s)) return s;
  return ["backend/scripts", "scripts", "."].map((x) => path.join(root, x, path.basename(p))).find((q) => fs.existsSync(q)) || null;
}
function deployCheck(payload, root, policy) {
  const tool = payload.tool_name || "";
  if (tool !== "Bash" && tool !== "PowerShell") return null;
  const d = deployRun(String((payload.tool_input || {}).command || ""));
  if (!d || DRY.test(d.seg)) return null;
  if (!fs.existsSync(path.join(root, "frontend", "config", "shell.json"))) return null;
  const script = scriptOf(root, d.path);
  if (!script) return null;
  const gap = screenGap(root, script, d.seg);
  if (!gap || !remindOnce(payload, root, policy, "05-78:" + relOf(root, script))) return null;
  return blocked(root, gap + " Not blocking this time: the apps move to the list one by one - retry the same call to deploy now, " +
    "and move the check to the list (skill app-screens §4).");
}

// zemory conform (rule-conform, advisory): every deploy script of an app whose check does not take the list
function conform(root) {
  try {
    if (!fs.existsSync(path.join(root, "frontend", "config", "shell.json"))) return [];
    const out = [];
    for (const dir of ["backend/scripts", "scripts", "."]) {
      let list = [];
      try { list = fs.readdirSync(path.join(root, dir)); } catch { continue; }
      for (const n of list) {
        if (!/^deploy[\w-]*\.(ps1|sh)$/i.test(n)) continue;
        const gap = screenGap(root, path.join(root, dir, n), "");
        if (gap) out.push(gap);
      }
    }
    return out;
  } catch { return []; }
}

function check(payload, root, policy) {
  try {
    if (!isApp(root)) return null;
    return writeCheck(payload, root) || deployCheck(payload, root, policy);
  } catch {
    return null;
  }
}
module.exports = { check, conform };
