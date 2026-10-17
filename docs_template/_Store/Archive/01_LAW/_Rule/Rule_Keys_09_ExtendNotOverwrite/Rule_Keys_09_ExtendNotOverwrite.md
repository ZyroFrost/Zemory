---
id: Rule_9
aka: 02-9
name: extend-not-overwrite
version: 4
kind: judgment
---
# Rule_Keys_09_ExtendNotOverwrite Thêm chức năng là mở rộng, không ghi đè

- Thêm chức năng ⇒ mở rộng cái cũ, không ghi đè cái cũ.
- Chỉ ghi đè khi yêu cầu nói rõ.

## Ví dụ

- Tình huống: Cần thêm bộ lọc theo vùng vào một màn hình đã có bộ lọc theo cửa hàng.
- ✗ Sai: Viết lại cả khối bộ lọc theo cấu trúc mới; bộ lọc cửa hàng và các thiết lập người dùng đã lưu mất theo.
- ✓ Đúng: Thêm bộ lọc vùng bên cạnh cái cũ, giữ nguyên hành vi đang có; chỉ thay cái cũ khi người giao việc nói rõ.
