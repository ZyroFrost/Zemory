---
version: 2
lang: vi
---
# Rule_Keys_88_MatrixCaptionFit — A matrix column with a fixed width must fit the caption Desktop renders in it

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
