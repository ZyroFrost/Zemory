---
id: Rule_67
aka: 02-67
name: interrupt-queue
version: 2
kind: judgment
from: _Store/01_RULES/Rule_Core_67_InterruptQueue @v2 #1d0da8996437
---
# Rule_Core_67_InterruptQueue Việc chen ngang xếp hàng

- Yêu cầu mới đến giữa chừng không huỷ việc đang làm.
- Báo một dòng ghi nhận yêu cầu mới; làm xong việc hiện tại (hoặc tới mốc an toàn) rồi mới sang việc mới.
- Ngoại lệ: có lệnh dừng · bỏ · làm việc mới trước ⇒ làm theo lệnh đó.
- Không gộp nhiều việc vào một lượt sửa. Không cắt bớt việc đang làm để kịp việc mới.
