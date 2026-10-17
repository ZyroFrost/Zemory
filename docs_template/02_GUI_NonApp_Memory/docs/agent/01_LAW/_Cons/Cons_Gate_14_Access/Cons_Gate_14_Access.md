---
id: Cons_14
name: access
version: 1
kind: content
frame: true
from: _Store/01_LAW/_Cons/Cons_Gate_14_Access @v1 #1bae55a84a98
---
# Cons_Gate_14_Access Truy cập và bảo mật

- Repo phải khai trong `Cons.md` của khung này: ai được dùng sản phẩm · gác quyền ở lớp nào · mặc định khi chưa khai quyền (chặn hay cho) · bí mật hệ dùng (chỉ TÊN, không giá trị) · sản phẩm có mở ra mạng hay chỉ chạy trên máy.
- Tên bí mật khai ở đây là nguồn cho khoá `secretNames` của guard.
- Không có người dùng hay bí mật nào ⇒ `status: n/a` kèm lý do.
- Lối đúng: viết `Cons.md` theo mẫu, hoặc ghi `status: n/a` kèm lý do.
- Phép kiểm: `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.

## Ví dụ

- Tình huống: một app nội bộ có người xem và người sửa viết `Cons.md` cho khung này.
- ✗ Sai: chỉ ghi "phân quyền theo vai trò"; agent thêm chức năng ghi mới và ẩn nút với người xem, nhưng máy chủ vẫn nhận lệnh ghi từ họ.
- ✓ Đúng: "Gác ở máy chủ, mặc định chặn: thêm chức năng ghi mới thì người xem bị chặn cho tới khi được khai cho phép. Ẩn nút trên giao diện không tính là bảo mật."
