---
id: Cons_12
name: source-of-truth
version: 6
kind: content
code: 02_Data
frame: true
---
# Cons_Gate_12_SourceOfTruth — The source of truth

## What
Every repo states in the `Cons.md` of this frame which data is the origin, which source wins when two disagree, which layers are
derived (rebuilt, never edited by hand), which sources must match and how they are compared, and what its business terms mean.

## When
- The product reads or keeps data.
- Two sources give different numbers.
- A business term (a measure, a status, a period) is defined or its meaning changes.

## Do
1. Fill the sections of `Cons.md`: origin · when they disagree · derived · must match · definitions (a table: term · meaning ·
   identifier).
2. Definitions: one line per business term — the term · what it means · the identifier it maps to (`Rule_Gate_35_OneHome`). How
   it is calculated, reconciled and its traps go into the repo's own skill, linked both ways.
3. A term whose meaning another repo owns is not defined again: its row names that repo (a warehouse that keeps the structure
   points each business metric to the department that owns it). A repo that keeps structure only says so in this section.
4. Keeps and reads no data ⇒ `status: n/a` with the reason.

## Example
- Situation: a revenue reconciliation app fills the `Cons.md` of this frame.
- ✗ Wrong: no origin is named; when two sources disagree the agent takes the backup copy because it is faster, and the report is
  wrong for a week.
- ✓ Right: "Origin: point-of-sale data. When they disagree: the live source wins over the backup; the backup is used only when the
  live source is missing. Must match: revenue in the three systems is equal, compared by invoice number, not by amount.
  Definitions: Net revenue — revenue after discounts, before VAT — `NetRevenue`."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_35_OneHome` — one term, one name · một thuật ngữ một tên
- Related · Liên quan: `Cons_Gate_15_DataLifecycle` — how long data lives · dữ liệu sống bao lâu
