---
id: Slot_27
aka: 03-27
name: pipelines
version: 5
path: backend/src/pipelines/
from: _Store/02_STRUCTURE/_Slot/Backend_027_Pipelines @v5 #898e98eabe24
---
# Backend_027_Pipelines pipelines — multi-step ETL / ingest / batch

- Role:
  - MULTI-STEP ETL / ingest / batch — the data pipeline.
  - Not `jobs/` (on a schedule) nor `events/` (reacting to an event); not `agents/` (model-driven): pipelines are deterministic.
- May hold / may not hold: Not here: the schedule (→ `jobs/`) · event consumers (→ `events/`).
