---
id: Rule_88
name: matrix-caption-fit
version: 1
kind: action
code: 05_Domain
checked: [Rule_Keys_87_NoSilentBlankPage, Rule_Gate_84_PbipOpenCheck]
from: _Store/01_LAW/_Rule/05_Domain/Rule_Keys_88_MatrixCaptionFit @v1 #c9d04fdbaf2b
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

## Luật là gì
Một cột bảng/matrix được khai bề rộng CỐ ĐỊNH (tắt Grow to fit) phải đủ rộng cho mọi chữ Desktop sẽ hiện trong đó —
kể cả chữ do chính Desktop thêm vào, như dòng tổng 'Grand Total', không chỉ giá trị DW đã đo. Cột hẹp hơn chữ của
chính nó không cuộn cũng không cắt bằng dấu ba chấm: Desktop bẻ chữ xuống từng ký tự một, vì bẻ theo từ cần có từ mà
'Grand Total' không có chỗ nào bẻ mà vẫn đọc được.

## Khi nào áp
- Khai bề rộng cố định cho một cột hàng/cột tiêu đề của bảng/matrix (tắt Grow to fit).
- Một matrix có bật dòng/cột tổng (`subTotals.rowSubtotals` / `columnSubtotals` = true).
- Chạy cổng tĩnh trên một bảng/matrix.

## Phải làm gì
1. Cột bề rộng cố định mà có thể hiện chữ do Desktop thêm (dòng Grand Total, nhãn của cột tổng) ⇒ đo theo chính chữ đó,
   không chỉ theo giá trị DW đã đo.
2. Phép kiểm `subtotal-width` của cổng tĩnh phải chạy trên mọi report có pivotTable; lỗi của nó là lỗi thật, như một
   cột số hẹp làm cắt số.
3. Cột đang do Grow to fit quản (`autoSizeColumnWidth = true`) không bị ảnh hưởng — Desktop tự đo; phép kiểm chỉ áp khi
   đã khai bề rộng cố định.

## Ví dụ
- Tình huống: cấp ngoài cùng của hàng trên một matrix có bật dòng tổng; `columnWidth` của nó đo theo tên cửa hàng dài
  nhất trong DW (45px), chưa bao giờ đối chiếu lại với chữ 'Grand Total' Desktop thêm cho dòng tổng.
- ✗ Sai: giao đi; cột hiện 'Grand Total' từng chữ cái một dòng, một dải ký tự dọc, chỉ phát hiện khi người đọc mở trang.
- ✓ Đúng: phép kiểm `subtotal-width` trong `scripts/pbi_gate.py` đo bề rộng chữ của caption theo đúng font/bold của cột
  và báo lỗi cột hẹp hơn; nới rộng trước khi publish.

## Máy kiểm
- Khối `subtotal-width` trong `check_report_level` của `scripts/pbi_gate.py` chạy trên mọi pivotTable có bật dòng tổng
  và báo lỗi khi cột hàng ngoài cùng có `columnWidth` cố định hẹp hơn chữ 'Grand Total' cần.

## Links · Liên kết
- Implements · Thi hành: `Skill_PBI_Pbip` — the subtotal-width check and how to fix it · phép kiểm subtotal-width và cách sửa
- Related · Liên quan: `Rule_Keys_87_NoSilentBlankPage` — a report must never fail silently · báo cáo không được lỗi lặng lẽ
