---
id: Slot_30
aka: 03-30
name: core
version: 2
path: backend/src/core/
applies: [App]
---
# Slot_Backend_030_Core core — composition root

- Vai trò:
  - COMPOSITION ROOT: DI / registry / router / runtime / lifecycle nối các module (wiring).
  - Cross-cutting: luôn ở cấp `src/` gốc.
- Được chứa / không chứa: Không chứa: business logic — chống core thành nơi dồn tạp nham.
