---
id: Rule_5
aka: 02-5
name: gitignore-la-giau-khong-phai
version: 1
kind: content
---
# Rule_Gate_05_GitignoreLaGiauKhongPhai `.gitignore` là giấu, không phải dọn.

- `02-5` **`.gitignore` là giấu, không phải dọn.** File nháp ghi ra thư mục nháp ngoài repo. Buộc phải ghi
  trong repo (công cụ ép đường dẫn · script cần cwd) ⇒ đặt tên `_scratch_*` và xoá trong cùng lượt (xoá đường
  `_scratch_*` không cần cờ, `02-10`). Thêm pattern vào `.gitignore` không tính là đã dọn: file vẫn nằm trên đĩa và vẫn lớn lên. <!-- gate: hook:precommit-guard -->
