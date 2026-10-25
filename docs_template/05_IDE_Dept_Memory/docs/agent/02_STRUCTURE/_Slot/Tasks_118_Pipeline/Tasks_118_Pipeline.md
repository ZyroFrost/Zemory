---
id: Slot_118
aka: 03-118
name: pipeline
version: 7
path: tasks/<case>/pipeline/
from: _Store/02_STRUCTURE/_Slot/Tasks_118_Pipeline @v7 #970ce3f5e070
---
# Tasks_118_Pipeline pipeline — the case's own run scripts

- Role:
  - A case-based repo ⇒ the pipeline sits INSIDE its case: spec · findings · scripts in one place, one folder opened shows it all. `data/<name>/` still sits apart (heavy files, gitignored) — an exception on purpose.
  - `common.py` = the shared logic (a name without a number can be imported) + the paths declared as CONSTANTS (RAW / PROC / OUT); paths are never built by string joins in each stage.
  - Code the pipelines of SEVERAL cases share sits in `scripts/` at the repo root (Scripts_128); `common.py` imports it through the repo root, never copies it into the case (the block law of `Struc_Disk_Data`).
  - Stage ↔ playbook mapping (`03_SKILLS`): `00` = gate/pull pre-check · `01` = pull · `fill` = fill · `upload` = upload. A new task follows this numbering.
  - Intermediate files carry the stage number prefix (`01_pull.py` → `data/<case>/02_processing/01_pull_*.csv`); the EXCEPTION is the final deliverable in `03_output/`, which keeps its business name.
  - Right-size: create only the stages the task REALLY needs (2–4 is usual), never chopped up to complete a set.
  - A case still in `pipelines/<name>/` moves here WHEN it is touched (running its own tests as the safety net), never in bulk.
- May hold / may not hold: Only stage-numbered scripts + `common.py`. Not here: the case's config (→ the root of `tasks/<case>/`).
- Naming: Stages numbered flat `NN_description.py` in run order, one file per STAGE (e.g. `common.py` + `00_ready.py` · `01_pull.py` …): `00` = the gate/readiness, usually exports no data · `01`, `02`… = the steps. `NN_` has EXACTLY ONE meaning: the STAGE order. Stage names in ASCII English.
