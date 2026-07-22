import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { archiveChanges } from "../../dist/docs/archive.js";
import { importChangelog, listEntries, searchChangelog } from "../../dist/docs/changelog.js";
import { renderSections } from "../../dist/docs/markdown.js";
import { importDoc, listToc, searchSections, showSection } from "../../dist/docs/plan.js";
import { tempDir } from "./helpers.mjs";

test("renderSections separates headings after edited bodies without trailing newlines", () => {
  const rendered = renderSections([
    { level: 1, heading: "First", body: "body without trailing newline" },
    { level: 2, heading: "Second", body: "next body\n" },
  ]);

  assert.equal(rendered, "# First\nbody without trailing newline\n## Second\nnext body\n");
});

test("importDoc indexes sections per project; search + toc are project-scoped", (t) => {
  const base = tempDir(t, "zemory-plan-scope-");
  const projectA = join(base, "a");
  const projectB = join(base, "b");
  const relPath = join("docs", "plan", "spec.md");
  const dbPath = join(base, "brain.db");
  for (const root of [projectA, projectB]) mkdirSync(join(root, "docs", "plan"), { recursive: true });
  writeFileSync(join(projectA, relPath), "# A\nzsentinelalpha here\n");
  writeFileSync(join(projectB, relPath), "# B\nzsentinelbeta here\n");
  importDoc(join(projectA, relPath), relPath, projectA, "plan", dbPath);
  importDoc(join(projectB, relPath), relPath, projectB, "plan", dbPath);

  // Search scoped to A finds A's content and NOT B's.
  assert.equal(searchSections("zsentinelalpha", { project: projectA, dbPath }).length, 1);
  assert.equal(searchSections("zsentinelbeta", { project: projectA, dbPath }).length, 0);
  const sectionA = listToc(relPath, projectA, dbPath)[0].id;
  assert.match(showSection(sectionA, dbPath).body, /zsentinelalpha/);
});

test("archive moves the OLDEST changelog entries to a real file (FILE WINS, not a DB-only flag)", (t) => {
  const root = tempDir(t, "zemory-archive-");
  const agentDir = join(root, "docs", "agent");
  const mainPath = join(agentDir, "06_CHANGES.md");
  const dbPath = join(root, "brain.db");
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(
    mainPath,
    "<!-- GENERATED -->\n# Change Log\n\n---\n\n" +
      Array.from({ length: 8 }, (_, i) => `## [2026-01-${String(8 - i).padStart(2, "0")}] — Entry ${8 - i}\n\n${"line\n".repeat(5)}`).join("\n"),
  );

  const result = archiveChanges(
    {
      projectRoot: root,
      docsDir: agentDir,
      config: { docs: "docs/agent", adapters: {}, thresholds: { changes_lines: 30, changes_keep: 18 } },
      log: () => {},
    },
    dbPath,
  );

  const archivePath = join(agentDir, "archive", "06_CHANGES.md");
  assert.ok(result.moved > 0, "moved some entries");
  assert.equal(existsSync(archivePath), true, "archive is a real FILE, not a DB flag");
  const main = readFileSync(mainPath, "utf8");
  assert.ok(!main.includes("Entry 1"), "oldest entry left the main file");
  assert.ok(readFileSync(archivePath, "utf8").includes("Entry 1"), "oldest entry landed in the archive file");
  // The search index was reseeded from the trimmed main.
  assert.ok(listEntries(root, dbPath).length >= 1);
});

test("changelog reindex from .md is searchable and project-scoped", (t) => {
  const base = tempDir(t, "zemory-ch-");
  const root = join(base, "a");
  const other = join(base, "b");
  const agentDir = join(root, "docs", "agent");
  const mainPath = join(agentDir, "06_CHANGES.md");
  const dbPath = join(base, "brain.db");
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(
    mainPath,
    "# Change Log\n\n## [2026-01-02] — Zsentinelbeta feature\n\nbody\n\n## [2026-01-01] — First\n\nold\n",
  );

  assert.equal(importChangelog(mainPath, root, dbPath, { replace: true }), 2);
  assert.equal(listEntries(root, dbPath).length, 2);
  assert.equal(searchChangelog("Zsentinelbeta", { project: root, dbPath }).length, 1);
  assert.equal(searchChangelog("Zsentinelbeta", { project: other, dbPath }).length, 0);
});
