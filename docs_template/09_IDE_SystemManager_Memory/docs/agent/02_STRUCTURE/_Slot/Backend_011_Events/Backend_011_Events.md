---
id: Slot_11
aka: 03-11
name: events
version: 5
path: backend/src/events/
from: _Store/02_STRUCTURE/_Slot/Backend_011_Events @v5 #2be53ddd3900
---
# Backend_011_Events events — inbound events / webhooks

- Role:
  - RECEIVES and handles INBOUND events/webhooks · event bus · consumers · listeners. A webhook is just one kind of event source.
  - Not `jobs/` (on a schedule) nor `pipelines/` (multi-step): `events/` = reacting to an event.
- May hold / may not hold: Not here: scheduled jobs (→ `jobs/`) · multi-step ETL (→ `pipelines/`).
