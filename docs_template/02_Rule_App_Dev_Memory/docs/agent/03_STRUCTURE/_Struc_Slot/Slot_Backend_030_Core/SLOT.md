---
id: Slot_30
aka: 03-30
name: core
version: 3
path: backend/src/core/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_030_Core @v3 #72f521ee1b66
---
# Slot_Backend_030_Core core — composition root

- Vai trò:
  - COMPOSITION ROOT: DI / registry / router / runtime / lifecycle nối các module (wiring).
  - Cross-cutting: luôn ở cấp `src/` gốc.
- Được chứa / không chứa: Không chứa: business logic — chống core thành nơi dồn tạp nham.
