---
id: Rule_57
aka: 02-57
name: protected-key
version: 2
kind: content
from: _Store/01_RULES/Rule_Gate_57_ProtectedKey @v2 #4daf9ff72893
---
# Rule_Gate_57_ProtectedKey Khai đường cấm ghi qua khoá `protected`

- Đường cấm ghi của repo khai ở khoá `protected: ["..."]` trong `.harness.json` (ví dụ `docs/` do nhóm khác giữ).
- Phép kiểm: `zemory doctor` nhắc khi đã khai `protected` mà chưa sinh chốt.
