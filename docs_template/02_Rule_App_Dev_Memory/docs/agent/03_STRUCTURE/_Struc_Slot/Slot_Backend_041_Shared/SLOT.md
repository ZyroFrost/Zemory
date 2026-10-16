---
id: Slot_41
aka: 03-41
name: shared
version: 3
path: backend/src/shared/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_041_Shared @v3 #e710269af9e6
---
# Slot_Backend_041_Shared shared — code + type dùng chung BE↔FE

- Vai trò:
  - DÙNG CHUNG BE↔FE: type + RUNTIME (zod schema, hằng số, pure logic). FE import từ đây.
  - Type thuần → `shared/types`.
  - Escape-hatch: FE publish độc lập / đa client / SDK → nâng lên `contracts/` ở gốc + `packages/contracts` (cắt coupling).
- Được chứa / không chứa: Không chứa: file spec hợp đồng (→ `contracts/`).
