// Guards around the DB→md mirror round-trip: import must not wipe DB-only
// state (archived/supersedes), render must not silently destroy hand-edits.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { openBrain } from "../../dist/brain/db.js";
import { addEntry, importChangelog, listEntries, renderChangelog } from "../../dist/docs/changelog.js";
import { importDoc, renderDoc } from "../../dist/docs/plan.js";
import { tempDir } from "./helpers.mjs";

test("changelog import merges (keeps ids + archived flags); --replace wipes", (t) => {
  const root = tempDir(t, "zemory-chlog-merge-");
  const dbPath = join(root, "brain.db");
  const md = join(root, "04_CHANGES.md");

  const keepId = addEntry(root, "keep me", "active entry body", "2026-07-01", dbPath);
  const archId = addEntry(root, "old decision", "superseded body", "2026-06-01", dbPath);
  const db = openBrain(dbPath);
  db.prepare("UPDATE changelog SET archived=1 WHERE id=?").run(archId);
  db.close();

  renderChangelog(root, md, dbPath); // renders active entries only
  // Re-import of the rendered mirror must be a no-op: same entries, same ids,
  // the archived entry still archived (the old code wiped and renumbered all).
  const added = importChangelog(md, root, dbPath);
  assert.equal(added, 0);
  const rows = listEntries(root, dbPath);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((r) => r.id === keepId).archived, 0);
  assert.equal(rows.find((r) => r.id === archId).archived, 1);

  // A genuinely new hand-written entry in the .md gets merged in.
  writeFileSync(md, readFileSync(md, "utf8") + "\n## [2026-07-09] — hand-added note\n\nwritten by hand\n");
  assert.equal(importChangelog(md, root, dbPath), 1);
  assert.equal(listEntries(root, dbPath).length, 3);

  // --replace is the explicit wipe-and-reseed path: DB ends up with exactly the
  // 2 entries the .md holds (1 rendered active + 1 hand-added); archived row gone.
  const replaced = importChangelog(md, root, dbPath, { replace: true });
  assert.equal(replaced, 2);
  assert.equal(listEntries(root, dbPath).filter((r) => r.archived).length, 0);
});

test("renderDoc salvages a hand-edited mirror to .bak instead of silently overwriting", (t) => {
  const root = tempDir(t, "zemory-render-salvage-");
  const dbPath = join(root, "brain.db");
  const rel = join("docs", "plan", "01_test.md");
  const abs = join(root, rel);
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  writeFileSync(abs, "# Plan\n\noriginal body\n");

  importDoc(abs, rel, root, "plan", dbPath);
  const first = renderDoc(rel, root, dbPath);
  assert.equal(first.salvaged, null); // fresh render, nothing to protect yet

  // Hand-edit the generated mirror (the mistake the guard exists for).
  writeFileSync(abs, readFileSync(abs, "utf8") + "\nHAND EDIT that would be lost\n");
  const second = renderDoc(rel, root, dbPath);
  assert.ok(second.salvaged, "hand-edited file must be salvaged");
  assert.ok(existsSync(second.salvaged));
  assert.match(readFileSync(second.salvaged, "utf8"), /HAND EDIT that would be lost/);
  assert.doesNotMatch(readFileSync(abs, "utf8"), /HAND EDIT/); // mirror re-rendered from DB

  // Unchanged mirror → no salvage churn on the next render.
  const third = renderDoc(rel, root, dbPath);
  assert.equal(third.salvaged, null);
});
