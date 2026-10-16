---
id: Rule_29
aka: 02-29
name: code-english
version: 6
kind: judgment
---
# Rule_Gate_29_CodeEnglish Mã và comment viết tiếng Anh

- Phạm vi: mã của app, script · pipeline · measure — comment · docstring · tên biến/hàm · log kỹ thuật.
- Một file một ngôn ngữ.
- Commit message: tiếng Anh hoặc tiếng Việt có dấu.
- Không dịch ba thứ:
  1. Chuỗi render cho người đọc (desc · note của bảng/cột sinh vào `docs/`, nhãn UI qua i18n, nhãn report).
  2. Tên do bên khác đặt (cột Excel · trường API · tên file nguồn) — giữ từng ký tự, dù trông như Việt mất dấu.
  3. Thuật ngữ chuyên ngành.
- Comment tiếng Việt cũ: sửa khi đang đụng file đó, không mở đợt dịch hàng loạt.
- Phép kiểm: hook — dòng comment mới hoặc vừa sửa trong file code mà có chữ Việt thì bị chặn; comment cũ chưa đụng tới không bị bắt.

## Ví dụ

- Tình huống: sửa một hàm tính doanh thu trong script nạp dữ liệu.
- ✗ Sai: thêm comment "tinh doanh thu theo thang" và đổi tên cột Excel nguồn `Ma_KH` thành `customer_code` cho đẹp.
- ✓ Đúng: comment viết "Compute monthly revenue"; tên cột do hệ nguồn đặt giữ nguyên từng ký tự; nhãn hiện cho người đọc vẫn đi qua i18n.
