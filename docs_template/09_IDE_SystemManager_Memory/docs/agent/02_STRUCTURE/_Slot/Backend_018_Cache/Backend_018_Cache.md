---
id: Slot_18
aka: 03-18
name: cache
version: 5
path: backend/src/cache/
from: _Store/02_STRUCTURE/_Slot/Backend_018_Cache @v5 #f82703d1ff83
---
# Backend_018_Cache cache — the application cache layer

- Role:
  - The application CACHE layer: Redis/memcached client + TTL/invalidation.
  - Cache has 3 clear places: the app cache layer (client + policy) → `cache/` · runtime cache files → `data/cache/` · never mixed into `store/` (the primary DB).
- May hold / may not hold: Not here: runtime cache files (→ `data/cache/`) · the primary DB (→ `store/`).
