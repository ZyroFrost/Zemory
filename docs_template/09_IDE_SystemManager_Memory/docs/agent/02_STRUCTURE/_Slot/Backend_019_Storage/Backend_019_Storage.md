---
id: Slot_19
aka: 03-19
name: storage
version: 5
path: backend/src/storage/
from: _Store/02_STRUCTURE/_Slot/Backend_019_Storage @v5 #cd4fb2cf975c
---
# Backend_019_Storage storage — object/blob & file upload

- Role:
  - OBJECT/BLOB & file upload: validate / transform / sign URLs.
  - Split over 4 places: management → `storage/` · the S3 client (SaaS) → `integrations/` · runtime bytes → `data/uploads/` · metadata → `store/`.
- May hold / may not hold: Not here: the SaaS client · the bytes · the metadata (see the split above).
