---
id: Slot_50
aka: 03-50
name: scripts
version: 5
path: backend/scripts/
from: _Store/02_STRUCTURE/_Slot/Backend_050_Scripts @v5 #0426b6fdc01d
---
# Backend_050_Scripts scripts — dev/build/ops/deploy scripts

- Role:
  - Dev / build / ops / DEPLOY scripts, with `sql/` for one-off SQL.
  - Fixing a version + a manual deploy to a target machine/VM: git tag (vX.Y.Z) → `dist/` (build) → `backend/scripts/deploy.*` → back the old copy ON the target machine up into `attic/` BEFORE overwriting.
  - Packaging uses existing slots: `.spec` (root) + `backend/scripts` + `backend/resources/packaging` + `dist/` + the OS app-data folder (installed).
  - Visual diagrams generated from data → the script is here, the render goes to `exports/`.
  - `scripts/` ≠ `tools/` (tools an LLM calls).
