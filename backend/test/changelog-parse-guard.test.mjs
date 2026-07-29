// `parseChangelog` từng biến MỌI file .md thành "entry".
//
// Đo 2026-07-29 trên dữ liệu thật:
//  · `PBI_SasinFlow_Maintain/06_CHANGES.md` viết head dạng `## 2026-07-28 — tiêu đề` (KHÔNG
//    ngoặc) ⇒ 16 head, **0** khớp `[ngày]` ⇒ cả file rơi vào nhánh legacy "nhận mọi `##`",
//    nên các heading NẰM TRONG THÂN entry cũng thành entry, tất cả `date=NULL`.
//  · Trỏ `importChangelog` vào `plan/01_legacy_topology.md` ⇒ 5 "entry" mà thân là bảng SQL;
//    vào `05_TODO.md` ⇒ 13 "entry". Nhánh legacy không có cổng nào.
//
// Hai nửa của bản sửa: nhận ngày KHÔNG ngoặc, và gate nhánh legacy bằng H1 "Change Log"
// (đo: 5 repo thật + 2 template đều có, file khác thì không).
//
// Sau khi sửa, audit chéo trên 9 file thật: 5 changelog KHÔNG ĐỔI · PBI_Maintain 16(null=16)
// → 16(null=0) · 2 file không-phải-changelog 18 entry rác → 0.

import assert from "node:assert/strict";
import test from "node:test";
import { parseChangelog } from "../../dist/docs/changelog.js";

const BRACKET = `# Change Log

## [2026-07-29] — việc hôm nay
Thân entry.

## Một heading trong thân
Đoạn này thuộc entry trên, KHÔNG phải entry mới.

## [2026-07-28] — việc hôm qua
Thân khác.
`;

// Dạng của PBI_SasinFlow_Maintain — ngày không ngoặc, em-dash.
const BARE = `# PWB_SasinFlow_Maintain — Change Log

## 2026-07-28 — GC: truy tận gốc
Thân entry một.

## Chưa dò được
Heading trong thân — không được tính là entry.

## 2026-07-26 — Chốt ranh giới nguồn
Thân entry hai.
`;

const NOT_A_CHANGELOG = `# Bản đồ server/DB hệ cũ đang chạy

## Server
| Server | DB |
|---|---|

## Linked server
Nội dung.

## Chưa dò được
Thiếu quyền.
`;

test("dạng [ngày]: chỉ head có ngày là entry, heading trong thân bị bỏ qua", () => {
  const e = parseChangelog(BRACKET);
  assert.equal(e.length, 2);
  assert.deepEqual(e.map((x) => x.date), ["2026-07-29", "2026-07-28"]);
  assert.ok(e[0].body.includes("Một heading trong thân"), "heading trần phải nằm trong BODY");
});

test("dạng ngày KHÔNG ngoặc cũng được nhận (ca PBI_Maintain)", () => {
  const e = parseChangelog(BARE);
  assert.equal(e.length, 2, "phải ra 2 entry, không phải 3");
  assert.deepEqual(e.map((x) => x.date), ["2026-07-28", "2026-07-26"]);
  assert.equal(e.filter((x) => !x.date).length, 0, "KHÔNG được còn entry date=NULL");
  assert.match(e[0].title, /GC: truy tận gốc/u);
  assert.ok(e[0].body.includes("Chưa dò được"), "heading trần phải là BODY");
});

test("hậu tố chữ sau ngày (nhiều entry cùng ngày) vẫn nhận", () => {
  // Quy ước của zemory: 2026-07-28a/b/…/m khi một ngày có nhiều entry.
  const e = parseChangelog("# Change Log\n\n## 2026-07-28m — bản m\nthân\n\n## [2026-07-28n] — bản n\nthân\n");
  assert.deepEqual(e.map((x) => x.date), ["2026-07-28m", "2026-07-28n"]);
});

test("FILE KHÔNG PHẢI CHANGELOG ⇒ 0 entry (cổng H1)", () => {
  // Đây là ca đã xảy ra thật: plan/01_legacy_topology.md sinh 5 entry mang thân bảng SQL.
  const e = parseChangelog(NOT_A_CHANGELOG);
  assert.deepEqual(e, [], "không có H1 'Change Log' và không có head ngày ⇒ không sinh entry nào");
});

test("changelog legacy (có H1 Change Log, chưa đánh ngày) VẪN parse được", () => {
  // Nhánh legacy giữ lại có chủ đích — chỉ thêm cổng, không xoá.
  const e = parseChangelog("# Change Log\n\n## Việc chưa đánh ngày\nthân một\n\n## Việc khác\nthân hai\n");
  assert.equal(e.length, 2, "vẫn seed được changelog cũ");
  assert.equal(e.filter((x) => !x.date).length, 2, "chúng đúng là date=NULL — đó là dữ liệu, không phải rác");
});

test("H1 'Change Log' nhận mọi biến thể thật đã gặp", () => {
  for (const h1 of ["# Change Log", "# <PROJECT> — Change Log", "# SasinHarvest — Change Log", "# change log"]) {
    const e = parseChangelog(`${h1}\n\n## Việc không ngày\nthân\n`);
    assert.equal(e.length, 1, `H1 "${h1}" phải được nhận là changelog`);
  }
});

test("`## 2026 kế hoạch` KHÔNG bị nhận là head ngày", () => {
  // Ngày phải đủ yyyy-mm-dd; một con số năm trần là tiêu đề thường.
  const e = parseChangelog("# Change Log\n\n## [2026-07-29] — thật\nthân\n\n## 2026 kế hoạch\nthân\n");
  assert.equal(e.length, 1, "chỉ 1 entry — cái có ngày");
  assert.ok(e[0].body.includes("2026 kế hoạch"));
});

test("file rỗng / chỉ có H1 ⇒ 0 entry, không nổ", () => {
  assert.deepEqual(parseChangelog(""), []);
  assert.deepEqual(parseChangelog("# Change Log\n"), []);
});

test("CRLF vẫn parse đúng (bản Windows từng ra 0 entry)", () => {
  const e = parseChangelog(BARE.replace(/\n/g, "\r\n"));
  assert.equal(e.length, 2);
  assert.deepEqual(e.map((x) => x.date), ["2026-07-28", "2026-07-26"]);
});

test("head trong khối fence KHÔNG phải entry", () => {
  const e = parseChangelog("# Change Log\n\n## [2026-07-29] — thật\n```\n## 2026-07-01 — trong fence\n```\nhết\n");
  assert.equal(e.length, 1);
});
