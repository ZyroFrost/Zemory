---
id: Slot_18
aka: 03-18
name: cache
version: 3
path: backend/src/cache/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_018_Cache @v3 #734ac1bded94
---
# Slot_Backend_018_Cache cache — lớp cache ứng dụng

- Vai trò:
  - Lớp CACHE ứng dụng: Redis/memcached client + TTL/invalidate.
  - Cache có 3 chỗ rõ: lớp cache app (client + policy) → `cache/` · file cache runtime → `data/cache/` · không lẫn vào `store/` (primary DB).
- Được chứa / không chứa: Không chứa: file cache runtime (→ `data/cache/`) · primary DB (→ `store/`).
