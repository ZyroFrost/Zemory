---
id: 03-38
name: update
version: 1
path: backend/src/update/
applies: [App]
---
# 03-38 update — tự cập nhật phiên bản

- Vai trò:
  - VERSION-UP tự động: check Releases/registry + tải + apply.
  - Phối `attic/` (backup) + `dist/` (bản mới) + `migrations/`.
  - App phát hành qua package manager (npm/pip) có thể không cần slot này — ghi rõ lý do.
