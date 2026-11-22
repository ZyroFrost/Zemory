---
version: 5
lang: vi
---
# Backend_033_Config config — config code + feature-flag

- Vai trò:
  - Config CODE: đọc `.env` → settings / hằng / enum, + feature-flag.
  - Cross-cutting: luôn ở cấp `src/` gốc.
- Được chứa / không chứa: Không chứa: secret · file config operator tự sửa (→ `config/` ở gốc).
