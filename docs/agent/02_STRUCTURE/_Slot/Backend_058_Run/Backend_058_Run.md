---
id: Slot_58
aka: 03-58
name: run
version: 5
path: backend/run.*
from: _Store/02_STRUCTURE/_Slot/Backend_058_Run @v5 #2890c1422905
---
# Backend_058_Run run — the app's run entry

- Role:
  - ★ The app's run entry — OR a manifest declaring `bin`/`main` instead of this file.
  - Node CLI: `bin` in the root `package.json` is ENOUGH and valid; no `backend/run.*` is needed, and ★ is still met.
