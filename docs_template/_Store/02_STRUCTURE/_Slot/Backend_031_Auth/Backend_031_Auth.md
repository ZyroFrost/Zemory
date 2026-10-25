---
id: Slot_31
aka: 03-31
name: auth
version: 5
path: backend/src/auth/
---
# Backend_031_Auth auth — authentication + authorization

- Role:
  - Authentication (WHO: login / jwt / oauth / session) + authorization (WHAT IS ALLOWED: roles / permissions / policies).
  - Permissions are a concern of their own: roles/permissions are defined in `auth/` · ENFORCED (guard) in `middleware/` · role data (account→role) in `store/` · policy files the operator edits in `config/`.
  - An app with several accounts / several roles → REQUIRED; a single-person/local app → write down that it has no permissions.
- May hold / may not hold: Not here: the enforcing guard (→ `middleware/`).
