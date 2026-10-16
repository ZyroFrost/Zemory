---
id: Slot_47
aka: 03-47
name: graph
version: 4
path: backend/src/<domain>/graph/
from: _Store/03_STRUCTURE/_Slot/Backend_047_Graph @v4 #c38d7af4ad05
---
# Backend_047_Graph graph — engine graph dẫn xuất

- Vai trò:
  - Engine graph dẫn xuất: import-graph · symbol · docs-graph · touches.
  - LỒNG trong domain (`backend/src/<domain>/`), không phải slot thứ 5 (theo điều hiến pháp về slot graph, nếu project có khai).
  - Consumer ngoài đọc qua `graph export` có version.
