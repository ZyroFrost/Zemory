#!/usr/bin/env node
// Native <-> Docker parity (docs/plan/30 §3e). zemory stands on paths - slots, the three law layers (rules,
// constitution, skills), `from:` stamps, hooks, INDEX files, region links - and the Docker path sees every one of them
// through a mount. So the check is differential: ask both installs the same question for every linked repo and every
// path-driven surface, normalise the paths, and diff. Any difference is a path bug. Plus a leak scan: no container path
// (/home/node, /host/, /app) may be stored in the Docker store - the store names paths the way the host does.
//
// The two installs NEVER run at the same time (plan/30 §0: twice the RAM - the first parallel run ran the machine out
// of memory), so the check runs in two steps, one install up at a time:
//   1. native up:  node backend/scripts/docker-parity.mjs --mode native --record <file>   [--repo <name>]
//   2. stop native, start Docker:
//                  node backend/scripts/docker-parity.mjs --mode docker --against <file> [--container <name>] [--json]
// The repos are asked one at a time. Exit 0 = every cell the same, no leak, and the cockpit answered a ping within 3 s all
// along; 1 = a difference, a leak or a slow/unanswered ping; 2 = could not run.

import { execFileSync } from "node:child_process";
import { Worker } from "node:worker_threads";
import { readFileSync, writeFileSync } from "node:fs";
import { listKnownProjects } from "../../dist/projects.js";

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const MODE = arg("--mode", "");
const PORT = Number(arg("--port", 4444));
const RECORD = arg("--record", "");
const AGAINST = arg("--against", "");
const CONTAINER = arg("--container", "zemory");
const ONLY = arg("--repo", "");
const JSON_OUT = process.argv.includes("--json");
const DOCKER_BIN = process.env.DOCKER_BIN || "docker";
if (!["native", "docker"].includes(MODE) || (!RECORD && !AGAINST)) {
  console.error("usage: docker-parity.mjs --mode native --record <file> | --mode docker --against <file>");
  process.exit(2);
}

