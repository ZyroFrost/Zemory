---
id: 02-57
name: protected-key
version: 1
kind: content
---
# 02-57 Khai đường cấm ghi qua khoá `protected`

- Đường cấm ghi của repo khai ở khoá `protected: ["..."]` trong `.harness.json` (ví dụ `docs/` do nhóm khác giữ).
- Phép kiểm: `zemory doctor` nhắc khi đã khai `protected` mà chưa sinh chốt.
