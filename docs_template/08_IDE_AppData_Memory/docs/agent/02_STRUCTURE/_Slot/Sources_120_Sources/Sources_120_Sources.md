---
id: Slot_120
aka: 03-120
name: sources
version: 5
path: sources/
from: _Store/02_STRUCTURE/_Slot/Sources_120_Sources @v5 #91620dcaa086
---
# Sources_120_Sources sources — source definitions

- Role:
  - SOURCE DEFINITIONS: Power Query (M) · connection specs · SQL that pulls a source — what the PULL automation reads. Shared by several cases.
  - PULL: reads `sources/` → pulls the raw data into `data/extract/`.
- May hold / may not hold: Points at secrets by env NAME, never holds a real secret. Not here: the config of one case (→ the root of `tasks/<case>/`).
- Naming: The name is `sources/` — not `src` or `raw`.
