---
id: Slot_18
aka: 03-18
name: cache
version: 4
path: backend/src/cache/
from: _Store/03_STRUCTURE/_Slot/Backend_018_Cache @v4 #8ad999553f6a
---
# Backend_018_Cache cache — lớp cache ứng dụng

- Vai trò:
  - Lớp CACHE ứng dụng: Redis/memcached client + TTL/invalidate.
  - Cache có 3 chỗ rõ: lớp cache app (client + policy) → `cache/` · file cache runtime → `data/cache/` · không lẫn vào `store/` (primary DB).
- Được chứa / không chứa: Không chứa: file cache runtime (→ `data/cache/`) · primary DB (→ `store/`).
