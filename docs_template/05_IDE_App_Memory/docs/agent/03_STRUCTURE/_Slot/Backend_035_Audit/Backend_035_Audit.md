---
id: Slot_35
aka: 03-35
name: audit
version: 4
path: backend/src/audit/
from: _Store/03_STRUCTURE/_Slot/Backend_035_Audit @v4 #7e45e3bb434d
---
# Backend_035_Audit audit — audit trail bảo mật

- Vai trò:
  - AUDIT TRAIL bảo mật: ai làm gì, lúc nào (đổi quyền, xoá, đăng nhập); bảng audit ở `store/`.
  - Khác log debug (`data/logs/`).
  - App đa người dùng / có hành động nhạy cảm → NÊN có; không có thì ghi rõ.
- Được chứa / không chứa: Không chứa: log debug.
