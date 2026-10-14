---
id: 03-21
name: services
version: 1
path: backend/src/services/
applies: [App]
---
# 03-21 services — nghiệp vụ cốt lõi

- Vai trò: Business logic — nghiệp vụ cốt lõi. Kiểu domain-first: nghiệp vụ nằm trong `src/<domain>/services`.
- Được chứa / không chứa: Không chứa: wiring/DI (→ `core/`) · helper thuần (→ `util/`).
