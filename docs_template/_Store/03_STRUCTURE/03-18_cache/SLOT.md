---
id: 03-18
name: cache
version: 1
path: backend/src/cache/
applies: [App]
---
# 03-18 cache — lớp cache ứng dụng

- Vai trò:
  - Lớp CACHE ứng dụng: Redis/memcached client + TTL/invalidate.
  - Cache có 3 chỗ rõ: lớp cache app (client + policy) → `cache/` · file cache runtime → `data/cache/` · không lẫn vào `store/` (primary DB).
- Được chứa / không chứa: Không chứa: file cache runtime (→ `data/cache/`) · primary DB (→ `store/`).
