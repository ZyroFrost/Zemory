---
id: Slot_151
name: appconfig
version: 1
path: AppConfig/<công cụ>/
scope: layout
---
# AppConfig_151_AppConfig appconfig — cấu hình và khoá của từng công cụ

- Vai trò:
  - Cấu hình người dùng của từng công cụ mà công cụ cho đặt chỗ: git (`.gitconfig` toàn cục) · ssh (khoá, `config`) · vpn
    (hồ sơ) · công cụ đổi tài khoản agent · cấu hình máy của zemory (`location.json` trỏ tới GM).
  - Một công cụ có nhiều loại tệp thì chia: `configs/` (cấu hình) · `credentials/` (khoá, token) · `cache/` (dựng lại được).
- Được chứa / không chứa:
  - Chứa bí mật: KHÔNG bao giờ vào git, KHÔNG vào thư mục đồng bộ hay sao lưu đám mây; mang sang máy khác bằng tay.
  - Không chứa: bản cài (`Software/`) · dữ liệu làm việc.
- Khuôn tên: tên công cụ viết thường như lệnh của nó (`git` · `ssh` · `vpn` · `zemory`).
