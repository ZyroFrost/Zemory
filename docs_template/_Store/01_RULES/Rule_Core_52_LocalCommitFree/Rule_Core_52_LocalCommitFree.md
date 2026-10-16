---
id: Rule_52
aka: 02-52
name: local-commit-free
version: 3
kind: judgment
---
# Rule_Core_52_LocalCommitFree Commit cục bộ không cần xin phép

- Commit cục bộ đảo được ⇒ làm theo phong cách commit của repo, không cần xin.
- Push mới là cửa cần phép (`Rule_Gate_50_PushApproval`).

## Ví dụ

- Tình huống: agent vừa xong một phần việc dọn dữ liệu và muốn chốt mốc để lỡ sai còn quay lại.
- ✗ Sai: dừng lại hỏi người dùng có được commit không, hoặc không commit để "an toàn".
- ✓ Đúng: commit cục bộ theo phong cách commit của repo; chỉ dừng hỏi khi tới bước push.
