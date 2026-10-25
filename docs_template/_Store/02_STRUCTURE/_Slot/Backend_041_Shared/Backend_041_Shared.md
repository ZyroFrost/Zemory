---
id: Slot_41
aka: 03-41
name: shared
version: 5
path: backend/src/shared/
---
# Backend_041_Shared shared — code + types shared BE↔FE

- Role:
  - SHARED BE↔FE: types + RUNTIME (zod schemas, constants, pure logic). The FE imports from here.
  - Plain types → `shared/types`.
  - Escape hatch: an FE published on its own / several clients / an SDK → lift it to `contracts/` at the root + `packages/contracts` (cuts the coupling).
- May hold / may not hold: Not here: contract spec files (→ `contracts/`).
