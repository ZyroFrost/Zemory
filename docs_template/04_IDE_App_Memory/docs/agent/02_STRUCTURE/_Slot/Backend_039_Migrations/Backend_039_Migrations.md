---
id: Slot_39
aka: 03-39
name: migrations
version: 5
path: backend/src/migrations/
from: _Store/02_STRUCTURE/_Slot/Backend_039_Migrations @v5 #dcb471663d63
---
# Backend_039_Migrations migrations — DB migrations

- Role: DB migrations / schema changes. Cross-cutting: always at the root level of `src/`.
- Naming: One file = one schema version step. Where a framework forces the name (Django `migrations/`), follow the framework.
