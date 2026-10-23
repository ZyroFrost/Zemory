---
version: 6
lang: vi
---
# Cons_Gate_10_ReadOnlySources — Outside sources are read-only

## Luật là gì
Mọi repo liệt kê trong `Cons.md` của khung này từng hệ bên ngoài mà sản phẩm đọc (cơ sở dữ liệu · API · thư mục dùng chung · hộp
thư · dịch vụ), cách đọc được phép, và ngoại lệ ghi nếu có. Nguồn ngoài chỉ được đọc, không bao giờ bị ghi, trừ chỗ đã khai.

## Khi nào áp
- Sản phẩm bắt đầu đọc một hệ ngoài mới, hoặc đổi cách đọc.
- Agent sắp ghi vào một hệ ngoài: xem ngoại lệ ở đây trước.

## Phải làm gì
1. Điền bảng nguồn trong `Cons.md`: tên · loại · cách đọc được phép. Máy chủ cơ sở dữ liệu ghi ở cột `Server`.
2. Ngoại lệ ghi phải có chủ và phạm vi hẹp: đúng một vùng, đúng một loại thao tác.
3. Không đọc hệ ngoài nào ⇒ `status: n/a` kèm lý do.
4. Repo đọc nhiều bảng giữ một bản đồ cho người đọc ở `docs/plan/01_source_map.md`: máy chủ · cơ sở dữ liệu · bảng hoặc view · ai
   nạp và nhịp nào · lần tươi cuối đo được · nguồn đó còn nuôi report hay nhánh nào khác. Mỗi dòng có số hoặc ngày đo được, hoặc
   ghi "chưa dò". Bản đồ không gộp với `sources/`: `sources/` là thứ máy kéo (sửa là số đổi), bản đồ không đổi lượt chạy nào.

## Ví dụ
- Tình huống: một app tổng hợp tài liệu từ ổ chia sẻ của công ty điền `Cons.md` của khung này.
- ✗ Sai: ghi "chỉ đọc nguồn" mà không nêu nguồn nào, đọc bằng quyền gì; một tháng sau agent thêm chức năng ghi ngược lên ổ chia sẻ
  vì không thấy chỗ nào cấm.
- ✓ Đúng: "Ổ chia sẻ: chỉ đọc qua quyền ứng dụng. Hộp thư: chỉ đọc qua quyền người đăng nhập. Ngoại lệ ghi: đúng một thư mục lưu
  bản sao, bộ phận IT làm chủ; chỉ tạo file mới, không sửa, không xoá."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.
- Guard đọc cột `Server` làm danh sách máy chủ SQL được phép (`allowedSqlServers`).
