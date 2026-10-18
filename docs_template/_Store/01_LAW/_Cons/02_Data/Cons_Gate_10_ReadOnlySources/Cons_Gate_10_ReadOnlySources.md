---
id: Cons_10
name: read-only-sources
version: 2
kind: content
code: 02_Data
frame: true
---
# Cons_Gate_10_ReadOnlySources Nguồn ngoài chỉ đọc

- Repo phải khai trong `Cons.md` của khung này: mọi hệ bên ngoài sản phẩm đọc (cơ sở dữ liệu · API · thư mục dùng chung · hộp thư · dịch vụ), cách đọc được phép, và ngoại lệ ghi nếu có.
- Ngoại lệ ghi phải có chủ và có phạm vi hẹp: đúng một vùng, đúng một loại thao tác.
- Không đọc hệ ngoài nào ⇒ `status: n/a` kèm lý do.
- Danh sách máy chủ khai ở đây là nguồn cho khoá `allowedSqlServers` của guard.
- Lối đúng: viết `Cons.md` theo mẫu, hoặc ghi `status: n/a` kèm lý do.
- Phép kiểm: `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.

## Ví dụ

- Tình huống: một app tổng hợp tài liệu từ kho chia sẻ của công ty viết `Cons.md` cho khung này.
- ✗ Sai: ghi "chỉ đọc nguồn" mà không nêu nguồn nào, đọc bằng quyền gì; một tháng sau agent thêm chức năng ghi ngược lên kho chia sẻ vì không thấy chỗ nào cấm.
- ✓ Đúng: "Kho chia sẻ: chỉ đọc qua quyền ứng dụng. Hộp thư: chỉ đọc qua quyền người đăng nhập. Ngoại lệ ghi: đúng một thư mục lưu bản sao, do bộ phận IT làm chủ; chỉ tạo file mới, không sửa, không xoá."
