---
id: Slot_33
aka: 03-33
name: config
version: 3
path: backend/src/config/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_033_Config @v3 #12098dd8f76c
---
# Slot_Backend_033_Config config — config code + feature-flag

- Vai trò:
  - Config CODE: đọc `.env` → settings / hằng / enum, + feature-flag.
  - Cross-cutting: luôn ở cấp `src/` gốc.
- Được chứa / không chứa: Không chứa: secret · file config operator tự sửa (→ `config/` ở gốc).
