---
id: Rule_57
aka: 02-57
name: protected-key
version: 3
kind: content
---
# Rule_Gate_57_ProtectedKey Khai đường cấm ghi qua khoá `protected`

- Đường cấm ghi của repo khai ở khoá `protected: ["..."]` trong `.harness.json` (ví dụ `docs/` do nhóm khác giữ).
- Phép kiểm: `zemory doctor` nhắc khi đã khai `protected` mà chưa sinh chốt.

## Ví dụ

- Tình huống: một repo phân tích dùng chung thư mục tài liệu do nhóm khác quản lý.
- ✗ Sai: chỉ ghi một câu nhắc "đừng sửa thư mục này" trong tài liệu.
- ✓ Đúng: khai thư mục đó vào khoá `protected` của marker rồi sinh chốt; lệnh kiểm sức khoẻ nhắc nếu đã khai mà chưa sinh chốt.
