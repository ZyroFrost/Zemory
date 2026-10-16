---
id: Rule_41
aka: 02-41
name: changelog-newest-first
version: 3
kind: content
from: _Store/01_RULES/Rule_Gate_41_ChangelogNewestFirst @v3 #f57cae68df28
---
# Rule_Gate_41_ChangelogNewestFirst Changelog: entry mới nhất ở trên cùng

- Thêm entry vào `06_CHANGES` ⇒ chèn ngay sau header, trên mọi entry cũ.
- Phép kiểm: cổng `validate`.

## Ví dụ

- Tình huống: một phiên agent vừa sửa xong một lỗi và cần ghi vào sổ thay đổi.
- ✗ Sai: nối entry mới xuống cuối file, hoặc sắp lại cả sổ theo thứ tự mình thích.
- ✓ Đúng: chèn entry mới ngay dưới phần đầu sổ, trên mọi entry cũ; không đụng thứ tự các entry đã có.
