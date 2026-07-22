// Navigation cost (nav-cost.ts) — the measurement behind zemory's core claim
// that an index + graph + brain beat sweeping a project blind.
//
// The point of these tests is the HONESTY CONTRACT (HP điều 12): every number
// must trace back to real bytes on disk / real rows in the brain, and a lane that
// cannot be measured must report available:false rather than invent a figure.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildNavCost, routingTableChars } from "../../dist/nav-cost.js";
import { openBrain } from "../../dist/brain/db.js";
import { tempDir } from "./helpers.mjs";

function write(root, rel, body) {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, body);
  return body.length;
}

// A tiny project: two source files that import each other, plus a harness doc.
function scaffold(t, opts = {}) {
  const root = tempDir(t, "zemory-navcost-");
  let bytes = 0;
  bytes += write(root, "backend/src/db.ts", "export const db = 1;\n" + "// filler\n".repeat(40));
  bytes += write(root, "backend/src/api.ts", 'import { db } from "./db.js";\nexport const api = db;\n');
  if (opts.docs !== false) {
    write(
      root,
      "docs/agent/03_STRUCTURE.md",
      ["# Structure", "", "## 3. Tree", "TREE".repeat(50), "", "## 4. Routing", "ROUTE".repeat(60), "", "## 5. Convention", "CONV".repeat(80), ""].join("\n"),
    );
  }
  return { root, bytes };
}

test("sweep side is the real byte count of the source tree (nothing estimated)", (t) => {
  const { root, bytes } = scaffold(t);
  const r = buildNavCost(root, { dbPath: join(root, "empty.db") });
  assert.equal(r.basis.files, 2, "both source files were walked");
  assert.equal(r.basis.sourceTokens, Math.round(bytes / 4), "sweep tokens = real chars / 4");
  assert.equal(r.locate.sweepTokens, r.basis.sourceTokens, "locate sweeps the same source tree");
});

test("routing table cost is section §4 only, not the whole structure doc", (t) => {
  const { root } = scaffold(t);
  const chars = routingTableChars(root);
  assert.ok(chars > 0, "the §4 routing table was found");
  // §4 holds ROUTE*60 = 300 chars; §3 (200) and §5 (320) must NOT be counted.
  assert.ok(chars < 400, `only §4 should be counted, got ${chars} chars`);
  assert.ok(chars > 250, `§4 body should be present, got ${chars} chars`);
});

test("routed side beats the sweep, and the ratio is derived from both", (t) => {
  const { root } = scaffold(t);
  const r = buildNavCost(root, { dbPath: join(root, "empty.db") });
  assert.equal(r.locate.available, true);
  assert.ok(r.locate.routedTokens > 0, "routed cost is a real, non-zero read");
  assert.ok(r.locate.routedTokens < r.locate.sweepTokens, "routing must be cheaper than sweeping");
  const expected = Math.round((r.locate.sweepTokens / r.locate.routedTokens) * 10) / 10;
  assert.equal(r.locate.ratio, expected, "ratio is computed from the two measured sides");
});

test("impact lane prices the graph answer, not a guess", (t) => {
  const { root } = scaffold(t);
  const r = buildNavCost(root, { dbPath: join(root, "empty.db") });
  assert.equal(r.impact.available, true);
  // db.ts has fan-in 1 (api.ts imports it) → the answer is a short path list,
  // far cheaper than opening every file to discover importers.
  assert.ok(r.impact.routedTokens < r.impact.sweepTokens);
  assert.match(r.impact.detail, /db\.ts/, "detail names the file the answer is for");
});

test("recall lane measures THIS project's prior sessions from the brain", (t) => {
  const { root } = scaffold(t);
  const dbPath = join(root, "brain.db");
  // Realistic history: enough prior text that re-reading it genuinely costs more
  // than one capped recall (see the small-history test below for the inverse).
  const body = "prior session content ".repeat(500);
  const db = openBrain(dbPath);
  try {
    db.prepare(
      "INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)",
    ).run("s1", "claude-code", "local", root, "PC-A");
    db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run(
      "s1", "m1", "user", body, "2026-01-01T00:00:00Z",
    );
    // A session belonging to ANOTHER project must not be counted.
    db.prepare(
      "INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)",
    ).run("s2", "claude-code", "local", join(root, "..", "other"), "PC-A");
    db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run(
      "s2", "m2", "user", "x".repeat(9999), "2026-01-01T00:00:00Z",
    );
  } finally {
    db.close();
  }

  const r = buildNavCost(root, { dbPath });
  assert.equal(r.basis.sessions, 1, "only this project's session counts");
  assert.equal(r.recall.sweepTokens, Math.round(body.length / 4), "sweep = this project's real message chars");
  assert.equal(r.recall.available, true);
  assert.ok(r.recall.routedTokens > 0 && r.recall.routedTokens < r.recall.sweepTokens);
});

// The metric must be willing to say "zemory is NOT the cheaper path here".
// With almost no history, re-reading it beats paying for a capped recall — a
// dishonest dashboard would still print a win. This locks that it does not.
test("tiny history: the recall lane reports a ratio below 1 rather than a fake win", (t) => {
  const { root } = scaffold(t);
  const dbPath = join(root, "brain.db");
  const db = openBrain(dbPath);
  try {
    db.prepare(
      "INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)",
    ).run("s1", "claude-code", "local", root, "PC-A");
    db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run(
      "s1", "m1", "user", "just one short line", "2026-01-01T00:00:00Z",
    );
  } finally {
    db.close();
  }
  const r = buildNavCost(root, { dbPath });
  assert.ok(r.recall.sweepTokens < r.recall.routedTokens, "re-reading a tiny history is cheaper than a recall");
  assert.ok(r.recall.ratio < 1, `ratio must honestly fall below 1, got ${r.recall.ratio}`);
});

test("fail-open: a project with no harness doc reports the lane unavailable, not a fake number", (t) => {
  const { root } = scaffold(t, { docs: false });
  const r = buildNavCost(root, { dbPath: join(root, "empty.db") });
  assert.equal(r.locate.available, false, "no 03_STRUCTURE → nothing to measure");
  assert.equal(r.locate.ratio, 0, "an unmeasurable lane must not claim a ratio");
  assert.equal(r.recall.available, false, "empty brain → no prior-context claim");
});

test("an empty/missing project yields no lanes at all (never a fabricated win)", (t) => {
  const root = join(tempDir(t, "zemory-navcost-empty-"), "does-not-exist");
  const r = buildNavCost(root, { dbPath: join(root, "empty.db") });
  assert.equal(r.basis.files, 0);
  for (const k of ["locate", "impact", "recall"]) {
    assert.equal(r[k].available, false, `${k} must be unavailable`);
    assert.equal(r[k].ratio, 0, `${k} must not report a ratio`);
  }
});
