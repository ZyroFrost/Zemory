---
id: Slot_147
name: software
version: 1
path: Software/
scope: layout
---
# Software_147_Software software — nơi đặt bản cài phần mềm

- Vai trò:
  - Mọi phần mềm cài được chọn chỗ đều cài vào đây, xếp theo nhóm (`Software_148_Group`). Phần mềm bắt buộc cài vào ổ hệ
    thống thì để nguyên chỗ đó, chỉ giữ bộ cài ở `Software/<Nhóm>/<Ứng dụng>/Setup/`.
  - Máy mới dựng lại bộ phần mềm bằng cách chạy từng `Setup/` theo cây này.
- Được chứa / không chứa:
  - Chứa: đúng bảy nhóm của `Software_148_Group`.
  - Không chứa: repo · dữ liệu làm việc · file lẻ ở cấp `Software/`.
- Khuôn tên: `Software`, cố định.
- Đồng bộ: không vào git, không đồng bộ (bản cài là của máy; bộ cài tải lại được).
