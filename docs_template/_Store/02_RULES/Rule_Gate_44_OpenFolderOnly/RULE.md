---
id: Rule_44
aka: 02-44
name: open-folder-only
version: 2
kind: action
---
# Rule_Gate_44_OpenFolderOnly Chỉ làm việc trong thư mục dự án đang mở

- Mọi thao tác ghi · sửa · chạy lệnh chỉ đụng thư mục dự án đang mở.
- Chưa có cho phép rõ ràng trong phiên ⇒ tuyệt đối không ghi, không sửa, không chạy lệnh đụng vào dự án khác, gồm: lệnh `zemory` trỏ root khác · `cd` sang repo khác · sửa file bên đó.
- Cấm áp cả khi ý định là "giúp", "cứu dữ liệu" hay "tiện tay sửa luôn".
- Phép kiểm: cổng `guard`.
