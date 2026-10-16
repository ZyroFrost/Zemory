---
id: Cons_4
aka: 01-4
name: docs-match-code
version: 5
kind: judgment
applies: [App]
from: _Store/02_CONSTITUTION/Cons_Core_04_DocsMatchCode @v5 #9a43202db450
---
# Cons_Core_04_DocsMatchCode Tài liệu nằm trong sản phẩm phải khớp code, sửa trong cùng thay đổi

- Đổi chức năng mà không rà lại phần hướng dẫn hiện cho người dùng = lỗi tài liệu, sửa như lỗi.
- Cùng nguyên tắc với "index phải khớp code": tài liệu lệch nguy hơn thiếu, vì người đọc tin nó.

> Điều GỢI Ý: đưa ra một lần lúc dựng repo. Giữ thì nó là điều của hiến pháp repo; không cần thì xoá folder này — `sync` không thêm lại và không sửa điều hiến pháp.

## Ví dụ

- Tình huống: Một app báo cáo có trang "Hướng dẫn" liệt kê các loại cảnh báo. Agent vừa gỡ bớt một loại cảnh báo trong code.
- ✗ Sai: Chỉ sửa code. Trang Hướng dẫn vẫn ghi "9 loại", người dùng đi tìm một loại đã không còn và nghĩ app bị lỗi.
- ✓ Đúng: Trong cùng lần sửa đó, rà lại trang Hướng dẫn và cập nhật cho khớp. Tốt hơn nữa là cho phần mô tả sinh ra từ cùng danh mục mà code dùng.
