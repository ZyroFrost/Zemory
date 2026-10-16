---
id: Slot_19
aka: 03-19
name: storage
version: 3
path: backend/src/storage/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_019_Storage @v3 #ac9cfd1b4521
---
# Slot_Backend_019_Storage storage — object/blob & file-upload

- Vai trò:
  - OBJECT/BLOB & file-upload: validate / transform / ký URL.
  - Chia 4 chỗ: quản lý → `storage/` · client S3 (SaaS) → `integrations/` · bytes runtime → `data/uploads/` · metadata → `store/`.
- Được chứa / không chứa: Không chứa: client SaaS · bytes · metadata (xem chia chỗ ở trên).
