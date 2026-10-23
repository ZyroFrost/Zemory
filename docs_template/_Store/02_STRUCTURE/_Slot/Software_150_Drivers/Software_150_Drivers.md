---
id: Slot_150
name: drivers
version: 1
path: Software/Drivers/<Thiết bị>/
scope: layout
---
# Software_150_Drivers drivers — gói driver của một thiết bị

- Vai trò: gói driver tải về của một thiết bị (máy in, card mạng, màn hình phụ), để cài lại trên máy mới.
- Được chứa / không chứa:
  - Chứa: nguyên cây gói của hãng (`disk1/`…, `.inf`, bộ cài); không xếp lại bên trong.
  - Không theo khuôn `App/Data/Setup`: driver không có bản chạy tại chỗ.
  - File lẻ ngay dưới `Drivers/` (bộ cài driver đơn lẻ) được phép.
- Khuôn tên: `<Hãng>_<Mẫu>` (`Ricoh_2852`).
