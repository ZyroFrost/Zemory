---
id: 03-13
name: commands
version: 1
path: backend/src/commands/
applies: [App]
---
# 03-13 commands — lệnh CLI

- Vai trò:
  - Lệnh CLI khi app là CLI.
  - Surface mỏng cho CLI: chỉ wire vào domain, không chứa nghiệp vụ.
- Được chứa / không chứa: Không chứa: nghiệp vụ.
- Khuôn tên: Mỗi verb một file.
