---
id: Rule_46
aka: 02-46
name: other-repo-read-only
version: 3
kind: action
from: _Store/01_RULES/Rule_Gate_46_OtherRepoReadOnly @v3 #22523f5895a2
---
# Rule_Gate_46_OtherRepoReadOnly Dự án khác: đọc được, ghi cấm mặc định

- Đọc tham khảo (read-only) dự án khác để trả lời câu hỏi ⇒ được.
- Mọi thao tác GHI vào dự án khác ⇒ cấm mặc định.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: người dùng hỏi repo kia đang đặt cấu hình kết nối ra sao.
- ✗ Sai: mở repo kia, tiện tay sửa luôn chỗ thấy chưa chuẩn.
- ✓ Đúng: đọc file bên kia để trả lời; mọi thay đổi chỉ nêu thành đề xuất.
