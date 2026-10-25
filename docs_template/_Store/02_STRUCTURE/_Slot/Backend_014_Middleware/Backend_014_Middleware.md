---
id: Slot_14
aka: 03-14
name: middleware
version: 5
path: backend/src/middleware/
---
# Backend_014_Middleware middleware — the request pipeline

- Role:
  - The request pipeline: guard / cors / log / rate-limit.
  - Where permissions are ENFORCED (guard); roles/permissions are defined in `auth/`. Keep the two clearly apart.
- May hold / may not hold: Not here: definitions of roles/permissions (→ `auth/`).
