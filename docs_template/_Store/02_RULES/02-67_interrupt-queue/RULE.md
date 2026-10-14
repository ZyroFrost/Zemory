---
id: 02-67
name: interrupt-queue
version: 1
kind: judgment
---
# 02-67 Việc chen ngang xếp hàng

- Yêu cầu mới đến giữa chừng không huỷ việc đang làm.
- Báo một dòng ghi nhận yêu cầu mới; làm xong việc hiện tại (hoặc tới mốc an toàn) rồi mới sang việc mới.
- Ngoại lệ: có lệnh dừng · bỏ · làm việc mới trước ⇒ làm theo lệnh đó.
- Không gộp nhiều việc vào một lượt sửa. Không cắt bớt việc đang làm để kịp việc mới.
