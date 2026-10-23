---
version: 2
lang: vi
---
# Rule_Keys_87_NoSilentBlankPage — A report page never goes blank from its own default filters without a check catching it

## Luật là gì
Bộ lọc mặc định của chính một trang (lựa chọn khai sẵn trong slicer) không bao giờ được giao nhau ra rỗng. Một slicer mặc định
giá trị/khoảng CỐ ĐỊNH đứng cùng trang với một slicer khác mặc định giá trị DI ĐỘNG ('Current Year' / 'Current Month' /
'Current Week') thì cái cố định sẽ cũ dần theo thời gian và trang lặng lẽ hiện rỗng — không có lỗi nào hiện ra, chỉ có người
đọc thấy trang trống. Cổng máy tĩnh phải bắt được lỗi này trước khi tới tay người đọc.

## Khi nào áp
- Dựng hay sửa lựa chọn mặc định của một slicer trên trang White / Red.
- Gộp slicer của một trang vào trang khác (mặc định của slicer đi theo nó).
- Chạy cổng tĩnh trên report White / Red.

## Phải làm gì
1. Mặc định của một slicer là giá trị/khoảng CỐ ĐỊNH ⇒ kiểm mọi slicer khác trên cùng trang xem có mặc định DI ĐỘNG
   ('Current Year' / 'Current Month' / 'Current Week' hay tương tự) không; mặc định cố định đứng cạnh mặc định di động là
   lỗi, không phải lựa chọn thiết kế — bỏ mặc định cố định, hoặc bỏ cả slicer nếu nó chỉ mang mỗi việc đó.
2. Gộp trang ⇒ mang theo nội dung, không mang theo mặc định cũ của một slicer ẩn; kiểm lại từng slicer vừa dời so với mặc
   định của chính trang nhận.
3. Phép kiểm `stale-default` của cổng tĩnh phải chạy trên mọi report White / Red trước khi gọi là xong; lỗi của nó chặn cổng
   như một lỗi làm hỏng file.

## Ví dụ
- Tình huống: một trang được ráp từ hai trang gộp lại; một trang mang theo slicer DateKey ẩn mặc định khoảng cố định
  tháng 3/2025, trang kia có Year/Month mặc định 'Current Year'/'Current Month'.
- ✗ Sai: giao đi; từ tháng 4/2025 trở đi phần giao nhau rỗng, mọi visual trên trang hiện không có dữ liệu, chỉ phát hiện khi
  người đọc chụp màn hình trang trống nhiều tháng sau.
- ✓ Đúng: phép kiểm `stale-default` trong `scripts/pbi_gate.py` bắt lỗi ngay lúc dựng; bỏ slicer mặc định khoảng cố định
  trước khi publish.

## Máy kiểm
- `check_stale_default_filter` (phép kiểm `stale-default`) của `scripts/pbi_gate.py` chạy trong lớp tĩnh của mọi report
  White và báo lỗi khi một trang vừa có slicer mặc định cố định vừa có slicer mặc định di động.
