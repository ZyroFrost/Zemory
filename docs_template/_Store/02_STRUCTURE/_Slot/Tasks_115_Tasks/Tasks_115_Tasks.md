---
id: Slot_115
aka: 03-115
name: tasks
version: 6
path: tasks/
---
# Tasks_115_Tasks tasks — the unit of work: 1 case = 1 folder

- Role:
  - 1 CASE = 1 FOLDER — the unit of work, RECURRING AND ON REQUEST alike. Every file of ONE case sits in the same place.
  - Why: kept flat, the findings + query + fix of one problem spread over 3 slots → looking something up means searching 3 places, and something is always missed.
  - Where does this go — ask exactly ONE question: does it belong to ONE case, or is it shared? One case ⇒ `tasks/<case>/` (spec · findings · SQL · `pipeline/`) + `data/<case>/` (heavy files). Shared by several cases ⇒ `scripts/` · `sources/` · `queries/` · `measures/` by role. Someone else's code cloned in ⇒ `external/`, even when it looks like a pipeline.
  - 3 exceptions allowed outside a case: a query several cases share → `queries/` · a metric definition → the constitution frame `Cons_Gate_12_SourceOfTruth` (section Definitions) · a long defect/spec → `docs/plan`.
  - The shared slots are not gathered under a parent folder: the department boundary already is the repo boundary (the repo name is the department name), one more level only redraws what exists.
  - The children of `tasks/` are free under the standard — never treated as off-standard. A repo organised by source may have no `tasks/`.
- Naming:
  - Every case has a PLAIN name describing the work, NO sequence number — `NN_` numbers are only for STAGES in a pipeline. Why: cases do not run in order, adding or dropping a case would renumber the whole series, and a number on a case name mixes with the STAGE numbers that do carry a meaning.
  - Case names in ASCII English.
