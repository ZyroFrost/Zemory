---
id: Slot_123
aka: 03-123
name: pipelines
version: 5
path: pipelines/
from: _Store/02_STRUCTURE/_Slot/Pipelines_123_Pipelines @v5 #62516cdeffce
---
# Pipelines_123_Pipelines pipelines — pipelines grouped by source

- Role:
  - Pipelines grouped by SOURCE, multi-step ETL / transforms (dbt / python) — ONLY for a repo NOT organised by case. This is the second valid shape; such a repo may have no `tasks/`, do not force it into cases.
  - A case-based repo: the pipeline sits inside the case (`tasks/<name>/pipeline/`), not here.
  - The children of `pipelines/` are free under the standard — never treated as off-standard.
- May hold / may not hold: Not here: outside code cloned in (→ `external/`).
