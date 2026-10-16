---
id: Rule_6
aka: 02-6
name: handoff-inline
version: 3
kind: judgment
from: _Store/01_RULES/Rule_Keys_06_HandoffInline @v3 #aa7cf3403c8a
---
# Rule_Keys_06_HandoffInline Văn bản chuyển đi một lần thì in trong câu trả lời, không tạo file

- Bản bàn giao · memo · báo cáo · prompt hoặc ghi chú gửi sang repo hoặc phòng khác ⇒ in nguyên khối trong câu trả lời.
- Không ghi vào `tasks/`, không đính kèm file.
- Dài tới mức khó đọc trong chat ⇒ hỏi có lưu thành file không.
- Phép thử: repo chỉ giữ thứ nó chạy hoặc thứ định nghĩa việc nó chạy (spec · model · script · cấu hình · sổ).
