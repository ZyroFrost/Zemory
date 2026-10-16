---
id: Slot_34
aka: 03-34
name: logging
version: 3
path: backend/src/logging/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_034_Logging @v3 #fbabdaa015f2
---
# Slot_Backend_034_Logging logging — logger + observability

- Vai trò:
  - LOGGER (level / format / sink) + observability (metrics / trace). Là debug/vận hành — khác audit trail.
  - Log file → `data/logs/` · APM/Sentry/Datadog → `integrations/`.
- Được chứa / không chứa: Không chứa: log file · client APM · audit trail (→ `audit/`).
