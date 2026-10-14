---
id: 03-33
name: config
version: 1
path: backend/src/config/
applies: [App]
---
# 03-33 config — config code + feature-flag

- Vai trò:
  - Config CODE: đọc `.env` → settings / hằng / enum, + feature-flag.
  - Cross-cutting: luôn ở cấp `src/` gốc.
- Được chứa / không chứa: Không chứa: secret · file config operator tự sửa (→ `config/` ở gốc).
