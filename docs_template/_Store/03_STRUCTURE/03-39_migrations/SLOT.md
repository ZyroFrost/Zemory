---
id: 03-39
name: migrations
version: 1
path: backend/src/migrations/
applies: [App]
---
# 03-39 migrations — DB migration

- Vai trò: DB migration / đổi schema. Cross-cutting: luôn ở cấp `src/` gốc.
- Khuôn tên: Mỗi file = một bước version schema. Framework ép tên (Django `migrations/`) thì theo framework.
