// Guards around the md↔DB round-trip under the FILE WINS doctrine (2026-07-16):
// the .md file is the source, the DB is a derived index. Sync must re-import
// hand-edits (never keep a stale index), import must not wipe DB-only state
// (archived/supersedes), and render must not silently destroy unmerged entries.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { openBrain } from "../../dist/brain/db.js";
import { addEntry, importChangelog, listEntries, renderChangelog } from "../../dist/docs/changelog.js";
import { importAll, importDoc, listToc, renderDoc, showSection } from "../../dist/docs/plan.js";
import { tempDir } from "./helpers.mjs";

test("FILE WINS: docs sync re-imports a hand-edited mirror (no stale 'kept DB source')", (t) => {
  const root = tempDir(t, "zemory-filewins-");
  const planDir = join(root, "docs", "plan");
  const rel = join("docs", "plan", "01_spec.md");
  const abs = join(planDir, "01_spec.md");
  const dbPath = join(root, "brain.db");
  mkdirSync(planDir, { recursive: true });
  writeFileSync(abs, "# Spec\n\noriginal body\n");

  importAll(root, dbPath);
  renderDoc(rel, root, dbPath); // now a GENERATED mirror on disk
  const idBefore = listToc(rel, root, dbPath)[0].id;

  // Untouched mirror → sync is a no-op: skipped, same section id (no churn).
  let synced = importAll(root, dbPath).find((d) => d.path === rel);
  assert.equal(synced.skipped, true, "unchanged mirror must not re-import");
  assert.equal(listToc(rel, root, dbPath)[0].id, idBefore, "section id stays stable");

  // Hand-edit the mirror (keeping its GENERATED header — the case the old
  // "kept DB source" branch silently ignored) → sync MUST take the file.
  writeFileSync(abs, readFileSync(abs, "utf8").replace("original body", "HAND EDITED body"));
  synced = importAll(root, dbPath).find((d) => d.path === rel);
  assert.notEqual(synced.skipped, true, "hand-edited mirror must re-import");
  assert.match(showSection(listToc(rel, root, dbPath)[0].id, dbPath).body, /HAND EDITED body/);

  // A hand-added heading becomes a real section (self-heals unsplit docs).
  writeFileSync(abs, readFileSync(abs, "utf8") + "\n## New Section\n\nadded by hand\n");
  importAll(root, dbPath);
  const toc = listToc(rel, root, dbPath).map((s) => s.heading);
  assert.deepEqual(toc, ["Spec", "New Section"]);
});

test("FILE WINS: docs sync merges hand-written changelog entries from the .md", (t) => {
  const root = tempDir(t, "zemory-chlog-filewins-");
  const agentDir = join(root, "docs", "agent");
  const md = join(agentDir, "05_CHANGES.md");
  const dbPath = join(root, "brain.db");
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(md, "# Change Log\n\n## [2026-01-01] — Seeded\n\nbody\n");

  importAll(root, dbPath);
  renderChangelog(root, md, dbPath);

  // Untouched mirror → merges nothing (no duplicate of the seeded entry).
  let r = importAll(root, dbPath).find((d) => d.kind === "changelog");
  assert.equal(r.sections, 0, "unchanged changelog merges 0");
  assert.equal(listEntries(root, dbPath).length, 1);

  // Hand-written entry appended to the mirror → sync merges it into the DB.
  writeFileSync(md, readFileSync(md, "utf8") + "\n## [2026-01-02] — Hand written\n\nby hand\n");
  r = importAll(root, dbPath).find((d) => d.kind === "changelog");
  assert.equal(r.sections, 1, "one new entry merged");
  assert.deepEqual(
    listEntries(root, dbPath).map((e) => e.title),
    ["Hand written", "Seeded"],
  );
});

test("FILE WINS: render salvages a changelog holding entries the DB lacks, but not on a routine render", (t) => {
  const root = tempDir(t, "zemory-chlog-salvage-");
  const md = join(root, "05_CHANGES.md");
  const dbPath = join(root, "brain.db");
  addEntry(root, "In DB", "body", "2026-02-01", dbPath);
  renderChangelog(root, md, dbPath);

  // Routine path: a new DB entry makes the render differ from disk — but the
  // file holds nothing unmerged, so NO .bak spam.
  addEntry(root, "Also in DB", "body", "2026-02-02", dbPath);
  renderChangelog(root, md, dbPath);
  assert.equal(readdirSync(root).filter((f) => f.includes("hand-edited")).length, 0, "no salvage churn");

  // Danger path: the file holds a hand-written entry never merged → salvage it
  // before the render overwrites (the old header-only check missed this).
  writeFileSync(md, readFileSync(md, "utf8") + "\n## [2026-02-03] — Never merged\n\nlost without salvage\n");
  renderChangelog(root, md, dbPath);
  const baks = readdirSync(root).filter((f) => f.includes("hand-edited"));
  assert.equal(baks.length, 1, "unmerged entry must be salvaged");
  assert.match(readFileSync(join(root, baks[0]), "utf8"), /Never merged/);
});

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
