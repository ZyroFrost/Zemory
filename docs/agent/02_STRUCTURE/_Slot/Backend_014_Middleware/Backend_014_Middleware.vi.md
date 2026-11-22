---
version: 5
lang: vi
---
# Backend_014_Middleware middleware — pipeline request

- Vai trò:
  - Pipeline request: guard / cors / log / rate-limit.
  - Nơi ENFORCE phân quyền (guard); định nghĩa role/permission ở `auth/`. Phân biệt rõ với `auth/`.
- Được chứa / không chứa: Không chứa: định nghĩa role/permission (→ `auth/`).
