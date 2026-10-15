---
id: Slot_11
aka: 03-11
name: events
version: 2
path: backend/src/events/
applies: [App]
---
# Slot_Backend_011_Events events — nhận event / webhook inbound

- Vai trò:
  - NHẬN & xử lý event/webhook INBOUND · event bus · consumer · listener. Webhook chỉ là một loại nguồn event.
  - Khác `jobs/` (theo lịch) và `pipelines/` (đường ống nhiều bước): `events/` = phản ứng sự kiện.
- Được chứa / không chứa: Không chứa: job theo lịch (→ `jobs/`) · ETL nhiều bước (→ `pipelines/`).
