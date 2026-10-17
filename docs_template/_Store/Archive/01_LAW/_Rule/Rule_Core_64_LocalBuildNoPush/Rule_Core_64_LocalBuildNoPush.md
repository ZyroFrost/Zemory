---
id: Rule_64
aka: 02-64
name: local-build-no-push
version: 3
kind: judgment
applies: [App]
---
# Rule_Core_64_LocalBuildNoPush Sửa mã chạy trên máy này không cần push

- Mã chạy trên chính máy đang sửa ⇒ build là bản mới chạy ngay; không push chỉ để bản sửa có hiệu lực.

## Ví dụ

- Tình huống: agent sửa lỗi hiển thị trong công cụ nội bộ đang chạy trên chính máy này.
- ✗ Sai: push lên remote để "cập nhật bản đang chạy".
- ✓ Đúng: build lại là bản mới chạy ngay trên máy; push chỉ khi có lệnh push.
