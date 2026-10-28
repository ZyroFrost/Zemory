---
id: Cons_17
name: lessons-ledger
version: 2
kind: content
code: 03_System
frame: true
checked: [Cons_Gate_13_Architecture, Rule_Gate_01_DoneMeansRun, Rule_Keys_11_VerifyClaims, Rule_Gate_83_HarnessFromStore]
from: _Store/01_LAW/_Cons/03_System/Cons_Gate_17_LessonsLedger @v2 #541c3cba67da
---
# Cons_Gate_17_LessonsLedger — The repo's ledger of lessons

Why a part of its own: `Cons_Gate_13_Architecture` states how the system is built, not what its faults taught ·
`Rule_Gate_01_DoneMeansRun` and `Rule_Keys_11_VerifyClaims` judge one piece of work, they keep nothing for the next one. A fault
fixed once comes back when new code or a new job is written the old way; only a written rule with a check stops that.

## What
Every repo keeps, in the `Cons.md` of this frame, the lessons its own fixed faults taught: one entry `L-<n>` per lesson, each a
rule new code and operations follow, with the way a machine or a reader checks it. The ledger belongs to the repo and grows with
it; it is read before new code is written in the area a lesson covers. It has one fixed grammar, so a repo's gate script can read
it without guessing.

## When
- A fault is fixed whose cause is how code is written or how the system is run (not a one-off bad record).
- New code, a new job or a new data source is added in an area a lesson covers.

## Do
1. The entries sit under `## Lessons`, one third-level heading each: `### L-<n> — <short title>`. The frame's own sections are
   the `##` headings and never change; entries are `###`, so the ledger grows without changing the frame's shape (the guard of
   `Rule_Gate_83_HarnessFromStore` compares `##` headings only). Numbered in order, a number never reused; the digits may be
   padded (`L-001`), the same width in the whole ledger.
2. Under its heading each entry holds lines `- <key>: <value>`, keys written as the template writes them, in this order:
   - required: `Ngày` (YYYY-MM-DD) · `Sự cố đã đo` (what happened, with numbers) · `Kiểu sai` (why it was wrong) ·
     `Luật cho code mới` (condition → behaviour) · `Kiểm` · `Đã sửa ở` (file · commit);
   - optional, after them: `Vùng` — the areas of code the lesson covers, separated by ` · `, read before new code is written
     there · `Tham số` — one JSON object on one line that a static check reads (a list of exempt names, a key to require).
   A line in another form is not read by the machine; a key is never renamed.
3. The `Kiểm` line is `<kind>: <what>`, the strongest kind that works: `static` — a pattern that finds the fault in code, run in
   the repo's gate before deploy · `static-todo` — a static check planned and not built yet (a debt the gate lists) ·
   `runtime` — a test that fails on it · `judgment` — the keywords that remind a reader. Name the pattern, the test or the words.
4. A lesson replaced by a better one stays, with the line `- Thay bằng: L-<m>`; an entry is never deleted.
5. A repo with no lesson yet keeps the frame with the line `No lesson yet.` under `## Lessons`.
6. The values are written in the language of the repo's ledgers; the keys stay as written above.

## Example
- Situation: a retry for transient errors was patched in two places; a third place, the source scan, deadlocked the nightly job.
- ✗ Wrong: fix the third place and write "fixed retry in the source scan" in the changelog; next week a fourth place breaks the
  same way.
- ✓ Right: under `## Lessons`, `### L-007 — every call to a source goes through the retry wrapper`, with `- Kiểm: static: a
  direct source call outside the wrapper` and `- Vùng: sources · nightly`; the gate reds on the pattern, and the changelog entry
  of the fix names `L-007`.

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.
- `Rule_Gate_91_LessonsFirst` blocks a new changelog entry about a fix that names no lesson.
- The guard of `Rule_Gate_83_HarnessFromStore` lets entries `### L-<n>` (and the old `## L-<n>` of the first template) be added
  and removed; any other change to the `##` sections is blocked.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_91_LessonsFirst` — a fix is done only with its lesson · sửa xong phải có bài học
- Related · Liên quan: `Cons_Gate_13_Architecture` — the rules of how the system is built · luật dựng hệ thống
- Related · Liên quan: `Rule_Gate_83_HarnessFromStore` — the guard that keeps a frame's sections · guard giữ các mục của khung
