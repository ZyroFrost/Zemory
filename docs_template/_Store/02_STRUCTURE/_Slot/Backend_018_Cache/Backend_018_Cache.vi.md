---
version: 5
lang: vi
---
# Backend_018_Cache cache — lớp cache ứng dụng

- Vai trò:
  - Lớp CACHE ứng dụng: Redis/memcached client + TTL/invalidate.
  - Cache có 3 chỗ rõ: lớp cache app (client + policy) → `cache/` · file cache runtime → `data/cache/` · không lẫn vào `store/` (primary DB).
- Được chứa / không chứa: Không chứa: file cache runtime (→ `data/cache/`) · primary DB (→ `store/`).
