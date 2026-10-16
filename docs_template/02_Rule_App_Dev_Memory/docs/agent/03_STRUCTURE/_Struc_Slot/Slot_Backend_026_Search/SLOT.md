---
id: Slot_26
aka: 03-26
name: search
version: 3
path: backend/src/search/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_026_Search @v3 #91f8cf9d9ec8
---
# Slot_Backend_026_Search search — index & retrieval

- Vai trò:
  - INDEX & retrieval (FTS / vector / Elastic): build index + query / rank / rerank.
  - App có domain search riêng → gói trong domain đó (domain-first).
  - Là một nơi THỰC THI cho tool LLM gọi.
