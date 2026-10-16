---
id: Slot_60
aka: 03-60
name: assets
version: 4
path: frontend/assets/
from: _Store/03_STRUCTURE/_Slot/Frontend_060_Assets @v4 #3b2f1e45f241
---
# Frontend_060_Assets assets — media UI

- Vai trò:
  - MEDIA UI: logo · icon · background · banner · ảnh · font.
  - Icon 3 vai trò: chỉ media render trong trang ở đây.
  - UI một ngôn ngữ: asset UI ở `backend/<pkg>/assets` hoặc `frontend/assets` tuỳ framework.
- Được chứa / không chứa: Không chứa: icon exe/tray (→ `backend/resources/packaging/`) — nó không render trong trang.
- Khuôn tên: Con theo LOẠI khi có: `logo/` · `icons/` · `backgrounds/` · `banners/` · `images/` · `fonts/`.
