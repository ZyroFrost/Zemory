// `zemory archive` trims BOTH per-session logs. 06_CHANGES is date-ordered so it
// splits by oldest ENTRY; 05_TODO is not — done and open work are interleaved inside
// the same sections, so it splits by closed ITEM instead.
//
// Measured on the real backlog (2026-07-28) before choosing: only 3 of 19 sections
// were fully closed = 18/442 lines (4%), while the closed ITEMS were 107 of them =
// 49.6 KB = 46% of the file. Section-level archiving would have moved almost nothing.
//
// The byte threshold exists for the same reason: 05_TODO averaged 241 bytes/line vs
// 06_CHANGES' 103, so a line count under-measures it by more than 2x — and what the
// archive is buying back is context, which is bytes.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { archiveTodo } from "../../dist/docs/archive.js";

function scratch(todo, thresholds = { todo_lines: 5, todo_bytes: 50 }) {
  const root = mkdtempSync(join(tmpdir(), "ztodo-"));
  const docsDir = join(root, "docs", "agent");
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(join(docsDir, "05_TODO.md"), todo);
  return {
    ctx: { projectRoot: root, docsDir, config: { thresholds } },
    read: (rel) => readFileSync(join(docsDir, rel), "utf8"),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

const BACKLOG = `# TODO

## Nhóm A
- [x] việc đã xong
  - chi tiết của việc đã xong
- [ ] việc chưa làm
- [~] việc đang làm

## Nhóm B
> ghi chú phiên — không phải mục, phải giữ nguyên
- [x] việc xong thứ hai
- [ ] việc mở thứ hai
`;

test("archive moves closed items out and leaves open work, headings and prose in place", () => {
  const s = scratch(BACKLOG);
  try {
    const r = archiveTodo(s.ctx);
    assert.equal(r.moved, 2, "both [x] items should move");

    const active = s.read("05_TODO.md");
    assert.doesNotMatch(active, /việc đã xong/, "closed item must leave the active backlog");
    assert.doesNotMatch(active, /chi tiết của việc đã xong/, "its continuation line must go with it");
    assert.match(active, /việc chưa làm/, "open item stays");
    assert.match(active, /việc đang làm/, "in-progress item stays");
    assert.match(active, /## Nhóm A/, "headings stay even when a section loses items");
    assert.match(active, /ghi chú phiên/, "narrative prose is not an item and must stay");

    const archived = s.read(join("archive", "05_TODO.md"));
    assert.match(archived, /việc đã xong/);
    assert.match(archived, /chi tiết của việc đã xong/);
    assert.match(archived, /việc xong thứ hai/);
    assert.doesNotMatch(archived, /việc chưa làm/, "open work must never be archived");
  } finally {
    s.cleanup();
  }
});

test("under both thresholds: nothing is touched", () => {
  const s = scratch(BACKLOG, { todo_lines: 9999, todo_bytes: 9_999_999 });
  try {
    const r = archiveTodo(s.ctx);
    assert.equal(r.moved, 0);
    assert.equal(s.read("05_TODO.md"), BACKLOG, "file must be byte-identical when under threshold");
  } finally {
    s.cleanup();
  }
});

test("the BYTE threshold fires on its own — a short file with long lines still trims", () => {
  // 4 lines only, so any line-count threshold leaves it alone; the bytes say otherwise.
  const fat = `# TODO\n\n- [x] ${"x".repeat(400)}\n- [ ] còn mở\n`;
  const s = scratch(fat, { todo_lines: 9999, todo_bytes: 100 });
  try {
    const r = archiveTodo(s.ctx);
    assert.equal(r.moved, 1, "byte threshold alone must be able to trigger the archive");
    assert.match(s.read("05_TODO.md"), /còn mở/);
  } finally {
    s.cleanup();
  }
});

test("a closed item inside a fenced block is text, not an item (no false archiving)", () => {
  const fenced = `# TODO\n\n\`\`\`\n- [x] đây là ví dụ trong khối code\n\`\`\`\n\n- [ ] việc thật\n`;
  const s = scratch(fenced);
  try {
    const r = archiveTodo(s.ctx);
    assert.equal(r.moved, 0, "an item-looking line inside a fence must not be archived");
    assert.match(s.read("05_TODO.md"), /ví dụ trong khối code/);
  } finally {
    s.cleanup();
  }
});

// Mutation testing caught this gap: "archive twice" below never reaches the append
// path, because the second run has nothing to move and returns early. Replacing the
// append with a plain overwrite therefore stayed green — silently discarding every
// previously archived item. This test closes that hole by archiving a SECOND batch.
test("a later archive run APPENDS — it must not discard what was archived before", () => {
  const s = scratch(BACKLOG);
  try {
    assert.equal(archiveTodo(s.ctx).moved, 2);
    const first = s.read(join("archive", "05_TODO.md"));
    assert.match(first, /việc đã xong/);

    // New work happens, gets done, and the backlog is archived again.
    writeFileSync(
      join(s.ctx.docsDir, "05_TODO.md"),
      s.read("05_TODO.md") + "\n## Nhóm C\n- [x] việc xong ở đợt sau\n",
    );
    assert.equal(archiveTodo(s.ctx).moved, 1);

    const second = s.read(join("archive", "05_TODO.md"));
    assert.match(second, /việc xong ở đợt sau/, "the new batch is archived");
    assert.match(second, /việc đã xong/, "the FIRST batch must survive the second run");
    assert.match(second, /việc xong thứ hai/, "…all of it, not just the newest entry");
  } finally {
    s.cleanup();
  }
});

test("archiving twice is safe: the second run finds nothing left to move", () => {
  const s = scratch(BACKLOG);
  try {
    assert.equal(archiveTodo(s.ctx).moved, 2);
    assert.equal(archiveTodo(s.ctx).moved, 0, "no closed items remain, so nothing moves");
    assert.match(s.read(join("archive", "05_TODO.md")), /việc xong thứ hai/, "archive is not clobbered");
  } finally {
    s.cleanup();
  }
});
