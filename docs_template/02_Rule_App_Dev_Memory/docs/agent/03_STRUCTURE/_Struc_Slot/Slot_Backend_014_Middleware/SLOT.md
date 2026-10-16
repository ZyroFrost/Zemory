---
id: Slot_14
aka: 03-14
name: middleware
version: 3
path: backend/src/middleware/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_014_Middleware @v3 #8da1f09069cc
---
# Slot_Backend_014_Middleware middleware — pipeline request

- Vai trò:
  - Pipeline request: guard / cors / log / rate-limit.
  - Nơi ENFORCE phân quyền (guard); định nghĩa role/permission ở `auth/`. Phân biệt rõ với `auth/`.
- Được chứa / không chứa: Không chứa: định nghĩa role/permission (→ `auth/`).
