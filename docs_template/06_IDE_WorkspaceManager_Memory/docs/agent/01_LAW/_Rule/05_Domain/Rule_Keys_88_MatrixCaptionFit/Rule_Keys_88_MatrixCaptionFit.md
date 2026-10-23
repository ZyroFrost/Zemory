---
id: Rule_88
name: matrix-caption-fit
version: 2
kind: action
code: 05_Domain
checked: [Rule_Keys_87_NoSilentBlankPage, Rule_Gate_84_PbipOpenCheck]
from: _Store/01_LAW/_Rule/05_Domain/Rule_Keys_88_MatrixCaptionFit @v2 #5ff08a617a73
---
# Rule_Keys_88_MatrixCaptionFit — A matrix column with a fixed width must fit the caption Desktop renders in it

## What
A table / matrix column given a fixed `columnWidth` (not Grow to fit) must be wide enough for every piece of text Desktop
will render in it on its own — including a caption Desktop adds itself, such as the 'Grand Total' subtotal row, not only
the warehouse values the builder measured. A column narrower than its own caption does not scroll or truncate with an
ellipsis: Desktop wraps the text one letter per line, since whole-word wrapping needs a word and 'Grand Total' has
nowhere to break that stays readable.

## When
- Setting a fixed `columnWidth` on a table / matrix row or column header (turning off Grow to fit).
- A matrix has row or column subtotals enabled (`subTotals.rowSubtotals` / `columnSubtotals` = true).
- Running the static gate on a table / matrix.

## Do
1. A fixed-width column that can show a Desktop-added caption (the subtotal row's 'Grand Total', a totals column's own
   label) ⇒ size it to fit that caption's own text, not only the warehouse values measured for it.
2. The static gate's `subtotal-width` check must run on every report with a pivotTable; its failure is a real defect,
   the same as a narrow value column that truncates a number.
3. A column whose width is already governed by Grow to fit (`autoSizeColumnWidth = true`) is unaffected — Desktop sizes
   it itself; the check only applies where a fixed width was set.

## Example
- Situation: a matrix's outermost row level carries row subtotals; its `columnWidth` was measured from the longest
  store name in the warehouse (45px) and never re-checked against the 'Grand Total' caption Desktop adds for the
  subtotal row.
- ✗ Wrong: ship it; the column renders 'Grand Total' one letter per line, a vertical strip of single characters, found
  only when a reader opens the page.
- ✓ Right: the `subtotal-width` check in `scripts/pbi_gate.py` measures the caption's own text width at the column's
  font/bold and fails the column that is narrower; widen it before publishing.

## Check
- `scripts/pbi_gate.py`'s `check_report_level`'s `subtotal-width` block runs on every pivotTable with row subtotals and
  fails when its outermost row column has a fixed `columnWidth` narrower than the 'Grand Total' caption needs.

## Links · Liên kết
- Implements · Thi hành: `Skill_PBI_Pbip` — the subtotal-width check and how to fix it · phép kiểm subtotal-width và cách sửa
- Related · Liên quan: `Rule_Keys_87_NoSilentBlankPage` — a report must never fail silently · báo cáo không được lỗi lặng lẽ
