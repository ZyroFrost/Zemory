---
id: Slot_35
aka: 03-35
name: audit
version: 5
path: backend/src/audit/
---
# Backend_035_Audit audit — the security audit trail

- Role:
  - The security AUDIT TRAIL: who did what, and when (permission changes, deletes, sign-ins); the audit table is in `store/`.
  - Not the debug log (`data/logs/`).
  - An app with several accounts / sensitive actions → SHOULD have it; without it, write down why.
- May hold / may not hold: Not here: the debug log.
