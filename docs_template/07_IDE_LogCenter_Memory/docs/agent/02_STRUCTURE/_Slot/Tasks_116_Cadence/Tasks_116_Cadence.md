---
id: Slot_116
aka: 03-116
name: cadence
version: 5
path: tasks/<cadence>/
from: _Store/02_STRUCTURE/_Slot/Tasks_116_Cadence @v5 #2a75f2b99ae6
---
# Tasks_116_Cadence cadence — recurring cases

- Role:
  - A RECURRING / automated case (weekly report, quarterly target). Real data → `data/<case>/` (mirrors the SAME NAME).
  - The pipeline is in `tasks/<name>/pipeline/`, the launcher in `bin/<name>.cmd`.
- May hold / may not hold: Not here: recurring files dropped into `data/adhoc/` — whatever belongs to a recurring deliverable lives in `tasks/<task>/` + `data/<task>/`.
- Naming: Plain names, no numbers. The pattern `<DEPT_CODE>_<CADENCE>_<TaskName>` is each repo's own convention; the standard does not force it.
