---
id: Slot_38
aka: 03-38
name: update
version: 5
path: backend/src/update/
from: _Store/02_STRUCTURE/_Slot/Backend_038_Update @v5 #94766be83d89
---
# Backend_038_Update update — self-update

- Role:
  - Automatic VERSION-UP: check Releases/registry + download + apply.
  - Works with `attic/` (backup) + `dist/` (the new copy) + `migrations/`.
  - An app released through a package manager (npm/pip) may not need this slot — write down why.
