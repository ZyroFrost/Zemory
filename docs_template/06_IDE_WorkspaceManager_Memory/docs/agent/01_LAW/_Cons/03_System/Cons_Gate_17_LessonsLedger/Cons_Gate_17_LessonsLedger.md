---
id: Cons_17
name: lessons-ledger
version: 1
kind: content
code: 03_System
frame: true
checked: [Cons_Gate_13_Architecture, Rule_Gate_01_DoneMeansRun, Rule_Keys_11_VerifyClaims]
from: _Store/01_LAW/_Cons/03_System/Cons_Gate_17_LessonsLedger @v1 #295d69744d21
---
# Cons_Gate_17_LessonsLedger — The repo's ledger of lessons

Why a part of its own: `Cons_Gate_13_Architecture` states how the system is built, not what its faults taught ·
`Rule_Gate_01_DoneMeansRun` and `Rule_Keys_11_VerifyClaims` judge one piece of work, they keep nothing for the next one. A fault
fixed once comes back when new code or a new job is written the old way; only a written rule with a check stops that.

## What
Every repo keeps, in the `Cons.md` of this frame, the lessons its own fixed faults taught: one entry `L-<n>` per lesson, each a
rule new code and operations follow, with the way a machine or a reader checks it. The ledger belongs to the repo and grows with
it; it is read before new code is written in the area a lesson covers.

## When
- A fault is fixed whose cause is how code is written or how the system is run (not a one-off bad record).
- New code, a new job or a new data source is added in an area a lesson covers.

## Do
1. One entry per lesson, numbered in order, a number never reused: `## L-<n> — <short title>`.
2. Each entry holds six lines: date · incident measured (with numbers) · kind of mistake · rule for new code (condition →
   behaviour) · check · where it was fixed.
3. The check is the strongest that works: `static` — a pattern that finds the fault in code, run in the repo's gate before deploy ·
   `runtime` — a test that fails on it · `judgment` — the keywords that remind a reader. Name the pattern, the test or the words.
4. A lesson replaced by a better one stays, marked `superseded by L-<m>`; an entry is never deleted.
5. A repo with no lesson yet keeps the frame with the line `No lesson yet.` under `## Lessons`.

## Example
- Situation: a retry for transient errors was patched in two places; a third place, the source scan, deadlocked the nightly job.
- ✗ Wrong: fix the third place and write "fixed retry in the source scan" in the changelog; next week a fourth place breaks the
  same way.
- ✓ Right: `L-7 — every call to a source goes through the retry wrapper`, check `static`: a pattern finds a direct source call
  outside the wrapper and reds the gate; the changelog entry of the fix names `L-7`.

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.
- `Rule_Gate_91_LessonsFirst` blocks a new changelog entry about a fix that names no lesson.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_91_LessonsFirst` — a fix is done only with its lesson · sửa xong phải có bài học
- Related · Liên quan: `Cons_Gate_13_Architecture` — the rules of how the system is built · luật dựng hệ thống
