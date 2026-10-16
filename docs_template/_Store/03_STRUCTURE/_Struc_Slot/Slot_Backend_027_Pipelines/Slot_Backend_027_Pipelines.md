---
id: Slot_27
aka: 03-27
name: pipelines
version: 3
path: backend/src/pipelines/
---
# Slot_Backend_027_Pipelines pipelines — ETL / ingest / batch nhiều bước

- Vai trò:
  - ETL / ingest / batch NHIỀU BƯỚC — đường ống dữ liệu.
  - Khác `jobs/` (theo lịch) và `events/` (phản ứng sự kiện); khác `agents/` (model-driven): pipelines là tất định.
- Được chứa / không chứa: Không chứa: lịch chạy (→ `jobs/`) · consumer sự kiện (→ `events/`).
