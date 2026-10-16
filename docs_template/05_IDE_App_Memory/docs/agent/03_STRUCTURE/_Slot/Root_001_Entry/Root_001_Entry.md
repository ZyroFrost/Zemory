---
id: Slot_1
aka: 03-1
name: entry
version: 4
path: AGENTS.md · CLAUDE.md
from: _Store/03_STRUCTURE/_Slot/Root_001_Entry @v4 #65d089771917
---
# Root_001_Entry entry — cửa vào harness

- Vai trò:
  - `AGENTS.md` (★) là cửa vào harness: mô tả app hoặc sản phẩm rồi trỏ vào `docs/`; ở hệ NON-APP nó ghi profile non-app. Theo chuẩn liên-công-cụ agents.md.
  - `CLAUDE.md` (★) là cửa vào thứ hai: CHỈ chứa `@AGENTS.md`. Claude Code đọc `CLAUDE.md`, không đọc `AGENTS.md` ⇒ thiếu file này thì cửa vào không tự nạp.
  - `AGENTS.md` là một trong 4 vai trò bắt buộc của hệ APP (`backend/(code)` · `frontend/` · `docs/` · `AGENTS.md`) và một trong 3 vai trò bắt buộc của hệ NON-APP (`docs/` · `AGENTS.md` · ≥1 deliverable).
  - Cửa vào giống hệt nhau ở hai hệ: cùng engine, agent điều hướng như nhau.
  - Hai file nằm ở gốc repo vì công cụ ép vị trí; không dời.
- Được chứa / không chứa:
  - `AGENTS.md`: mô tả app/sản phẩm + đường dẫn vào `docs/`.
  - `CLAUDE.md`: một dòng `@AGENTS.md`, không thêm nội dung khác.
