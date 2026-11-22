---
id: Slot_34
aka: 03-34
name: logging
version: 4
path: backend/src/logging/
from: _Store/02_STRUCTURE/_Slot/Backend_034_Logging @v4 #36ce4f9e2595
---
# Backend_034_Logging logging — logger + observability

- Vai trò:
  - LOGGER (level / format / sink) + observability (metrics / trace). Là debug/vận hành — khác audit trail.
  - Log file → `data/logs/` · APM/Sentry/Datadog → `integrations/`.
- Được chứa / không chứa: Không chứa: log file · client APM · audit trail (→ `audit/`).
