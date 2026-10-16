---
id: Rule_44
aka: 02-44
name: open-folder-only
version: 3
kind: action
---
# Rule_Gate_44_OpenFolderOnly Chỉ làm việc trong thư mục dự án đang mở

- Mọi thao tác ghi · sửa · chạy lệnh chỉ đụng thư mục dự án đang mở.
- Chưa có cho phép rõ ràng trong phiên ⇒ tuyệt đối không ghi, không sửa, không chạy lệnh đụng vào dự án khác, gồm: lệnh `zemory` trỏ root khác · `cd` sang repo khác · sửa file bên đó.
- Cấm áp cả khi ý định là "giúp", "cứu dữ liệu" hay "tiện tay sửa luôn".
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: đang làm ở một repo, agent thấy repo bên cạnh có sổ sách lệch chuẩn và nghĩ nên sửa giúp luôn.
- ✗ Sai: chạy lệnh đồng bộ chuẩn hoặc sửa file ở repo bên cạnh "cho tiện", vì ý định là tốt.
- ✓ Đúng: chỉ thao tác trong thư mục dự án đang mở; điều thấy được ở repo kia thì báo lại, chưa được cho phép trong phiên thì không ghi gì sang đó.
