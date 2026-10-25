---
id: Slot_19
aka: 03-19
name: storage
version: 5
path: backend/src/storage/
---
# Backend_019_Storage storage — object/blob & file upload

- Role:
  - OBJECT/BLOB & file upload: validate / transform / sign URLs.
  - Split over 4 places: management → `storage/` · the S3 client (SaaS) → `integrations/` · runtime bytes → `data/uploads/` · metadata → `store/`.
- May hold / may not hold: Not here: the SaaS client · the bytes · the metadata (see the split above).
