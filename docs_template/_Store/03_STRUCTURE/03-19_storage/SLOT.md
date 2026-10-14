---
id: 03-19
name: storage
version: 1
path: backend/src/storage/
applies: [App]
---
# 03-19 storage — object/blob & file-upload

- Vai trò:
  - OBJECT/BLOB & file-upload: validate / transform / ký URL.
  - Chia 4 chỗ: quản lý → `storage/` · client S3 (SaaS) → `integrations/` · bytes runtime → `data/uploads/` · metadata → `store/`.
- Được chứa / không chứa: Không chứa: client SaaS · bytes · metadata (xem chia chỗ ở trên).
