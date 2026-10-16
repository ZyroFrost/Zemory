---
id: Rule_34
aka: 02-34
name: harness-in-sync
version: 3
kind: judgment
from: _Store/01_RULES/Rule_Core_34_HarnessInSync @v3 #390442e0d050
---
# Rule_Core_34_HarnessInSync Các file harness luôn khớp nội dung

- Mỗi thay đổi ⇒
  - `05_TODO` phản ánh việc;
  - `06_CHANGES` ghi sau khi được xác nhận;
  - `03` cập nhật khi đụng cấu trúc / định nghĩa;
  - `04` cập nhật khi thêm / bớt skill;
  - plan cập nhật khi đổi thiết kế.
- Sổ nói khác thực tế là dạng sai không cổng nào bắt.

## Ví dụ

- Tình huống: một quyết định thiết kế vừa được chốt và đã làm xong.
- ✗ Sai: chỉ ghi vào changelog; spec vẫn để mục "chờ chốt", sổ việc vẫn để mục mở — phiên sau hỏi lại đúng câu đã trả lời.
- ✓ Đúng: trong cùng thay đổi, đóng mục ở `05_TODO`, ghi `06_CHANGES`, sửa spec trong plan thành hướng đã chốt.
