---
id: Slot_41
aka: 03-41
name: shared
version: 4
path: backend/src/shared/
from: _Store/02_STRUCTURE/_Slot/Backend_041_Shared @v4 #946dcebc163f
---
# Backend_041_Shared shared — code + type dùng chung BE↔FE

- Vai trò:
  - DÙNG CHUNG BE↔FE: type + RUNTIME (zod schema, hằng số, pure logic). FE import từ đây.
  - Type thuần → `shared/types`.
  - Escape-hatch: FE publish độc lập / đa client / SDK → nâng lên `contracts/` ở gốc + `packages/contracts` (cắt coupling).
- Được chứa / không chứa: Không chứa: file spec hợp đồng (→ `contracts/`).
