// Supersede LINKING — a changelog entry that reverses an older decision must point at it,
// so a search that surfaces the OLD entry can say "this is dead".
//
// Why this gate exists: the `supersedes_id` column and its renderer shipped long ago, the
// PARSER never did. Measured 2026-08-02 on this repo: 42 entries carried a `🔄 Supersede:`
// clause and 0 of 204 rows had the link — the relation lived only in prose, so
// `changelog search "compression quota-safe"` returned a ruling that had been reversed six
// weeks earlier, worded as confidently as a live one.
//
// The two guards below were each earned by a WRONG link produced while building it:
//   · a bare `2026-07-29` (siblings 29e/29f exist) matched the single unsuffixed row and
//     linked Phase 3 to "Hạ ngưỡng archive" — an entry it never mentions;
//   · 29e and 29f each "superseded" the other, because a body that merely NAMES a
//     neighbouring entry's date was read as reversing it.
// Both must stay impossible: a near-miss link is worse than none, because the reader
// trusts it.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { importChangelog, searchChangelog } from "../../dist/docs/changelog.js";
import { openMemory } from "../../dist/memory/db.js";

/** date → the entry it declares it supersedes (null when unlinked). */
function linkMap(dbPath, root) {
  const db = openMemory(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT c.date AS d, t.date AS target
           FROM changelog c LEFT JOIN changelog t ON t.id = c.supersedes_id
          WHERE c.project_root=?`,
      )
      .all(root);
    return Object.fromEntries(rows.map((r) => [r.d, r.target ?? null]));
  } finally {
    db.close();
  }
}

function scratch(md) {
  const dir = mkdtempSync(join(tmpdir(), "zsup-"));
  const file = join(dir, "06_CHANGES.md");
  writeFileSync(file, md);
  const dbPath = join(dir, "t.db");
  importChangelog(file, dir, dbPath, { replace: true });
  return { dir, dbPath, links: () => linkMap(dbPath, dir) };
}

test("an exact dated key links the reversal to the decision it kills", () => {
  const s = scratch(`# Change Log

## [2026-07-30] — bỏ luật cũ
> 🔄 **Supersede:** thay [2026-07-29l] — "luật ba file" — user chốt làm trọn.

## [2026-07-29l] — luật ba file
Quyết định cũ.
`);
  assert.equal(s.links()["2026-07-30"], "2026-07-29l", "phải nối được khi mệnh đề nêu đúng khoá ngày");
});

test("a bare date is REJECTED when suffixed siblings exist (no near-miss guessing)", () => {
  const s = scratch(`# Change Log

## [2026-07-30] — đảo quyết định
> 🔄 **Supersede:** thay quyết định ngày 2026-07-29 — không nêu hậu tố.

## [2026-07-29] — entry không hậu tố
Nội dung A.

## [2026-07-29e] — entry có hậu tố
Nội dung B.
`);
  assert.equal(
    s.links()["2026-07-30"],
    null,
    "ngày trần mà hôm đó có nhiều entry ⇒ phải bỏ qua, không được bám vào cái không hậu tố",
  );
});

test("a supersede never points FORWARD in time (no cycles)", () => {
  const s = scratch(`# Change Log

## [2026-07-29e] — entry sớm hơn
> 🔄 **Supersede:** nhắc tới 2026-07-29f trong thân, nhưng KHÔNG được coi là đảo nó.

## [2026-07-29f] — entry muộn hơn
Nội dung.
`);
  const links = s.links();
  assert.equal(links["2026-07-29e"], null, "entry cũ không thể 'thay' một entry mới hơn");
  assert.notEqual(links["2026-07-29f"], "2026-07-29e", "và cặp đó không được tạo thành vòng");
});

test("search marks the superseded entry so a dead ruling cannot read as live", () => {
  const s = scratch(`# Change Log

## [2026-07-30] — hướng mới
> 🔄 **Supersede:** thay [2026-07-29l] — "nén là ưu tiên" — đổi hướng.

## [2026-07-29l] — nén là ưu tiên số một
Quyết định cũ về nén.
`);
  const hits = searchChangelog("nén ưu tiên", { project: s.dir, dbPath: s.dbPath });
  const old = hits.find((h) => h.date === "2026-07-29l");
  assert.ok(old, "phải tìm thấy entry cũ");
  assert.ok(old.supersededBy, "entry cũ phải mang cờ đã-bị-thay");
  assert.equal(old.supersededDate, "2026-07-30", "và chỉ đúng entry đã thay nó");
  const live = hits.find((h) => h.date === "2026-07-30");
  if (live) assert.equal(live.supersededBy, undefined, "entry còn sống KHÔNG được gắn cờ");
});
