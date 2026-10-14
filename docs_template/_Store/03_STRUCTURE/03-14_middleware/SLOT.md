---
id: 03-14
name: middleware
version: 1
path: backend/src/middleware/
applies: [App]
---
# 03-14 middleware — pipeline request

- Vai trò:
  - Pipeline request: guard / cors / log / rate-limit.
  - Nơi ENFORCE phân quyền (guard); định nghĩa role/permission ở `auth/`. Phân biệt rõ với `auth/`.
- Được chứa / không chứa: Không chứa: định nghĩa role/permission (→ `auth/`).
