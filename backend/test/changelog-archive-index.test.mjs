// Archiving must move an entry OUT OF THE PER-SESSION READ, not out of reach.
//
// Measured on the real repo (2026-07-28) before this fix: the changelog index held
// 12 rows, all archived=0, while 56 archived entries (07-10 → 07-27f) were absent —
// `changelog search "compress"` returned "no matches" for a word that grep found in
// docs/agent/archive/06_CHANGES.md. Cause: every reseed ran DELETE over the whole
// project, so reindexing the trimmed active file wiped the archived tier with it.
// Meanwhile plan/02 §3 promised "changelog search giữ cả active lẫn archived".
//
// The archive file is a SOURCE file — git-tracked, rebuildable-from — that simply
// lives outside docs/agent/*.md. Indexing it is ordinary derived-index behaviour.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importChangelog } from "../../dist/docs/changelog.js";
import { openMemory } from "../../dist/memory/db.js";

const ACTIVE = `# Change Log

## [2026-07-28] — việc mới nhất
Nội dung của entry đang hoạt động.

## [2026-07-27] — việc hôm qua
Chi tiết hôm qua.
`;

const ARCHIVED = `# Change Log — Archive

## [2026-07-10] — quyết định cũ về compression
Đã bỏ lane nén khỏi scope.

## [2026-07-09] — quyết định cũ hơn nữa
Nội dung cổ.
`;

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "zcharc-"));
  mkdirSync(join(dir, "archive"), { recursive: true });
  const active = join(dir, "06_CHANGES.md");
  const archived = join(dir, "archive", "06_CHANGES.md");
  writeFileSync(active, ACTIVE);
  writeFileSync(archived, ARCHIVED);
  const dbPath = join(dir, "t.db");
  // The root must be a REAL absolute path, as it always is in production: importChangelog
  // canonicalises it (see normalizeRoot), and a synthetic POSIX root like "/proj/x" gets
  // resolved against the current drive on Windows — so the row would be written under one
  // key and read back under another. The temp dir is already unique per test.
  const root = dir;
  const rows = () => {
    const db = openMemory(dbPath);
    try {
      return db
        .prepare("SELECT date, title, archived FROM changelog WHERE project_root=? ORDER BY date DESC")
        .all(root);
    } finally {
      db.close();
    }
  };
  return { active, archived, dbPath, root, rows, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("the archived tier is stamped archived=1 and the active tier stays 0", () => {
  const s = scratch();
  try {
    importChangelog(s.active, s.root, s.dbPath, { replace: true });
    importChangelog(s.archived, s.root, s.dbPath, { replace: true, archived: true });
    const rows = s.rows();
    assert.equal(rows.length, 4, "both tiers are indexed");
    assert.deepEqual(
      rows.filter((r) => r.archived === 1).map((r) => r.date).sort(),
      ["2026-07-09", "2026-07-10"],
    );
    assert.deepEqual(
      rows.filter((r) => r.archived === 0).map((r) => r.date).sort(),
      ["2026-07-27", "2026-07-28"],
    );
  } finally {
    s.cleanup();
  }
});

// This is THE regression. Reseeding the active file is what `reindex` and `archive`
// both do, routinely. If that reseed clears the whole project, every archived entry
// silently disappears from search — which is exactly what was happening in the repo.
test("reseeding the ACTIVE tier must not wipe the archived tier", () => {
  const s = scratch();
  try {
    importChangelog(s.archived, s.root, s.dbPath, { replace: true, archived: true });
    assert.equal(s.rows().filter((r) => r.archived === 1).length, 2);

    importChangelog(s.active, s.root, s.dbPath, { replace: true }); // as `reindex` does
    assert.equal(
      s.rows().filter((r) => r.archived === 1).length,
      2,
      "archived history survived a reindex of the active file",
    );
  } finally {
    s.cleanup();
  }
});

test("and the reverse: reseeding the archive must not wipe active entries", () => {
  const s = scratch();
  try {
    importChangelog(s.active, s.root, s.dbPath, { replace: true });
    importChangelog(s.archived, s.root, s.dbPath, { replace: true, archived: true });
    assert.equal(s.rows().filter((r) => r.archived === 0).length, 2);
  } finally {
    s.cleanup();
  }
});

test("reseeding is idempotent — running it twice does not duplicate rows", () => {
  const s = scratch();
  try {
    importChangelog(s.archived, s.root, s.dbPath, { replace: true, archived: true });
    importChangelog(s.archived, s.root, s.dbPath, { replace: true, archived: true });
    assert.equal(s.rows().filter((r) => r.archived === 1).length, 2, "no duplicates on re-run");
  } finally {
    s.cleanup();
  }
});

test("an archived entry is reachable by its body text (the whole point of keeping it)", () => {
  const s = scratch();
  try {
    importChangelog(s.archived, s.root, s.dbPath, { replace: true, archived: true });
    const db = openMemory(s.dbPath);
    try {
      const hit = db
        .prepare("SELECT date, archived FROM changelog WHERE project_root=? AND body LIKE '%lane nén%'")
        .get(s.root);
      assert.ok(hit, "body of an archived entry must be searchable, not just its title");
      assert.equal(hit.archived, 1);
    } finally {
      db.close();
    }
  } finally {
    s.cleanup();
  }
});
