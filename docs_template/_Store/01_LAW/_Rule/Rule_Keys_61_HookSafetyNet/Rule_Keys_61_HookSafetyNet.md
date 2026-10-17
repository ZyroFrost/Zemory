---
id: Rule_61
aka: 02-61
name: hook-safety-net
version: 5
kind: judgment
---
# Rule_Keys_61_HookSafetyNet Hook là lưới đỡ, không phải người quyết

- Hook cho qua ≠ được phép: thao tác bất khả đảo vẫn phải hỏi trước dù không bị chặn.
- Hook chặn ≠ hết việc: bị chặn thì hỏi, không tìm đường vòng.
- Cờ `.allow-*` cho qua đúng một việc đã được duyệt: chỉ tạo sau khi được cho phép rõ trong phiên; không dùng lại cho việc khác. Nhóm bí mật không có cờ.
- Chữ là tầng quyết định, máy là tầng đỡ hụt.

## Ví dụ

- Tình huống: agent muốn xoá một bảng tạm; lệnh xoá đầu tiên bị chặn, một cách khác lại không bị chặn.
- ✗ Sai: đổi sang cách không bị chặn rồi xoá, hoặc tự tạo cờ cho qua.
- ✓ Đúng: hỏi người dùng trước, dù hook có chặn hay không; được đồng ý mới tạo cờ cho đúng lệnh đó.
