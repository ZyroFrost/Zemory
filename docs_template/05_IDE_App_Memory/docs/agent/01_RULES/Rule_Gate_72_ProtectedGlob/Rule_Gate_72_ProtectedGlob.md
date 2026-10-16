---
id: Rule_72
aka: 02-72
name: protected-glob
version: 3
kind: content
from: _Store/01_RULES/Rule_Gate_72_ProtectedGlob @v3 #03f38a0ccbfb
---
# Rule_Gate_72_ProtectedGlob `protected_write` nhận glob, không chỉ tiền tố

- `protected_write` nhận GLOB, không chỉ tiền tố: `data/*/01_raw` diễn đạt được "đầu vào gốc của MỌI case", thứ tiền tố không nói được vì tên case không biết trước.
- Thiếu glob thì chỉ còn hai cách, cả hai đều hỏng: liệt kê tay từng case (không bảo trì nổi), hoặc chặn cả `data` (chặn luôn chỗ agent ghi suốt ⇒ cổng bị bỏ qua).
- Phép kiểm: test `guard-gen`.

## Ví dụ

- Tình huống: mỗi tháng một case báo cáo mới được tạo, mỗi case có thư mục dữ liệu gốc riêng.
- ✗ Sai: khai từng thư mục case vào vùng cấm (quên case mới), hoặc khoá cả thư mục dữ liệu (chặn luôn chỗ agent phải ghi).
- ✓ Đúng: khai một mẫu glob kiểu `data/*/01_raw` để khoá dữ liệu gốc của mọi case hiện có và sau này.
