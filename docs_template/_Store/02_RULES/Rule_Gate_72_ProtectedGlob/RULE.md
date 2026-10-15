---
id: Rule_72
aka: 02-72
name: protected-glob
version: 2
kind: content
---
# Rule_Gate_72_ProtectedGlob `protected_write` nhận glob, không chỉ tiền tố

- `protected_write` nhận GLOB, không chỉ tiền tố: `data/*/01_raw` diễn đạt được "đầu vào gốc của MỌI case", thứ tiền tố không nói được vì tên case không biết trước.
- Thiếu glob thì chỉ còn hai cách, cả hai đều hỏng: liệt kê tay từng case (không bảo trì nổi), hoặc chặn cả `data` (chặn luôn chỗ agent ghi suốt ⇒ cổng bị bỏ qua).
- Phép kiểm: test `guard-gen`.
