---
id: Slot_56
aka: 03-56
name: packaging
version: 5
path: backend/resources/packaging/
---
# Backend_056_Packaging packaging — packaging resources for the exe / tray

- Role:
  - The icon of the `.exe`/binary (read by the packager's `.spec`) + the tray/desktop window icon (read by the native backend).
  - Icons have 3 roles: UI media (logo / button icons / backgrounds) → `frontend/assets/` · the exe/binary icon → here · the tray/window icon → here.
  - Packaging an exe/installer = `.spec` (root) + `backend/resources/packaging/` (icons) + `dist/` (output) + Releases — existing slots, no new group.
- May hold / may not hold: Not here: media rendered in a page (→ `frontend/assets/`).
