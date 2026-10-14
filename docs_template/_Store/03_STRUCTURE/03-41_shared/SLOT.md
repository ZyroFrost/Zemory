---
id: 03-41
name: shared
version: 1
path: backend/src/shared/
applies: [App]
---
# 03-41 shared — code + type dùng chung BE↔FE

- Vai trò:
  - DÙNG CHUNG BE↔FE: type + RUNTIME (zod schema, hằng số, pure logic). FE import từ đây.
  - Type thuần → `shared/types`.
  - Escape-hatch: FE publish độc lập / đa client / SDK → nâng lên `contracts/` ở gốc + `packages/contracts` (cắt coupling).
- Được chứa / không chứa: Không chứa: file spec hợp đồng (→ `contracts/`).
