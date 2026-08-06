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
  const dbPath = join(base, "memory.db");
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
  const dbPath = join(root, "memory.db");
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

test("archive tells OVER-threshold-but-unrecognised apart from under-threshold", (t) => {
  // Hai lý do "không làm gì" từng trả về CÙNG một shape, và người gọi in "under threshold"
  // cho cả hai — một cuộc điều tra thật (SasinFlow 05/08) bị dẫn sai đường vì file 947 dòng
  // trên ngưỡng 400 mà lệnh vẫn bảo "dưới ngưỡng". Test khoá đúng chỗ phân biệt đó.
  const root = tempDir(t, "zemory-archive-why-");
  const agentDir = join(root, "docs", "agent");
  const mainPath = join(agentDir, "06_CHANGES.md");
  const dbPath = join(root, "memory.db");
  mkdirSync(agentDir, { recursive: true });
  const ctx = {
    projectRoot: root,
    docsDir: agentDir,
    config: { docs: "docs/agent", adapters: {}, thresholds: { changes_lines: 30, changes_keep: 18 } },
    log: () => {},
  };

  // ① NGẮN — dưới ngưỡng, đúng nghĩa "không có gì để làm".
  writeFileSync(mainPath, "# Change Log\n\n## [2026-01-01] — one\n\nline\n");
  const short = archiveChanges(ctx, dbPath);
  assert.equal(short.moved, 0);
  assert.equal(short.skipped, "short", "under threshold ⇒ 'short'");

  // ② DÀI nhưng heading SAI KHUÔN (thiếu ngoặc vuông) — file vượt ngưỡng mà không nhận ra entry nào.
  writeFileSync(mainPath, "# Change Log\n\n" + Array.from({ length: 6 }, (_, i) => `## 2026-01-0${i + 1} — no brackets\n\n${"line\n".repeat(6)}`).join("\n"));
  const bad = archiveChanges(ctx, dbPath);
  assert.equal(bad.moved, 0);
  assert.ok(bad.activeLines > 30, "file thật sự VƯỢT ngưỡng");
  assert.equal(bad.skipped, "no-entries", "vượt ngưỡng mà không nhận ra heading ⇒ 'no-entries', KHÔNG phải 'short'");
});

test("changelog reindex from .md is searchable and project-scoped", (t) => {
  const base = tempDir(t, "zemory-ch-");
  const root = join(base, "a");
  const other = join(base, "b");
  const agentDir = join(root, "docs", "agent");
  const mainPath = join(agentDir, "06_CHANGES.md");
  const dbPath = join(base, "memory.db");
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
