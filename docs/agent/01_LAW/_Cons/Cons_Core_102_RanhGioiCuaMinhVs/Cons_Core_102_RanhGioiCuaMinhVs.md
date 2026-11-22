---
id: Cons_102
aka: 01-2
name: ranh-gioi-cua-minh-vs
version: 1
kind: content
---
# Cons_Core_102_RanhGioiCuaMinhVs Ranh giới "của mình vs của người ta".

**Ranh giới "của mình vs của người ta".** `backend/src/` = 100% code của mình, một giọng. Engine/lib/model public = gọi qua dependency/adapter (`external/` nếu clone repo) — **KHÔNG dán source người khác vào backend**. Model weight **tải/cache lúc runtime, KHÔNG commit vào repo**; dependency/model mới phải rà license (Apache-2.0 tương thích) trước khi thêm. *(gốc: build plan §2.2, §7)*

- **Chốt máy:** `license-gate.test` · `no-data-in-git.test`
