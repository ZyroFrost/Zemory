---
id: 03-30
name: core
version: 1
path: backend/src/core/
applies: [App]
---
# 03-30 core — composition root

- Vai trò:
  - COMPOSITION ROOT: DI / registry / router / runtime / lifecycle nối các module (wiring).
  - Cross-cutting: luôn ở cấp `src/` gốc.
- Được chứa / không chứa: Không chứa: business logic — chống core thành nơi dồn tạp nham.
