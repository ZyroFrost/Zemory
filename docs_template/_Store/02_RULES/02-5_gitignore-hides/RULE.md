---
id: 02-5
name: gitignore-hides
version: 1
kind: action
---
# 02-5 `.gitignore` là giấu, không phải dọn

- File nháp ghi ra thư mục nháp ngoài repo.
- Buộc phải ghi trong repo (công cụ ép đường dẫn · script cần cwd) ⇒ đặt tên `_scratch_*` và xoá trong cùng lượt; lệnh xoá đi qua chốt `02-10`.
- Thêm pattern vào `.gitignore` không tính là đã dọn: file vẫn nằm trên đĩa và vẫn lớn lên.
- Phép kiểm: cổng `hook:precommit-guard`.
