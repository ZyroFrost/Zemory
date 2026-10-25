---
id: Slot_18
aka: 03-18
name: cache
version: 5
path: backend/src/cache/
---
# Backend_018_Cache cache — the application cache layer

- Role:
  - The application CACHE layer: Redis/memcached client + TTL/invalidation.
  - Cache has 3 clear places: the app cache layer (client + policy) → `cache/` · runtime cache files → `data/cache/` · never mixed into `store/` (the primary DB).
- May hold / may not hold: Not here: runtime cache files (→ `data/cache/`) · the primary DB (→ `store/`).
