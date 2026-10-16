---
id: Slot_44
aka: 03-44
name: modules
version: 3
path: backend/src/modules/
---
# Slot_Backend_044_Modules modules — gói theo domain/feature

- Vai trò:
  - Gói theo DOMAIN/feature CỦA MÌNH — đơn vị của kiểu domain-first; bên trong lồng lại slot cùng từ điển. Cũng dùng làm provider theo capability.
  - Khác `plugins/` (điểm mở rộng cho bên thứ 3).
- Được chứa / không chứa: Không chứa: slot cross-cutting (luôn ở `src/` gốc).
