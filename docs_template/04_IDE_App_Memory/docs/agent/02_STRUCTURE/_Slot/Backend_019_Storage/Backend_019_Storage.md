---
id: Slot_19
aka: 03-19
name: storage
version: 4
path: backend/src/storage/
from: _Store/02_STRUCTURE/_Slot/Backend_019_Storage @v4 #7f40239b799d
---
# Backend_019_Storage storage — object/blob & file-upload

- Vai trò:
  - OBJECT/BLOB & file-upload: validate / transform / ký URL.
  - Chia 4 chỗ: quản lý → `storage/` · client S3 (SaaS) → `integrations/` · bytes runtime → `data/uploads/` · metadata → `store/`.
- Được chứa / không chứa: Không chứa: client SaaS · bytes · metadata (xem chia chỗ ở trên).
