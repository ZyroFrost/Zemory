---
id: Rule_6
aka: 02-6
name: handoff-inline
version: 6
kind: judgment
code: 02_Work
---
# Rule_Keys_06_HandoffInline Văn bản chuyển đi một lần thì in trong câu trả lời, không tạo file

- Bản bàn giao · memo · báo cáo · prompt hoặc ghi chú gửi sang repo hoặc phòng khác ⇒ in nguyên khối trong câu trả lời.
- Không ghi vào `tasks/`, không đính kèm file. Dài tới mức khó đọc trong chat ⇒ hỏi có lưu thành file không.
- Phép thử: repo chỉ giữ thứ nó chạy hoặc thứ định nghĩa việc nó chạy (spec · model · script · cấu hình · sổ · mẫu dùng lại).

## Ví dụ

- Tình huống: agent cần nhờ nhóm dữ liệu bổ sung hai cột cho một bảng.
- ✗ Sai: tạo file yêu cầu trong thư mục việc của repo rồi bảo người giao việc đi mở file đó ra gửi.
- ✓ Đúng: in nguyên khối lời nhờ trong câu trả lời để người giao việc chép gửi; dài tới mức khó đọc thì hỏi có muốn lưu thành file không.
