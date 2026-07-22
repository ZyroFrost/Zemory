// Docs graph — markdown reference edges + changelog supersede edges. This is a
// line-anchored PARSER, the exact class that went silently blind on CRLF before
// ("merged 0" on a full file, changelog 2026-07-16) — so every assertion here is
// a HARD equality, never `if (n === 0) return` (the green-while-broken lesson).

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { buildDocsGraph } from "../../dist/graph-docs.js";
import { tempDir } from "./helpers.mjs";

/** Harness docs with known links + a CRLF changelog with a supersede marker. */
function scaffold(t, { crlf = false } = {}) {
  const root = tempDir(t, "zemory-gdocs-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  const eol = crlf ? "\r\n" : "\n";
  writeFileSync(
    join(root, "docs", "agent", "02_RULES.md"),
    ["# Rules", "Xem [structure](03_STRUCTURE.md) va [plan](../plan/13_graph.md#§4).", "Link ngoai: [x](https://example.com) va [missing](nope.md)."].join(eol),
  );
  writeFileSync(join(root, "docs", "agent", "03_STRUCTURE.md"), ["# Structure", "Nguoc lai: [rules](02_RULES.md)."].join(eol));
  writeFileSync(join(root, "docs", "plan", "13_graph.md"), ["# Plan 13", "Than plan."].join(eol));
  // Changelog: 3 entries — the newest carries an ANCHORED supersede marker naming
  // a date with exactly ONE entry (must link) and prose mentioning "supersede"
  // with an ambiguous date (must NOT link).
  writeFileSync(
    join(root, "docs", "agent", "06_CHANGES.md"),
    [
      "# Change Log",
      "",
      "## [2026-07-20] — doi quyet dinh",
      "> 🔄 **Supersede:** thay quyet dinh cu \"(chot 2026-07-18)\".",
      "Than entry.",
      "",
      "## [2026-07-19] — entry giua",
      "Dong van xuoi nhac chu supersede va ngay 2026-07-18 — KHONG phai marker.",
      "",
      "## [2026-07-18] — quyet dinh goc",
      "Than entry goc.",
    ].join(eol),
  );
  return root;
}

test("references resolve to real docs only: exact edge set, no external/missing links", (t) => {
  const g = buildDocsGraph(scaffold(t));
  const refs = g.edges.filter((e) => e.kind === "references").map((e) => `${e.from} -> ${e.to}`).sort();
  assert.deepEqual(refs, [
    "docs/agent/02_RULES.md -> docs/agent/03_STRUCTURE.md",
    "docs/agent/02_RULES.md -> docs/plan/13_graph.md",
    "docs/agent/03_STRUCTURE.md -> docs/agent/02_RULES.md",
  ]);
  assert.equal(g.stats.docs, 4, "3 agent docs + 1 plan doc");
});

test("CRLF changelog parses IDENTICALLY to LF: same nodes, same supersede edges", (t) => {
  const lf = buildDocsGraph(scaffold(t));
  const crlf = buildDocsGraph(scaffold(t, { crlf: true }));
  // HARD equals on both variants — a dropped normalization must fail loudly.
  const changelogNodes = (g) => g.nodes.filter((n) => n.type === "changelog").length;
  assert.equal(changelogNodes(lf), 3, "three changelog entries (LF)");
  assert.equal(changelogNodes(crlf), 3, "three changelog entries (CRLF)");
  assert.equal(lf.stats.supersede, 1, "exactly one supersede edge (LF)");
  assert.equal(crlf.stats.supersede, 1, "exactly one supersede edge (CRLF)");
});

test("supersede links ONLY from the anchored marker to a unique-date target", (t) => {
  const g = buildDocsGraph(scaffold(t));
  const sup = g.edges.filter((e) => e.kind === "supersede");
  assert.equal(sup.length, 1, "prose mentioning 'supersede' must not create edges");
  assert.equal(sup[0].from, "changelog:2026-07-20#0", "edge starts at the marker entry");
  assert.equal(sup[0].to, "changelog:2026-07-18#0", "edge lands on the superseded entry");
});

test("a date shared by SEVERAL entries is ambiguous — no guessed edges", (t) => {
  const root = tempDir(t, "zemory-gdocs-amb-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(
    join(root, "docs", "agent", "06_CHANGES.md"),
    [
      "# Change Log",
      "## [2026-07-20] — dao quyet dinh",
      "> 🔄 Supersede: thay quyet dinh \"(2026-07-16)\".",
      "## [2026-07-16] — entry A",
      "a",
      "## [2026-07-16] — entry B",
      "b",
    ].join("\n"),
  );
  const g = buildDocsGraph(root);
  assert.equal(g.stats.supersede, 0, "two candidate entries for the date — the parser must not pick one");
});

test("missing docs/ folder yields an empty graph, not a throw", (t) => {
  const g = buildDocsGraph(tempDir(t, "zemory-gdocs-empty-"));
  assert.deepEqual(g.nodes, []);
  assert.deepEqual(g.edges, []);
  assert.equal(g.stats.docs, 0);
});
