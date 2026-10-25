---
id: Slot_21
aka: 03-21
name: services
version: 5
path: backend/src/services/
---
# Backend_021_Services services — core business logic

- Role: Business logic — the core of the business. Domain-first: the business logic sits in `src/<domain>/services`.
- May hold / may not hold: Not here: wiring/DI (→ `core/`) · pure helpers (→ `util/`).
