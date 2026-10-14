// 02_RULES §Luật khi VIẾT "SQL — 1 CÁCH" (plan/27 §2g, user 2026-10-14): SQL lives in `<domain>/store/queries.ts`, named,
// called by name. This gate is the RATCHET for the code that predates the rule: inline SQL may only SHRINK, never grow, and a
// query that already has a name must never be written out again.
//
// Measured when the gate was born (2026-10-14): 327 inline literals, 25 groups written more than once (62 copies). The
// duplicates were moved into the store files the same day (→ 0); the 265 that remain are the baseline below.
import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const isStore = (p) => /[\\/]store[\\/]queries\.ts$/.test(p);
function tsFiles(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) tsFiles(p, out);
    else if (n.endsWith(".ts")) out.push(p);
  }
  return out;
}
const rel = (p) => relative(SRC, p).replace(/\\/g, "/");
// The SAME normalisation the guard uses: case- and whitespace-insensitive (it is what made count(*) / COUNT(*) one query).
const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();
const LITERAL = /\.prepare\(\s*(["'`])([\s\S]*?)\1\s*,?\s*\)/g;

function inlineSql() {
  const out = [];
  for (const f of tsFiles(SRC)) {
    if (isStore(f)) continue;
    const txt = readFileSync(f, "utf8");
    for (const m of txt.matchAll(LITERAL)) out.push({ file: rel(f), line: txt.slice(0, m.index).split("\n").length, sql: m[2] });
  }
  return out;
}
function namedSql() {
  const out = [];
  for (const f of tsFiles(SRC)) {
    if (!isStore(f)) continue;
    for (const m of readFileSync(f, "utf8").matchAll(/^\s*(\w+):\s*(["'`])([\s\S]*?)\2,\s*$/gm)) out.push({ file: rel(f), name: m[1], sql: m[3] });
  }
  return out;
}

// Per-file count of `.prepare("<literal>")` outside the store files. Lower a number when you move SQL into a store file;
// raising one is the thing this gate exists to refuse.
const BASELINE = {
  "checks.ts": 1, "docs/adopt.ts": 1, "docs/changelog.ts": 9, "docs/plan.ts": 8, "evals/ragbench.ts": 2,
  "jobs/driveprogress.ts": 3, "jobs/fastlane.ts": 2, "memory/attachments.ts": 8, "memory/borrowcookies.ts": 5,
  "memory/channel/index.ts": 1, "memory/channel/mirrorstate.ts": 9, "memory/cloudguard.ts": 1, "memory/connections.ts": 1,
  "memory/db.ts": 7, "memory/digest.ts": 7, "memory/fetchrefs.ts": 4, "memory/filestore.ts": 11,
  "memory/graph/fitness-log.ts": 3, "memory/graph/graph-memory.ts": 1, "memory/graph/nav-cost.ts": 1, "memory/ingest.ts": 23,
  "memory/mergeprojects.ts": 2, "memory/privacy.ts": 15, "memory/projectmove.ts": 13, "memory/promote.ts": 2,
  "memory/recall.ts": 4, "memory/redact.ts": 1, "memory/relocate.ts": 1, "memory/salvage.ts": 13, "memory/scope.ts": 3,
  "memory/search.ts": 14, "memory/share.ts": 19, "memory/uplinkguard.ts": 1, "memory/vecship.ts": 20,
  "memory/vectors.ts": 30, "ui.ts": 19,
};

test("the gate can see: store files parse and inline SQL is found (a blind counter would pass everything)", () => {
  assert.ok(namedSql().length >= 20, `named queries parsed: ${namedSql().length}`);
  assert.ok(inlineSql().length >= 100, `inline literals found: ${inlineSql().length}`);
});

test("inline SQL never grows — per file, against the baseline", () => {
  const count = {};
  for (const s of inlineSql()) count[s.file] = (count[s.file] ?? 0) + 1;
  const grew = Object.entries(count).filter(([f, n]) => n > (BASELINE[f] ?? 0)).map(([f, n]) => `${f}: ${n} (baseline ${BASELINE[f] ?? 0})`);
  assert.deepEqual(grew, [], `inline SQL GREW — add the query to <domain>/store/queries.ts and call it by name:\n  ${grew.join("\n  ")}`);
});

test("a query that already has a name is never written out inline again", () => {
  const named = new Map(namedSql().map((q) => [norm(q.sql), `${q.file} → Q.${q.name}`]));
  const hits = inlineSql().filter((s) => named.has(norm(s.sql))).map((s) => `${s.file}:${s.line} → use ${named.get(norm(s.sql))}`);
  assert.deepEqual(hits, [], `inline copies of named queries:\n  ${hits.join("\n  ")}`);
});

// Measured 2026-10-14: moving a query into the store rewrote `prepare("…")` INSIDE a worker's source text (`WORKER_SRC`,
// run with `eval: true`). That text cannot import anything, so `Q` was an unbound name at run time — "Q is not defined" broke
// the Drive card while every compile and test stayed green. The named query must travel in `workerData` instead.
test("worker source text (eval: true) never references the store — it cannot import it", () => {
  const bad = [];
  for (const f of tsFiles(SRC)) {
    const txt = readFileSync(f, "utf8");
    if (!/eval:\s*true/.test(txt)) continue;
    for (const m of txt.matchAll(/const\s+\w*SRC\w*\s*=\s*`([\s\S]*?)`;/g)) {
      if (/\bQ\.\w+/.test(m[1])) bad.push(`${rel(f)}:${txt.slice(0, m.index).split("\n").length}`);
    }
  }
  assert.deepEqual(bad, [], `Q.* inside worker source text — pass the query in workerData:\n  ${bad.join("\n  ")}`);
});

test("no inline query is written twice, and no two names hold the same query", () => {
  const seen = new Map();
  for (const s of inlineSql()) {
    if (s.sql.includes("${")) continue; // built at run time — not comparable
    const k = norm(s.sql);
    seen.set(k, [...(seen.get(k) ?? []), `${s.file}:${s.line}`]);
  }
  const dupInline = [...seen.values()].filter((v) => v.length > 1).map((v) => v.join(" · "));
  assert.deepEqual(dupInline, [], `the same inline query in several places — move it into a store file:\n  ${dupInline.join("\n  ")}`);
  const byName = new Map();
  for (const q of namedSql()) byName.set(norm(q.sql), [...(byName.get(norm(q.sql)) ?? []), `${q.file}:${q.name}`]);
  const dupNamed = [...byName.values()].filter((v) => v.length > 1).map((v) => v.join(" · "));
  assert.deepEqual(dupNamed, [], `two names for one query:\n  ${dupNamed.join("\n  ")}`);
});
