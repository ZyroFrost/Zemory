---
id: Slot_13
aka: 03-13
name: commands
version: 4
path: backend/src/commands/
from: _Store/02_STRUCTURE/_Slot/Backend_013_Commands @v4 #583e3530d88b
---
# Backend_013_Commands commands — lệnh CLI

- Vai trò:
  - Lệnh CLI khi app là CLI.
  - Surface mỏng cho CLI: chỉ wire vào domain, không chứa nghiệp vụ.
- Được chứa / không chứa: Không chứa: nghiệp vụ.
- Khuôn tên: Mỗi verb một file.
