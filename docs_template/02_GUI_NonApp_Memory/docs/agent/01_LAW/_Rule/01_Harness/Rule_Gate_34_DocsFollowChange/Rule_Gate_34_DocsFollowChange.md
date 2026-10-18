---
id: Rule_34
aka: 02-34
name: docs-follow-change
version: 5
kind: judgment
code: 01_Harness
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_34_DocsFollowChange @v5 #41eca1b7da17
---
# Rule_Gate_34_DocsFollowChange Tài liệu đổi cùng thay đổi

- Đổi một thứ ⇒ trong cùng thay đổi sửa mọi tài liệu mô tả nó: `02_STRUCTURE` khi đụng cấu trúc (slot · routing) · plan khi đổi thiết kế · `05_CHANGES` sau khi được xác nhận · `04_TODO` theo `Rule_Gate_38_TodoDoor` · hướng dẫn hiện cho người dùng trong sản phẩm.
- Tài liệu lệch nguy hơn thiếu, vì người đọc tin nó.
- File `.md` trong `docs/` là nguồn: sửa trực tiếp đúng file, đúng vai. Chỉ mục tìm kiếm (nếu có) dựng từ file, không ghi ngược file.
- Bảng soát cuối lượt: `.claude/skills/harness-session-close/SKILL.md`.
- Phép kiểm: `conform` bắt cây thư mục lệch `02_STRUCTURE`; các vế khác là phán đoán.

## Ví dụ

- Tình huống: app báo cáo có trang "Hướng dẫn" liệt kê các loại cảnh báo; agent vừa gỡ một loại trong mã.
- ✗ Sai: chỉ sửa mã; trang hướng dẫn vẫn ghi "9 loại", người dùng đi tìm loại đã không còn và nghĩ app lỗi.
- ✓ Đúng: cùng lần sửa đó cập nhật trang hướng dẫn và ghi changelog.
