---
id: Slot_44
aka: 03-44
name: modules
version: 5
path: backend/src/modules/
---
# Backend_044_Modules modules — packages by domain/feature

- Role:
  - Packages by OUR OWN DOMAIN/feature — the unit of domain-first; inside, the same slot dictionary nests again. Also used as a provider per capability.
  - Not `plugins/` (extension points for third parties).
- May hold / may not hold: Not here: cross-cutting slots (always at the root of `src/`).
