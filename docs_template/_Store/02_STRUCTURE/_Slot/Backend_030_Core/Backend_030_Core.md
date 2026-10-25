---
id: Slot_30
aka: 03-30
name: core
version: 5
path: backend/src/core/
---
# Backend_030_Core core — the composition root

- Role:
  - The COMPOSITION ROOT: DI / registry / router / runtime / lifecycle wiring the modules together.
  - Cross-cutting: always at the root level of `src/`.
- May hold / may not hold: Not here: business logic — core must not become a dumping ground.
