---
id: Rule_72
aka: 02-72
name: protected-write-nhan-glob-khong
version: 1
kind: content
---
# Rule_Gate_72_ProtectedWriteNhanGlobKhong `protected_write` nhận GLOB, không chỉ tiền tố

- `02-72` **`protected_write` nhận GLOB, không chỉ tiền tố** (2026-08-10): `data/*/01_raw` diễn đạt được "đầu vào gốc của MỌI case" — thứ tiền tố không nói nổi vì tên case không biết trước. Thiếu nó thì hoặc liệt kê tay từng case (không ai bảo trì nổi), hoặc chặn cả `data` (chặn luôn chỗ agent ghi suốt ⇒ gate bị bỏ qua). <!-- gate: test:guard-gen -->
