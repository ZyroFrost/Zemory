---
id: Rule_4
aka: 02-4
name: scratch-files
version: 2
kind: judgment
---
# Rule_Core_04_ScratchFiles File tạm có đường chết

- Thứ tạo ra để làm việc mà không phải sản phẩm giao đi (script dò · dữ liệu đo · dữ liệu trung gian · model tải về · ảnh chụp · bản nháp · bản thử · bản sao để so) có chỗ riêng và có đường dọn: nằm trong thư mục nháp của phiên, không nằm trong repo.
- Đo hoặc thử xong và chắc không dùng lại ⇒ dọn trong phiên.
- Thứ giữ lại phải nhỏ và nói rõ giữ vì gì.
- Khi có zemory: máy canh `scratchTick` quét thư mục nháp mỗi 6 giờ, dọn phiên quá 7 ngày hoặc khi tổng vượt 2 GB (cũ nhất trước); chỉ nhận khuôn `<project>/<session>/scratchpad`, không đụng phiên đang chạy hay thư mục vừa ghi trong 6 giờ; lỗi thì bỏ qua, không chặn (fail-open).
