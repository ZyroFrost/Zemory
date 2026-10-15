---
id: Slot_41
aka: 03-41
name: shared
version: 2
path: backend/src/shared/
applies: [App]
---
# Slot_Backend_041_Shared shared — code + type dùng chung BE↔FE

- Vai trò:
  - DÙNG CHUNG BE↔FE: type + RUNTIME (zod schema, hằng số, pure logic). FE import từ đây.
  - Type thuần → `shared/types`.
  - Escape-hatch: FE publish độc lập / đa client / SDK → nâng lên `contracts/` ở gốc + `packages/contracts` (cắt coupling).
- Được chứa / không chứa: Không chứa: file spec hợp đồng (→ `contracts/`).
