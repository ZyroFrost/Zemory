import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { archiveChanges } from "../../dist/archive.js";
import { addEntry, importChangelog, listEntries, renderChangelog, setEntryDate } from "../../dist/docs/changelog.js";
import { renderSections } from "../../dist/docs/markdown.js";
import {
  createDoc,
  importDoc,
  listToc,
  setBody,
  showSection,
} from "../../dist/docs/plan.js";
import { tempDir } from "./helpers.mjs";

test("renderSections separates headings after edited bodies without trailing newlines", () => {
  const rendered = renderSections([
    { level: 1, heading: "First", body: "body without trailing newline" },
    { level: 2, heading: "Second", body: "next body\n" },
  ]);

  assert.equal(rendered, "# First\nbody without trailing newline\n## Second\nnext body\n");
});

test("plan edits cannot mutate a section owned by another project", (t) => {
  const base = tempDir(t, "zemory-plan-scope-");
  const projectA = join(base, "a");
  const projectB = join(base, "b");
  const relPath = join("docs", "plan", "spec.md");
  const dbPath = join(base, "brain.db");
  for (const root of [projectA, projectB]) mkdirSync(join(root, "docs", "plan"), { recursive: true });
  writeFileSync(join(projectA, relPath), "# A\noriginal-a\n");
  writeFileSync(join(projectB, relPath), "# B\noriginal-b\n");
  importDoc(join(projectA, relPath), relPath, projectA, "plan", dbPath);
  importDoc(join(projectB, relPath), relPath, projectB, "plan", dbPath);
  const sectionA = listToc(relPath, projectA, dbPath)[0].id;

  assert.equal(setBody(sectionA, "wrong project\n", projectB, dbPath), false);
  assert.equal(showSection(sectionA, dbPath).body, "original-a\n");
});

test("archive marks old changelog rows in the DB without creating a second store", (t) => {
  const root = tempDir(t, "zemory-archive-");
  const agentDir = join(root, "docs", "agent");
  const mdPath = join(agentDir, "03_CHANGES.md");
  const dbPath = join(root, "brain.db");
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(
    mdPath,
    "# Change Log\n\n" +
      Array.from({ length: 8 }, (_, i) => `## [2026-01-${String(8 - i).padStart(2, "0")}] - Entry ${8 - i}\n\n${"line\n".repeat(5)}`).join("\n"),
  );
  importChangelog(mdPath, root, dbPath);

  const result = archiveChanges({
    projectRoot: root,
    docsDir: agentDir,
    config: { docs: "docs/agent", adapters: {}, thresholds: { changes_lines: 30, changes_keep: 18 } },
    log: () => {},
  }, dbPath);
  const entries = listEntries(root, dbPath);

  assert.ok(result.moved > 0);
  assert.ok(entries.some((entry) => entry.archived === 1));
  assert.equal(existsSync(join(agentDir, "archive", "03_CHANGES_archive.md")), false);
});

test("new DB-source docs render safely inside docs", (t) => {
  const root = tempDir(t, "zemory-doc-add-");
  const dbPath = join(root, "brain.db");
  const relPath = join("docs", "plan", "new.md");

  const created = createDoc(relPath, "# New\nbody\n", root, "plan", dbPath);

  assert.equal(created.sections, 1);
  assert.equal(existsSync(join(root, relPath)), true);
  assert.throws(
    () => createDoc(join("..", "outside.md"), "# Unsafe\n", root, "plan", dbPath),
    /Unsafe docs path/,
  );
});

test("changelog supersede links are scoped and rendered", (t) => {
  const root = tempDir(t, "zemory-supersede-");
  const other = join(root, "other");
  const agentDir = join(root, "docs", "agent");
  const mdPath = join(agentDir, "03_CHANGES.md");
  const dbPath = join(root, "brain.db");
  mkdirSync(agentDir, { recursive: true });
  const first = addEntry(root, "First", "old", "2026-01-01", dbPath);
  const second = addEntry(root, "Second", "new", "2026-01-02", dbPath, first);
  renderChangelog(root, mdPath, dbPath);

  assert.equal(listEntries(root, dbPath)[0].supersedes_id, first);
  assert.equal(setEntryDate(root, second, "2026-01-03", dbPath), true);
  assert.equal(setEntryDate(other, second, "2026-01-04", dbPath), false);
  assert.match(readFileSync(mdPath, "utf8"), new RegExp(`Supersedes changelog #${first}`));
  assert.throws(
    () => addEntry(other, "Wrong", "body", "2026-01-03", dbPath, second),
    /another project/,
  );
});
