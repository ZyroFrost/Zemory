---
id: Rule_67
aka: 02-67
name: interrupt-queue
version: 4
kind: judgment
from: _Store/01_LAW/_Rule/Rule_Core_67_InterruptQueue @v4 #97a47e839244
---
# Rule_Core_67_InterruptQueue Việc chen ngang xếp hàng

- Yêu cầu mới đến giữa chừng không huỷ việc đang làm. Báo một dòng ghi nhận; làm xong việc hiện tại (hoặc tới mốc an toàn) rồi mới sang việc mới.
- Ngoại lệ: có lệnh dừng · bỏ · làm việc mới trước ⇒ làm theo lệnh đó.
- Không gộp nhiều việc vào một lượt sửa. Không cắt bớt việc đang làm để kịp việc mới.

## Ví dụ

- Tình huống: agent đang chạy dở đối soát số liệu tháng thì người dùng nhắn "nhớ đổi tên cột ở báo cáo tuần".
- ✗ Sai: bỏ ngang đối soát để đổi tên cột, hoặc gộp hai việc và làm qua loa phần đối soát.
- ✓ Đúng: báo đã ghi nhận, làm xong đối soát rồi mới đổi tên cột; trừ khi người dùng bảo dừng hoặc làm việc mới trước.
