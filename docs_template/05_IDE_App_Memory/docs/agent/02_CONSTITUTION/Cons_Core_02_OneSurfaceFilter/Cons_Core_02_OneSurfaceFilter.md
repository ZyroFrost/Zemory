---
id: Cons_2
aka: 01-2
name: one-surface-filter
version: 5
kind: judgment
applies: [App]
from: _Store/02_CONSTITUTION/Cons_Core_02_OneSurfaceFilter @v5 #14027bd93338
---
# Cons_Core_02_OneSurfaceFilter Cùng chức năng thì dùng chung một bề mặt + bộ lọc

- Trước khi thêm bảng / hộp thoại / màn mới ⇒ rà cái sẵn có; trùng chức năng thì thêm chế độ lọc, không nhân bản.
- Bộ lọc thuần "chọn dòng nào hiện", không đổi cái được tính. Chế độ mới mà đổi logic tính ⇒ tách ra, không nhét vào.
- Lý do: hai bề mặt tự vẽ riêng sớm muộn nói hai sự thật khác nhau về cùng một dữ liệu; gộp lại thì lớp lỗi đó không xảy ra được về mặt cấu trúc.

> Điều GỢI Ý: đưa ra một lần lúc dựng repo. Giữ thì nó là điều của hiến pháp repo; không cần thì xoá folder này — `sync` không thêm lại và không sửa điều hiến pháp.

## Ví dụ

- Tình huống: Một app đối soát có màn "Chi tiết hóa đơn". Cần thêm một màn xem hóa đơn trong khung giờ thời gian thực.
- ✗ Sai: Vẽ một bảng mới với truy vấn riêng. Sau vài tuần, hai bảng đếm "hóa đơn chưa ký" ra hai số khác nhau cho cùng một cửa hàng và cùng một ngày.
- ✓ Đúng: Dùng lại bảng "Chi tiết hóa đơn" và thêm chế độ lọc theo giờ. Bộ lọc chỉ quyết định dòng nào hiện, cách tính giữ nguyên. Nếu chế độ mới phải tính khác thì tách thành bảng riêng.
