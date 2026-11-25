// 05-76_deploy-checks-frame.cjs - Rule_Gate_76_DeployChecksFrame: an app of a family deploys only through a browser check that
// loads the shared rules of its frame, and only on a frame build at or above the family's floor.
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const BT = String.fromCharCode(96);

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

// A DOOR reminder: the FIRST matching call of a session is blocked with the rule; the same call retried passes. Remembered per
// session in <hooks>/.seen.json (git-ignored, last 50 sessions). No session id to remember by => never block (fail-open).
function remindOnce(payload, root, policy, key) {
  const sid = String(payload.session_id || payload.transcript_path || "");
  if (!sid) return false;
  const file = path.join(root, policy.flags_dir || "docs/hooks", ".seen.json");
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
const ONCE = "\nThis is a warning, shown once per session for this number: retry the same call to deploy anyway.";

// Rule_Gate_76_DeployChecksFrame.
// a deploy of the app: its deploy script run, not a dry check or a rollback (those ship nothing new)
// a command segment that RUNS the script: the path first (after `&` or `.`), or handed to powershell / pwsh -File, bash, sh;
// a command that only names it (git log, cat, an editor) runs nothing
const DEPLOY = /^(?:&\s*|\.\s+)?(?:(?:powershell|pwsh)(?:\.exe)?\s+(?:-\w+(?:\s+(?!-)[^\s"']+)?\s+)*?(?:-File\s+)?|(?:bash|sh)\s+)?["']?((?:\.{0,2}[\\/])?(?:[\w.:-]+[\\/])*deploy[\w-]*\.(?:ps1|sh))\b/i;
const DRY = /\s-{1,2}(check|rollback|dryrun|dry-run|whatif|help)\b/i;
function deployRun(cmd) {
  for (const seg of String(cmd).split(/&&|\|\||[;\n|]/)) {
    const m = DEPLOY.exec(seg.trim().replace(/^cd\s+\S+\s*$/i, ""));
    if (m) return { path: m[1].replace(/^\.[\\/]/, ""), seg: seg };
  }
  return null;
}
// a switch that leaves the browser check out
const SKIP = /\s-{1,2}((?:skip|no)[-_]?(?:browser|ui|check|checks|qa|shell|gate|gates|test|tests|live)\w*)\b/i;
// (v4, the user 25/11 through Dashboard) a revert - code that brings back what a wrong change broke - ships first and is checked
// right after, on the build that shipped; it names the commit whose break it undoes, so it is never a back door for new work
const REVERT = /\s-{1,2}revert\b(?:[\s=:]+["']?([^\s"';|&]+))?/i;
// the named commit is a commit of the repo; no git here (a fixture, a copy) => not measurable, let through
function commitKnown(root, ref) {
  if (!fs.existsSync(path.join(root, ".git"))) return true;
  try {
    const r = require("node:child_process").spawnSync("git", ["-C", root, "cat-file", "-e", ref + "^{commit}"], { timeout: 4000, windowsHide: true });
    return r.error ? true : r.status === 0;
  } catch { return true; }
}
// a script a file names: a path or a bare name ending .mjs or .py (Python glues a path from pieces: the name is enough)
const SCRIPT = /((?:\.{0,2}[\\/])?(?:[\w.-]+[\\/])*[\w.-]+\.(?:mjs|py))\b/g;
const NPM = /\bnpm(?:\.cmd)?\s+(?:run\s+|run-script\s+)?([\w:.-]+)/g;
// not the check: the asset copy, the frame build, and the shared rule files themselves (their notes quote the import a check writes)
const NOT_A_CHECK = /(^|[\\/])(assets_pull|build-shell|build_shell|sneat_glass_check|report_layout_check)\.mjs$/i;
// the family's runner (the system manager's frontend/test/live-app.mjs) loads RULES, PROBES and DIALOG_RULES from the rules file it is handed
const RUNNER = /live-app\.mjs/;
const LOOK_IN = ["", "scripts", "frontend/test", "backend/test", "backend/scripts", "test", "frontend/scripts"];
const SRC_EXT = /\.(tsx|jsx|ts|js|mjs|html|vue|svelte)$/i;

const readOr = (f, d) => { try { return fs.readFileSync(f, "utf8"); } catch { return d; } };
const kindOf = (f) => (/\.py$/i.test(f) ? "py" : /\.(ps1|psm1)$/i.test(f) ? "ps" : /\.(sh|bash)$/i.test(f) ? "sh" : "js");
// the code of a file without its comments: a note that quotes an import or a script name is not the check
function codeOf(text, kind) {
  let t = String(text || "");
  if (kind === "js") t = t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:'"`\\])\/\/.*$/gm, "$1");
  if (kind === "py") t = t.replace(/[rRbBuU]?("""|''')[\s\S]*?\1/g, "").replace(/(^|\s)#.*$/gm, "$1");
  if (kind === "ps") t = t.replace(/<#[\s\S]*?#>/g, "").replace(/(^|\s)#.*$/gm, "$1");
  if (kind === "sh") t = t.replace(/(^|\s)#.*$/gm, "$1");
  return t;
}
const RUNS = /\bnode(\.exe)?\b|\bpython\d?\b|\$py\b|\buv\s+run\b|\bimport\b|\bspawn(Sync)?\b|\bexecFile(Sync)?\b|\bfork\b|\bexecPath\b|-ArgumentList|--rules\b|^\s*&\s/;
const vnum = (v) => String(v || "").split(".").map((n) => parseInt(n, 10) || 0);
function below(a, b) {
  const x = vnum(a), y = vnum(b);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0);
  return false;
}
// the browser check a deploy runs: every .mjs / .py the deploy script names or reaches through `npm run`, and what those name
// in turn, three levels down - inside the repo only; the asset copy and the shared rule files are not the check
function checkFiles(root, script) {
  const seen = new Set([path.resolve(script)]), out = [];
  const texts = [];
  const add = (abs) => {
    const k = path.resolve(abs);
    if (seen.has(k) || NOT_A_CHECK.test(k)) return;
    let ok = false;
    try { ok = fs.statSync(k).isFile(); } catch { ok = false; }
    if (!ok || path.relative(root, k).startsWith("..")) return;
    seen.add(k); out.push(k);
  };
  const npmScripts = (dir) => { try { return JSON.parse(readOr(path.join(dir, "package.json"), "{}")).scripts || {}; } catch { return {}; } };
  const scan = (raw, from, kind) => {
    const text = codeOf(raw, kind);
    texts.push(text);
    // a script is followed only where it is RUN or IMPORTED: a line that runs node / python or imports, spawns or hands a
    // path on (a test that only reads another file as text runs nothing)
    const runs = kind === "py" ? text : text.split("\n").filter((l) => RUNS.test(l)).join("\n");
    let m;
    const scripts = new RegExp(SCRIPT.source, "g");
    while ((m = scripts.exec(runs))) {
      const name = m[1];
      const tries = [path.resolve(from, name), path.resolve(root, name.replace(/^\.[\\/]/, ""))];
      for (const d of LOOK_IN) tries.push(path.join(root, d, path.basename(name)));
      const hit = tries.find((t) => fs.existsSync(t));
      if (hit) add(hit);
    }
    // a global regex is shared by every level of scan: collect the names first, then go down (each script once)
    const npmRuns = [];
    const npm = new RegExp(NPM.source, "g");
    while ((m = npm.exec(text))) npmRuns.push(m[1]);
    for (const name of npmRuns) {
      for (const dir of [root, path.join(root, "frontend")]) {
        const key = "npm:" + dir + ":" + name;
        if (seen.has(key)) continue;
        seen.add(key);
        const s = npmScripts(dir)[name];
        if (typeof s === "string") scan(s, dir, "sh");
      }
    }
  };
  scan(readOr(script, ""), path.dirname(script), kindOf(script));
  for (let depth = 0, done = 0; depth < 3; depth++) {
    const now = out.slice(done);
    done = out.length;
    for (const f of now) scan(readOr(f, ""), path.dirname(f), kindOf(f));
  }
  return { files: out, texts };
}
// the names the browser check takes from one shared rules file: import {A, B} from '…/<file>.mjs', or the file's module
// read whole (import * as x / a dynamic import) - then every name is taken
// static: import {A, B as C} from '…/<file>' · whole module: import * as x from '…/<file>' · a dynamic import of a path that
// names the file: const {A, B} = await import(…'<file>'…) takes the names it destructures
function namesFrom(texts, file) {
  const names = new Set();
  const esc = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const named = new RegExp("import\\s*\\{([^}]*)\\}\\s*from\\s*['\"][^'\"]*" + esc + "['\"]", "g");
  const whole = new RegExp("import\\s*\\*\\s*as\\s+\\w+\\s*from\\s*['\"][^'\"]*" + esc + "['\"]");
  const dyn = new RegExp("\\{([^{}]*)\\}\\s*=\\s*await\\s+import\\s*\\([^;\\n]*" + esc, "g");
  // the module bound whole (const sg = await import(… '<file>' …), or through a variable that holds its path:
  // const rulesFile = … '<file>' …; const sg = await import(pathToFileURL(rulesFile)))
  const bound = new RegExp("\\b(?:const|let|var)\\s+\\w+\\s*=\\s*await\\s+import\\s*\\([^;\\n]*" + esc);
  const pathVar = new RegExp("\\b(?:const|let|var)\\s+(\\w+)\\s*=[^;\\n]*" + esc, "g");
  const take = (list) => { for (const n of list.split(",")) { const k = n.trim().split(/\s*(?:\bas\b|:|=)\s*/)[0].trim(); if (k) names.add(k); } };
  for (const t of texts) {
    let m;
    named.lastIndex = 0;
    while ((m = named.exec(t))) take(m[1]);
    dyn.lastIndex = 0;
    while ((m = dyn.exec(t))) take(m[1]);
    if (whole.test(t) || bound.test(t)) names.add("*");
    pathVar.lastIndex = 0;
    while ((m = pathVar.exec(t))) {
      const v = m[1];
      if (new RegExp("\\b(?:const|let|var)\\s+\\w+\\s*=\\s*await\\s+import\\s*\\([^;\\n]*\\b" + v + "\\b").test(t)) names.add("*");
      const d2 = new RegExp("\\{([^{}]*)\\}\\s*=\\s*await\\s+import\\s*\\([^;\\n]*\\b" + v + "\\b", "g");
      let k;
      while ((k = d2.exec(t))) take(k[1]);
    }
  }
  return names;
}
// a report page is marked data-rp-page (skill app-report); the frontend source says whether the app has one
function hasReportPage(root) {
  const start = path.join(root, "frontend", "src");
  const stack = [start];
  let n = 0;
  while (stack.length && n < 4000) {
    const d = stack.pop();
    let list = [];
    try { list = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of list) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!/^(node_modules|dist|\.)/.test(e.name)) stack.push(p); continue; }
      if (!SRC_EXT.test(e.name)) continue;
      n++;
      if (readOr(p, "").includes("data-rp-page")) return true;
    }
  }
  return false;
}
function floorOf() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "shell_floor.json"), "utf8")) || {}; } catch { return {}; }
}
const SHARED = [
  { file: "sneat_glass_check.mjs", names: ["RULES", "PROBES", "DIALOG_RULES"], skill: "app-sneat-glass" },
  { file: "report_layout_check.mjs", names: ["RULES"], skill: "app-report", report: true },
];
// What the deploy script runs that leaves the shared rules out, in one sentence; null when it loads them all.
function loadGap(root, script) {
  const rel = (p) => path.relative(root, p).replace(/\\/g, "/");
  const { files, texts } = checkFiles(root, script);
  const report = hasReportPage(root);
  const runner = texts.some((t) => RUNNER.test(t));
  const missing = [];
  for (const s of SHARED) {
    if (s.report && !report) continue;
    const got = namesFrom(texts, s.file);
    if (got.has("*")) continue;
    // the family's runner handed the shared frame rules (by name, or through a file that imports them whole)
    if (runner && !s.report && texts.some((t) => t.includes(s.file))) continue;
    const lack = s.names.filter((n) => !got.has(n));
    if (lack.length) missing.push("scripts/" + s.file + " (" + lack.join(" · ") + ", skill " + s.skill + ")");
  }
  if (files.length && !missing.length) return null;
  const seen = files.length ? files.slice(0, 6).map(rel).join(", ") + (files.length > 6 ? ", …" : "") : "no script of a browser check";
  return rel(script) + " deploys without the shared rules of the frame: what it runs (" + seen + ") does not load " +
    missing.join(" and ") + (report ? " - the app has a report page (data-rp-page), so the report rules are required too" : "") + ".";
}
// Stopping whatever listens on a port: the deploy's check may stop another app's check halfway through, or a server the
// person runs. One statement (a pipeline continued over lines by a trailing | or backtick is one statement) that finds a
// port's owner and stops it.
const PORT_KILL = [
  /Get-NetTCPConnection\b[^\n]*\|[^\n]*\b(?:Stop-Process|taskkill|kill)\b/i,
  /\b(?:Stop-Process|taskkill)\b[^\n]*(?:Get-NetTCPConnection|OwningProcess)/i,
  /\bnetstat\b[^\n]*\|[^\n]*\b(?:taskkill|Stop-Process|kill)\b/i,
  /\bfuser\b[^\n]*\s-k\b|\bfuser\s+-k\b/,
  /\blsof\b[^\n]*-t[^\n]*-i[^\n]*\|[^\n]*\bkill\b|\bkill\b[^\n]*\$\(\s*lsof\b[^\n]*-i/,
  /\bkill-port\b/,
];
// The first statement of the deploy script or of the check it runs that stops a port's owner: "file:line"; null when none.
function portKill(root, script) {
  const rel = (p) => path.relative(root, p).replace(/\\/g, "/");
  for (const f of [script, ...checkFiles(root, script).files]) {
    const lines = codeOf(readOr(f, ""), kindOf(f)).split("\n");
    for (let i = 0; i < lines.length; i++) {
      let stmt = lines[i], j = i;
      while (/(\||`)\s*$/.test(stmt) && j + 1 < lines.length) stmt = stmt.replace(/`\s*$/, " ") + " " + lines[++j];
      if (PORT_KILL.some((re) => re.test(stmt))) return rel(f) + ":" + (i + 1);
    }
  }
  return null;
}
// zemory conform (rule-conform): the same check on the repo as it stands - every deploy script of an app that pins a frame.
function conform(root) {
  try {
    if (!fs.existsSync(path.join(root, "frontend", "config", "shell.json"))) return [];
    const out = [];
    for (const dir of ["backend/scripts", "scripts", "."]) {
      let list = [];
      try { list = fs.readdirSync(path.join(root, dir)); } catch { continue; }
      for (const n of list) {
        if (!/^deploy[\w-]*\.(ps1|sh)$/i.test(n)) continue;
        const gap = loadGap(root, path.join(root, dir, n));
        if (gap) out.push(gap);
        const kill = portKill(root, path.join(root, dir, n));
        if (kill) out.push(kill + " stops whatever listens on a port - it may be another app's check halfway through: stop only " +
          "the processes the deploy started, by id with their tree (skill app-shell-use, section 6).");
      }
    }
    return out;
  } catch { return []; }
}
function check(payload, root, policy) {
  try {
    const tool = payload.tool_name || "";
    if (tool !== "Bash" && tool !== "PowerShell") return null;
    const cmd = String((payload.tool_input || {}).command || "");
    const d = deployRun(cmd);
    if (!d || DRY.test(d.seg)) return null;
    // only an app wearing the family's frame: it pins a build in frontend/config/shell.json
    const pin = path.join(root, "frontend", "config", "shell.json");
    if (!fs.existsSync(pin)) return null;
    let script = path.isAbsolute(d.path) ? d.path : path.join(root, d.path);
    if (!fs.existsSync(script)) {
      const alt = ["backend/scripts", "scripts", "."].map((x) => path.join(root, x, path.basename(d.path))).find((p) => fs.existsSync(p));
      if (!alt) return null;
      script = alt;
    }
    const rel = (p) => path.relative(root, p).replace(/\\/g, "/");
    const skip = SKIP.exec(d.seg);
    if (skip) {
      return blocked(root, policy, "05-76", BT + "-" + skip[1] + BT + " leaves the browser check out of the deploy. A deploy of an app of the " +
        "family always runs its browser check with the shared rules of the frame; red or not checked => nothing ships. Run the deploy " +
        "without the switch.");
    }
    const rev = REVERT.exec(d.seg);
    if (rev) {
      const ref = rev[1] || "";
      if (!/^[0-9a-f]{7,40}$/i.test(ref)) {
        return blocked(root, policy, "05-76", BT + "-Revert" + BT + " names no commit. A revert ships first and is checked right after, " +
          "so it names the commit whose break it undoes: " + BT + "-Revert <commit>" + BT + ". New work, or a new fix, is checked before it ships: " +
          "run the deploy without " + BT + "-Revert" + BT + ".");
      }
      if (!commitKnown(root, ref)) {
        return blocked(root, policy, "05-76", BT + "-Revert " + ref + BT + " names no commit of this repo. Name the commit whose break " +
          "the revert undoes (" + BT + "git log" + BT + "), or run the deploy without " + BT + "-Revert" + BT + " so the check runs before it ships.");
      }
    }
    // (1) the browser check loads the shared rules
    const gap = loadGap(root, script);
    if (gap) {
      return blocked(root, policy, "05-76", gap + " Make the browser check the deploy runs import those names and evaluate them on " +
        "every page at a desktop and a phone width, both themes (skill app-shell-use §6), then deploy.");
    }
    // (2) the pinned frame build against the family's floor and its newest build
    let pinned = "";
    try { pinned = String(JSON.parse(readOr(pin, "{}")).version || ""); } catch { pinned = ""; }
    const fl = floorOf();
    if (pinned && fl.floor && below(pinned, fl.floor)) {
      return blocked(root, policy, "05-76", "frontend/config/shell.json pins frame " + pinned + ", below the family's floor " + fl.floor +
        (fl.why ? " (" + fl.why + ")" : "") + ". Move the app to frame " + (fl.latest || fl.floor) + " or newer (read its contract notes, " +
        "run the browser check), then deploy.");
    }
    if (pinned && fl.latest && below(pinned, fl.latest) && remindOnce(payload, root, policy, "05-76:latest:" + pinned + ">" + fl.latest)) {
      return blocked(root, policy, "05-76", "frontend/config/shell.json pins frame " + pinned + "; the newest build is " + fl.latest +
        ". Not blocking: this build is at or above the floor " + (fl.floor || "-") + ". Plan the move to " + fl.latest + " (skill " +
        "app-shell-use §2)." + ONCE);
    }
    return null;
  } catch { return null; }
}
module.exports = { check, conform };
