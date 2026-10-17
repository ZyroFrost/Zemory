---
id: Rule_5
aka: 02-5
name: gitignore-hides
version: 3
kind: action
---
# Rule_Gate_05_GitignoreHides `.gitignore` là giấu, không phải dọn

- File nháp ghi ra thư mục nháp ngoài repo.
- Buộc phải ghi trong repo (công cụ ép đường dẫn · script cần cwd) ⇒ đặt tên `_scratch_*` và xoá trong cùng lượt; lệnh xoá đi qua chốt `Rule_Gate_10_ConfirmDelete`.
- Thêm pattern vào `.gitignore` không tính là đã dọn: file vẫn nằm trên đĩa và vẫn lớn lên.
- Phép kiểm: cổng `hook:precommit-guard`.

## Ví dụ

- Tình huống: Agent giải nén một gói dữ liệu nguồn vào repo để dò, kèm chép một môi trường chạy script vào cùng chỗ.
- ✗ Sai: Thấy `git status` báo bẩn thì thêm thư mục đó vào `.gitignore` và coi như xong; thư mục vẫn còn đó, tháng sau phình thêm vài GB.
- ✓ Đúng: Ghi file nháp ra thư mục nháp ngoài repo; bắt buộc phải ghi trong repo thì đặt tên `_scratch_*` và xin xoá ngay trong lượt đó.
