---
id: Slot_50
aka: 03-50
name: scripts
version: 3
path: backend/scripts/
---
# Slot_Backend_050_Scripts scripts — script dev/build/ops/deploy

- Vai trò:
  - Script dev / build / ops / DEPLOY, kèm `sql/` cho SQL one-off.
  - Chốt version + deploy máy đích/VM thủ công: git tag (vX.Y.Z) → `dist/` (build) → `backend/scripts/deploy.*` → backup bản cũ TRÊN máy đích về `attic/` TRƯỚC KHI ghi đè.
  - Đóng gói dùng slot cũ: `.spec` (gốc) + `backend/scripts` + `backend/resources/packaging` + `dist/` + OS app-data (cài).
  - Sơ đồ trực quan sinh từ data → script ở đây, render ra `exports/`.
  - `scripts/` ≠ `tools/` (tool cho LLM gọi).
