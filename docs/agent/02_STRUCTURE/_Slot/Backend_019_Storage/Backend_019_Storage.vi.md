---
version: 5
lang: vi
---
# Backend_019_Storage storage — object/blob & file-upload

- Vai trò:
  - OBJECT/BLOB & file-upload: validate / transform / ký URL.
  - Chia 4 chỗ: quản lý → `storage/` · client S3 (SaaS) → `integrations/` · bytes runtime → `data/uploads/` · metadata → `store/`.
- Được chứa / không chứa: Không chứa: client SaaS · bytes · metadata (xem chia chỗ ở trên).
