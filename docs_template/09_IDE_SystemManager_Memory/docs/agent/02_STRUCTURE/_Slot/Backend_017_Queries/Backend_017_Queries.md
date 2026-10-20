---
id: Slot_17
aka: 03-17
name: queries
version: 4
path: backend/src/store/queries.*
from: _Store/02_STRUCTURE/_Slot/Backend_017_Queries @v4 #9927576c8ca9
---
# Backend_017_Queries queries — kho SQL đặt tên

- Vai trò:
  - GOM mọi câu SQL đặt TÊN, gọi theo tên — không rải f-string/inline.
  - Đối xứng với `queries/` của hệ NON-APP.
- Được chứa / không chứa: Không chứa: SQL one-off của dev/ops (→ `backend/scripts/sql/`).
