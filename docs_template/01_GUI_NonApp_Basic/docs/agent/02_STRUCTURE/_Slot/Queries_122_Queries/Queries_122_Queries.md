---
id: Slot_122
aka: 03-122
name: queries
version: 5
path: queries/
from: _Store/02_STRUCTURE/_Slot/Queries_122_Queries @v5 #7972cda1a552
---
# Queries_122_Queries queries — shared named SQL/DAX/M

- Role:
  - Named SQL / DAX / M, called by name — never scattered inline (mirrors `store/queries.*` of an APP repo).
  - A check query SEVERAL cases share → `queries/check_*.sql` (the exception to one case, one folder).
  - Must compute exactly as the data dictionary says; a difference found ⇒ REPORT it, never fix it on your own.
- May hold / may not hold: Not here: a query only one case uses (→ `tasks/<case>/check_*.sql`).
