---
id: Rule_4
aka: 02-4
name: scratch-files
version: 5
kind: judgment
from: _Store/01_RULES/Rule_Gate_04_ScratchFiles @v5 #b756ba733be5
---
# Rule_Gate_04_ScratchFiles File tạm có đường chết

- Thứ tạo ra để làm việc mà không phải sản phẩm giao đi (script dò · dữ liệu đo · dữ liệu trung gian · model tải về · ảnh chụp · bản nháp · bản thử · bản sao để so) có chỗ riêng và có đường dọn: nằm trong thư mục nháp của phiên, không nằm trong repo.
- Dùng xong một file tạm ⇒ xoá ngay, không chờ cuối phiên. Trần: tại một thời điểm, một phiên giữ tối đa 5 file tạm; sắp vượt trần ⇒ xoá file cũ trước khi tạo file mới.
- Thứ giữ lại phải nhỏ và nói rõ giữ vì gì.
- Thư mục tạm do mã tạo ra (test · script · công cụ, ví dụ `mkdtemp` trong thư mục tạm của hệ thống) ⇒ mã đó tự xoá ở `finally`/`after`, kể cả khi lỗi hay bị huỷ giữa chừng. Bộ chạy test trỏ thư mục tạm của mọi tiến trình con vào MỘT thư mục cha của lượt chạy, xoá nó khi chạy xong và dọn các lượt cũ bị bỏ dở. Phép kiểm: đếm thư mục trong thư mục tạm của hệ thống trước và sau một lượt chạy — hai số bằng nhau.
- Chốt máy: hook chặn mọi lời gọi tạo file MỚI trong thư mục nháp của phiên (`<tmp>/claude/<project>/<session>/scratchpad`) khi thư mục đó đã có 5 file; không có cờ vượt — xoá file đã dùng xong rồi tạo lại.
- Khi có zemory: máy canh `scratchTick` quét thư mục nháp mỗi 6 giờ, dọn phiên quá 7 ngày hoặc khi tổng vượt 2 GB (cũ nhất trước); chỉ nhận khuôn `<project>/<session>/scratchpad`, không đụng phiên đang chạy hay thư mục vừa ghi trong 6 giờ; lỗi thì bỏ qua, không chặn (fail-open).

## Ví dụ

- Tình huống: Một phiên agent thử nghiệm mô hình, tải mô hình về, chụp ảnh màn hình, xuất vài bảng số đo để so.
- ✗ Sai: Để mọi thứ lại "biết đâu cần"; sau vài tuần ổ đĩa đầy mà không ai biết các file đó đến từ đâu.
- ✓ Đúng: Mọi file tạm nằm trong thư mục nháp của phiên, dùng xong file nào xoá ngay file đó, giữ tối đa năm file cùng lúc; thứ cần giữ thì nhỏ và ghi rõ giữ để làm gì.
