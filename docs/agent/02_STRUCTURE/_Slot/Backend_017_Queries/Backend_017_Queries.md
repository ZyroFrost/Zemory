---
id: Slot_17
aka: 03-17
name: queries
version: 5
path: backend/src/store/queries.*
from: _Store/02_STRUCTURE/_Slot/Backend_017_Queries @v5 #d7e2a8bc0b24
---
# Backend_017_Queries queries — the store of named SQL

- Role:
  - GATHERS every SQL statement under a NAME, called by name — no f-strings/inline SQL scattered around.
  - Mirrors `queries/` of a NON-APP repo.
- May hold / may not hold: Not here: one-off dev/ops SQL (→ `backend/scripts/sql/`).
