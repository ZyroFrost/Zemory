---
id: Slot_14
aka: 03-14
name: middleware
version: 4
path: backend/src/middleware/
from: _Store/03_STRUCTURE/_Slot/Backend_014_Middleware @v4 #e91659ed3471
---
# Backend_014_Middleware middleware — pipeline request

- Vai trò:
  - Pipeline request: guard / cors / log / rate-limit.
  - Nơi ENFORCE phân quyền (guard); định nghĩa role/permission ở `auth/`. Phân biệt rõ với `auth/`.
- Được chứa / không chứa: Không chứa: định nghĩa role/permission (→ `auth/`).
