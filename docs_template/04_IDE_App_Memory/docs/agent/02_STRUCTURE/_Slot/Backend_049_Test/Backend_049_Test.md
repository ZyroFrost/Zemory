---
id: Slot_49
aka: 03-49
name: test
version: 5
path: backend/test/
from: _Store/02_STRUCTURE/_Slot/Backend_049_Test @v5 #2db009ef706d
---
# Backend_049_Test test — automated tests

- Role:
  - Automated tests — ONLY where there is core logic that can silently go wrong. Ordinary testing = RUNNING the app.
  - Deterministic pass/fail — not `evals/` (measuring probabilistic quality).
