---
id: Rule_56
aka: 02-56
name: allow-flag-once
version: 3
kind: action
---
# Rule_Gate_56_AllowFlagOnce Cờ `.allow-*` = duyệt MỘT VIỆC

- Cờ `.allow-*` cho qua đúng một việc đã được duyệt.
- Agent chỉ tạo cờ SAU khi có phê duyệt rõ trong phiên.
- Guard cho qua rồi đóng dấu `ZEMORY-USED <vân tay lệnh> <thời điểm>` vào chính file cờ. KHÔNG xoá cờ ngay: hook `PreToolUse` chỉ biết mình *cho qua*, không biết lệnh có thật sự chạy; một tầng khác của host chặn lại thì cờ mất oan.
- Trong **90 giây**, ĐÚNG lệnh đó được thử lại. Xin việc KHÁC hoặc quá hạn ⇒ cờ bị thu hồi, phải xin lại.
- Nhóm secret KHÔNG có cờ.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: người dùng đồng ý cho xoá một thư mục tạm lớn trong repo.
- ✗ Sai: tạo cờ cho phép rồi để đó, dùng tiếp cho một lệnh xoá khác vài phút sau; hoặc tự tạo cờ khi chưa ai đồng ý.
- ✓ Đúng: chỉ tạo cờ sau khi được đồng ý, chạy đúng lệnh đã xin; lệnh khác hoặc quá hạn thì cờ bị thu hồi, phải xin lại.
