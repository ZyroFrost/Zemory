---
id: 03-34
name: logging
version: 1
path: backend/src/logging/
applies: [App]
---
# 03-34 logging — logger + observability

- Vai trò:
  - LOGGER (level / format / sink) + observability (metrics / trace). Là debug/vận hành — khác audit trail.
  - Log file → `data/logs/` · APM/Sentry/Datadog → `integrations/`.
- Được chứa / không chứa: Không chứa: log file · client APM · audit trail (→ `audit/`).
