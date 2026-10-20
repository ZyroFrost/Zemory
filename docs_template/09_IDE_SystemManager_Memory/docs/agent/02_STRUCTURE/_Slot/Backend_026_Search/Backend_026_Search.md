---
id: Slot_26
aka: 03-26
name: search
version: 4
path: backend/src/search/
from: _Store/02_STRUCTURE/_Slot/Backend_026_Search @v4 #d4c2c2059754
---
# Backend_026_Search search — index & retrieval

- Vai trò:
  - INDEX & retrieval (FTS / vector / Elastic): build index + query / rank / rerank.
  - App có domain search riêng → gói trong domain đó (domain-first).
  - Là một nơi THỰC THI cho tool LLM gọi.
