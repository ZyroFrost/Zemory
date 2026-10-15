---
id: Slot_21
aka: 03-21
name: services
version: 2
path: backend/src/services/
applies: [App]
---
# Slot_Backend_021_Services services — nghiệp vụ cốt lõi

- Vai trò: Business logic — nghiệp vụ cốt lõi. Kiểu domain-first: nghiệp vụ nằm trong `src/<domain>/services`.
- Được chứa / không chứa: Không chứa: wiring/DI (→ `core/`) · helper thuần (→ `util/`).
