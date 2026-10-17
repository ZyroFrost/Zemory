---
id: Slot_38
aka: 03-38
name: update
version: 4
path: backend/src/update/
from: _Store/02_STRUCTURE/_Slot/Backend_038_Update @v4 #c8eeeb82bea4
---
# Backend_038_Update update — tự cập nhật phiên bản

- Vai trò:
  - VERSION-UP tự động: check Releases/registry + tải + apply.
  - Phối `attic/` (backup) + `dist/` (bản mới) + `migrations/`.
  - App phát hành qua package manager (npm/pip) có thể không cần slot này — ghi rõ lý do.
