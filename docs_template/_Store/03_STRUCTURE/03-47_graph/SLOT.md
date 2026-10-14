---
id: 03-47
name: graph
version: 1
path: backend/src/<domain>/graph/
applies: [App]
---
# 03-47 graph — engine graph dẫn xuất

- Vai trò:
  - Engine graph dẫn xuất: import-graph · symbol · docs-graph · touches.
  - LỒNG trong domain (`backend/src/<domain>/`), không phải slot thứ 5 (theo điều hiến pháp về slot graph, nếu project có khai).
  - Consumer ngoài đọc qua `graph export` có version.
