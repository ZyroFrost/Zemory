---
id: Slot_56
aka: 03-56
name: packaging
version: 3
path: backend/resources/packaging/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_056_Packaging @v3 #95ca272f7efc
---
# Slot_Backend_056_Packaging packaging — resource đóng gói exe / tray

- Vai trò:
  - Icon file `.exe`/binary (trình đóng gói `.spec` đọc) + icon tray/cửa sổ desktop (backend native đọc).
  - Icon có 3 vai trò: media UI (logo / icon nút / background) → `frontend/assets/` · icon exe/binary → đây · icon tray/cửa sổ → đây.
  - Đóng gói exe/installer = `.spec` (gốc) + `backend/resources/packaging/` (icon) + `dist/` (output) + Releases — dùng slot cũ, không nhóm mới.
- Được chứa / không chứa: Không chứa: media render trong trang (→ `frontend/assets/`).
