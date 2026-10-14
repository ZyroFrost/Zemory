---
id: 03-27
name: pipelines
version: 1
path: backend/src/pipelines/
applies: [App]
---
# 03-27 pipelines — ETL / ingest / batch nhiều bước

- Vai trò:
  - ETL / ingest / batch NHIỀU BƯỚC — đường ống dữ liệu.
  - Khác `jobs/` (theo lịch) và `events/` (phản ứng sự kiện); khác `agents/` (model-driven): pipelines là tất định.
- Được chứa / không chứa: Không chứa: lịch chạy (→ `jobs/`) · consumer sự kiện (→ `events/`).
