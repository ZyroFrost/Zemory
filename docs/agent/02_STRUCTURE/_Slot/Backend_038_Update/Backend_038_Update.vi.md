---
version: 5
lang: vi
---
# Backend_038_Update update — tự cập nhật phiên bản

- Vai trò:
  - VERSION-UP tự động: check Releases/registry + tải + apply.
  - Phối `attic/` (backup) + `dist/` (bản mới) + `migrations/`.
  - App phát hành qua package manager (npm/pip) có thể không cần slot này — ghi rõ lý do.
