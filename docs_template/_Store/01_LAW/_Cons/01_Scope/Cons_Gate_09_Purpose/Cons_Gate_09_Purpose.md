---
id: Cons_9
name: purpose
version: 4
kind: content
code: 01_Scope
frame: true
---
# Cons_Gate_09_Purpose — Purpose and the highest priority

## What
Every repo states its purpose in the `Cons.md` of this frame: what the product does · for whom · which problem it solves · the
highest priority when two goals clash · what is out of scope.

## When
- A repo is set up, or its purpose or priority changes.
- Two goals clash and the agent must choose between them: read this frame first.

## Do
1. Fill the `Cons.md` of this frame from its template; set `status: written`.
2. 2–6 sentences, enough for an agent new to the repo to understand the product without reading code.
3. This frame has no `n/a`: every repo has a purpose.

## Example
- Situation: a revenue reconciliation app (point-of-sale against accounting) fills the `Cons.md` of this frame.
- ✗ Wrong: copy the template and change only the product name; the priority stays empty, so the agent cannot choose when it has to
  trade speed for completeness.
- ✓ Right: "Does: finds every gap between the point-of-sale and the accounting books, for store accountants. Highest priority:
  never lose a gap once found, even if slower. Out of scope: never correct numbers in the source systems."

## Check
- `conform` reds when `Cons.md` is missing, its `status` is not `written`, or a template mark `<…>` is left.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_86_LawLayersAgree` — the filled `Cons.md` keeps every section of the frame · `Cons.md` đã điền giữ đủ mục của khung
