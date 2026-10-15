---
id: Slot_39
aka: 03-39
name: migrations
version: 2
path: backend/src/migrations/
applies: [App]
---
# Slot_Backend_039_Migrations migrations — DB migration

- Vai trò: DB migration / đổi schema. Cross-cutting: luôn ở cấp `src/` gốc.
- Khuôn tên: Mỗi file = một bước version schema. Framework ép tên (Django `migrations/`) thì theo framework.
