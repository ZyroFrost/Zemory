---
id: 03-35
name: audit
version: 1
path: backend/src/audit/
applies: [App]
---
# 03-35 audit — audit trail bảo mật

- Vai trò:
  - AUDIT TRAIL bảo mật: ai làm gì, lúc nào (đổi quyền, xoá, đăng nhập); bảng audit ở `store/`.
  - Khác log debug (`data/logs/`).
  - App đa người dùng / có hành động nhạy cảm → NÊN có; không có thì ghi rõ.
- Được chứa / không chứa: Không chứa: log debug.