// the same mounts docker-compose.yml declares: host prefix <-> container prefix
const PAIRS = [
  [process.env.HOST_WORKSPACE_NATIVE || "D:\\Workspace", "/host/workspace"],
  [(process.env.HOST_HOME_NATIVE || process.env.USERPROFILE || "") + "\\.claude", "/home/node/.claude"],
];
const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const canon = (s) => {
  let t = String(s).replace(/\\/g, "/");
  for (const [h, i] of PAIRS) {
    const hh = h.replace(/\\/g, "/");
    if (!hh || hh === "/.claude") continue;
    t = t.split(i).join(hh);
    t = t.replace(new RegExp(escRe(hh), "gi"), hh);
  }
  return t;
};
// values that differ between two runs of the SAME install: time, process, cache, run length
const VOLATILE = /^(ms|took|elapsed|builtAt|sig|pid|at|ts|time|updatedAt|generatedAt|lastActive|startedAt|mtime|mtimeMs|age|ageMs|now|checkedAt|cached|cache|fresh|durationMs|runtime|forced)$/i;
const order = (x, y) => {
  const a = JSON.stringify(x);
  const b = JSON.stringify(y);
  return a < b ? -1 : a > b ? 1 : 0;
};
// arrays are compared as sets: the order a directory is listed in differs between NTFS and a mount, and is no path bug
function norm(v) {
  if (Array.isArray(v)) return v.map(norm).sort(order);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v).sort()) if (!VOLATILE.test(k)) o[k] = norm(v[k]);
    return o;
  }
  return typeof v === "string" ? canon(v) : v;
}
/** leaf paths where two normalised values differ (first few) */
function diff(a, b, at = "", out = []) {
  if (out.length >= 5 || JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a && b && typeof a === "object" && typeof b === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${at}/${k}`, out);
    if (!out.length) out.push(`${at || "/"}: shape`);
    return out;
  }
  out.push(`${at || "/"}: ${JSON.stringify(a)?.slice(0, 90)} != ${JSON.stringify(b)?.slice(0, 90)}`);
  return out;
}

async function get(path) {
  const r = await fetch(`http://127.0.0.1:${PORT}${path}`, { signal: AbortSignal.timeout(300_000) });
  if (!r.ok) return { __status: r.status };
  return r.json();
}
const toContainer = (host) => {
  let t = host;
  for (const [h, i] of PAIRS) if (h && t.toLowerCase().startsWith(h.toLowerCase())) t = i + t.slice(h.length).replace(/\\/g, "/");
  return t;
};
/** stdout and exit code of one zemory command run in `root` by the install that is up */
function run(root, args) {
  const opts = { encoding: "utf8", windowsHide: true, maxBuffer: 64 << 20 };
  try {
    const out = MODE === "native"
      ? execFileSync(process.execPath, [new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), ...args], { ...opts, cwd: root })
      : execFileSync(DOCKER_BIN, ["exec", "-w", toContainer(root), CONTAINER, "zemory", ...args], { ...opts, env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
    return { out, code: 0 };
  } catch (e) {
    return { out: String(e.stdout ?? ""), code: e.status ?? -1, err: e.stdout ? undefined : String(e.message).slice(0, 200) };
  }
}
function cli(root, args) {
  const r = run(root, args);
  try {
    return JSON.parse(r.out);
  } catch {
    return { __error: (r.err ?? r.out).slice(0, 200) };
  }
}
/** a text command: its lines as a set (path-normalised by norm) plus the exit code */
function cliText(root, args) {
  const r = run(root, args);
  return { code: r.code, lines: r.out.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean), ...(r.err ? { err: r.err } : {}) };
}

const q = (root) => `?root=${encodeURIComponent(root)}`;
const SURFACES = [
  ["workspace-graph", (root) => get(`/workspace-graph${q(root)}`)],
  ["folder-tree", (root) => get(`/folder-tree${q(root)}`)],
  ["code-graph", (root) => get(`/code-graph${q(root)}`)],
  ["harness-files", (root) => get(`/harness-files${q(root)}`)],
  ["conform", (root) => cli(root, ["conform", "--json"])],
  ["gates", (root) => cli(root, ["gates", "--json"])],
  // dry run: what a sync would change in this repo, read against HS
  ["sync-check", (root) => cliText(root, ["sync", "--check"])],
];
// asked once, not per repo: which repos carry a part, and the law layers tied to it (Rule_Gate_86)
const IMPACT_PARTS = ["Rule_Gate_83_HarnessFromStore", "Rule_Gate_10_DestructiveOps", "Skill_PBI_White", "Skill_Doc_WriteStyle", "Cons_Core_106_ReportRecipients", "Struc_Repo_Dept"];

// answers of the install that is up, one repo at a time
const ping = await get("/ping").catch(() => null);
if (!ping || ping.app !== "zemory") {
  console.error(`no zemory daemon on port ${PORT} - start the ${MODE} install first`);
  process.exit(2);
}
if ((ping.runtime === "docker" ? "docker" : "native") !== MODE) {
  console.error(`port ${PORT} is served by the ${ping.runtime ?? "native"} install, not ${MODE}`);
  process.exit(2);
}
const repos = listKnownProjects().map((p) => p.root).filter((r) => !ONLY || r.toLowerCase().endsWith(ONLY.toLowerCase()));
// The cockpit must keep answering while the heavy surfaces are asked. 2026-10-22: the answers were right, but the daemon's
// event loop sat in 9p calls for minutes and the cockpit would not load - the checker measured correctness only. Now a
// ping runs every second through the whole run; one slower than PING_LIMIT_MS (or none) is a failure of its own.
const PING_LIMIT_MS = 3000;
// The pinger runs in a worker thread: this script asks the CLI through execFileSync, which blocks its own event loop -
// a pinger on that loop measured those waits as the daemon's (a "28 s" stall that the daemon's profile did not have).
const PINGER_SRC = `
const { parentPort, workerData } = require("node:worker_threads");
const pings = { n: 0, slow: 0, worst: 0, failed: 0 };
let on = true;
parentPort.on("message", (m) => { if (m === "stop") on = false; });
(async () => {
  while (on) {
    const t0 = Date.now();
    try {
      const r = await fetch("http://127.0.0.1:" + workerData.port + "/ping", { signal: AbortSignal.timeout(30000) });
      if (!r.ok) pings.failed++;
    } catch {
      pings.failed++;
    }
    const ms = Date.now() - t0;
    pings.n++;
    pings.worst = Math.max(pings.worst, ms);
    if (ms > workerData.limit) pings.slow++;
    await new Promise((r) => setTimeout(r, 1000));
  }
  parentPort.postMessage(pings);
})();
`;
const pingWorker = new Worker(PINGER_SRC, { eval: true, workerData: { port: PORT, limit: PING_LIMIT_MS } });
const pingResult = new Promise((r) => pingWorker.once("message", r));
const answers = {};
const GLOBAL = "(global)";
answers[GLOBAL] = {};
for (const part of IMPACT_PARTS) answers[GLOBAL][`impact:${part}`] = norm(cliText(repos[0], ["impact", part]));
for (const root of repos) {
  answers[root] = {};
  for (const [name, ask] of SURFACES) {
    try {
      answers[root][name] = norm(await ask(root));
    } catch (e) {
      answers[root][name] = { __error: e.message };
    }
  }
}

pingWorker.postMessage("stop");
const pings = await pingResult;
await pingWorker.terminate();
const unresponsive = pings.slow + pings.failed;
const pingLine = `cockpit responsiveness: ${pings.n} ping(s), worst ${pings.worst} ms, ${pings.slow} over ${PING_LIMIT_MS} ms, ${pings.failed} failed`;

if (RECORD) {
  console.log(`  ${pingLine}`);
  writeFileSync(RECORD, JSON.stringify({ mode: MODE, repos, answers }));
  console.log(`recorded ${MODE}: ${repos.length} repo(s) x ${SURFACES.length} surface(s) -> ${RECORD}`);
  process.exit(0);
}

const base = JSON.parse(readFileSync(AGAINST, "utf8"));
const rows = [];
for (const name of Object.keys(answers[GLOBAL])) {
  const d = diff(base.answers[GLOBAL]?.[name], answers[GLOBAL][name]);
  rows.push({ repo: GLOBAL, surface: name, same: d.length === 0, diff: d });
}
for (const root of repos) {
  for (const [name] of SURFACES) {
    const d = diff(base.answers[root]?.[name], answers[root][name]);
    rows.push({ repo: root, surface: name, same: d.length === 0, diff: d });
  }
}

// leak scan: container paths stored in the Docker store
const LEAK_SQL = `SELECT 'sessions.project_root' AS col, COUNT(*) AS n FROM sessions WHERE project_root LIKE '/home/node%' OR project_root LIKE '/host/%' OR project_root LIKE '/app/%'
UNION ALL SELECT 'sessions.cwd', COUNT(*) FROM sessions WHERE cwd LIKE '/home/node%' OR cwd LIKE '/host/%' OR cwd LIKE '/app/%'
UNION ALL SELECT 'ingest_state.file_path', COUNT(*) FROM ingest_state WHERE file_path LIKE '/home/node%' OR file_path LIKE '/host/%'`;
let leaks;
try {
  const js = `const D=require('/app/node_modules/better-sqlite3');const db=new D('/home/node/zemory/global-memory/global_memory.db',{readonly:true});console.log(JSON.stringify(db.prepare(${JSON.stringify(LEAK_SQL)}).all()))`;
  leaks = JSON.parse(execFileSync(DOCKER_BIN, ["exec", CONTAINER, "node", "-e", js], { encoding: "utf8", windowsHide: true, env: { ...process.env, MSYS_NO_PATHCONV: "1" } }));
} catch (e) {
  leaks = [{ col: "leak scan", n: -1, error: String(e.message).slice(0, 160) }];
}

const bad = rows.filter((r) => !r.same);
const leaked = leaks.filter((l) => l.n !== 0);
if (JSON_OUT) {
  console.log(JSON.stringify({ rows, leaks, pings }, null, 2));
} else {
  const names = SURFACES.map(([n]) => n);
  console.log(`docker parity - ${repos.length} repo(s) x ${names.length} surface(s) + ${IMPACT_PARTS.length} impact(s), docker vs ${AGAINST}`);
  const g = rows.filter((r) => r.repo === GLOBAL);
  console.log(`  ${"impact".padEnd(22)} ${g.map((r) => `${r.surface.slice(7)}:${r.same ? "ok" : "DIFF"}`).join("  ")}`);
  for (const root of repos) {
    const cells = names.map((n) => (rows.find((r) => r.repo === root && r.surface === n)?.same ? "ok" : "DIFF"));
    console.log(`  ${root.split(/[\\/]/).pop().padEnd(22)} ${cells.map((c, i) => `${names[i]}:${c}`).join("  ")}`);
  }
  for (const r of bad) console.log(`\n  DIFF ${r.repo} · ${r.surface}\n    ${r.diff.join("\n    ")}`);
  console.log(`\n  store leak scan: ${leaks.map((l) => `${l.col}=${l.n}`).join(" · ")}`);
  console.log(`  ${pingLine}`);
  console.log(bad.length || leaked.length || unresponsive
    ? `\n  ✗ ${bad.length} difference(s), ${leaked.length} leak(s), ${unresponsive} slow or unanswered ping(s)`
    : "\n  ✓ every cell the same, no leak, the cockpit kept answering");
}
process.exitCode = bad.length || leaked.length || unresponsive ? 1 : 0;
