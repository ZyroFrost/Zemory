---
id: Cons_120
aka: 01-20
name: os-path-separator
version: 1
kind: content
---
# Cons_Core_120_OsPathSeparator Separator của chỉ mục docs giữ theo OS.

**Separator của chỉ mục docs giữ theo OS** (`docs\agent\04_TODO.md` trên Windows); mọi chỗ tra ghép đường bằng `join`, không ghép
chuỗi với `/`. *(gốc: luật `02-23`; HS cho nghỉ hưu ở luật chung và chuyển về hiến pháp của repo mang công cụ, 2026-11-23)*

- **Chốt máy:** `docs-index-separator.test`
