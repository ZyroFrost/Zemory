---
id: Slot_33
aka: 03-33
name: config
version: 5
path: backend/src/config/
from: _Store/02_STRUCTURE/_Slot/Backend_033_Config @v5 #bfb03b40a476
---
# Backend_033_Config config — config code + feature flags

- Role:
  - Config CODE: reads `.env` → settings / constants / enums, + feature flags.
  - Cross-cutting: always at the root level of `src/`.
- May hold / may not hold: Not here: secrets · config files the operator edits (→ `config/` at the root).
