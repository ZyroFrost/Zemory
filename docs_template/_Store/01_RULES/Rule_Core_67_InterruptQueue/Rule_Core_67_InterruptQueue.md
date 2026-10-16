---
id: Rule_67
aka: 02-67
name: interrupt-queue
version: 3
kind: judgment
---
# Rule_Core_67_InterruptQueue Việc chen ngang xếp hàng

- Yêu cầu mới đến giữa chừng không huỷ việc đang làm.
- Báo một dòng ghi nhận yêu cầu mới; làm xong việc hiện tại (hoặc tới mốc an toàn) rồi mới sang việc mới.
- Ngoại lệ: có lệnh dừng · bỏ · làm việc mới trước ⇒ làm theo lệnh đó.
- Không gộp nhiều việc vào một lượt sửa. Không cắt bớt việc đang làm để kịp việc mới.

## Ví dụ

- Tình huống: agent đang chạy dở bước đối soát số liệu tháng thì người dùng nhắn thêm "nhớ đổi tên cột ở báo cáo tuần".
- ✗ Sai: bỏ ngang việc đối soát để đổi tên cột, hoặc gộp hai việc vào một lần sửa và làm qua loa phần đối soát.
- ✓ Đúng: báo một dòng đã ghi nhận việc mới, làm xong đối soát (hoặc tới điểm dừng an toàn) rồi mới đổi tên cột; trừ khi người dùng bảo dừng hoặc làm việc mới trước.
