---
id: 02-56
name: allow-flag-once
version: 1
kind: action
---
# 02-56 Cờ `.allow-*` = duyệt MỘT VIỆC

- Cờ `.allow-*` cho qua đúng một việc đã được duyệt.
- Agent chỉ tạo cờ SAU khi có phê duyệt rõ trong phiên.
- Guard cho qua rồi đóng dấu `ZEMORY-USED <vân tay lệnh> <thời điểm>` vào chính file cờ. KHÔNG xoá cờ ngay: hook `PreToolUse` chỉ biết mình *cho qua*, không biết lệnh có thật sự chạy; một tầng khác của host chặn lại thì cờ mất oan.
- Trong **90 giây**, ĐÚNG lệnh đó được thử lại. Xin việc KHÁC hoặc quá hạn ⇒ cờ bị thu hồi, phải xin lại.
- Nhóm secret KHÔNG có cờ.
- Phép kiểm: cổng `guard`.
