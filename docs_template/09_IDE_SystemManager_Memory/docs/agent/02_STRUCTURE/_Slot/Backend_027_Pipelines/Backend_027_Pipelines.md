---
id: Slot_27
aka: 03-27
name: pipelines
version: 4
path: backend/src/pipelines/
from: _Store/02_STRUCTURE/_Slot/Backend_027_Pipelines @v4 #9b851b33ba7e
---
# Backend_027_Pipelines pipelines — ETL / ingest / batch nhiều bước

- Vai trò:
  - ETL / ingest / batch NHIỀU BƯỚC — đường ống dữ liệu.
  - Khác `jobs/` (theo lịch) và `events/` (phản ứng sự kiện); khác `agents/` (model-driven): pipelines là tất định.
- Được chứa / không chứa: Không chứa: lịch chạy (→ `jobs/`) · consumer sự kiện (→ `events/`).
