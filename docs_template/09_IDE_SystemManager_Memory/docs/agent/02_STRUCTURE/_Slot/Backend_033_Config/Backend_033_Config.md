---
id: Slot_33
aka: 03-33
name: config
version: 4
path: backend/src/config/
from: _Store/02_STRUCTURE/_Slot/Backend_033_Config @v4 #7740da93a971
---
# Backend_033_Config config — config code + feature-flag

- Vai trò:
  - Config CODE: đọc `.env` → settings / hằng / enum, + feature-flag.
  - Cross-cutting: luôn ở cấp `src/` gốc.
- Được chứa / không chứa: Không chứa: secret · file config operator tự sửa (→ `config/` ở gốc).
