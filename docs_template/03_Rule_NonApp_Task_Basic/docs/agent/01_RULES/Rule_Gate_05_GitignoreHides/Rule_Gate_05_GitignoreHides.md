---
id: Rule_5
aka: 02-5
name: gitignore-hides
version: 2
kind: action
from: _Store/01_RULES/Rule_Gate_05_GitignoreHides @v2 #09f02ba78c69
---
# Rule_Gate_05_GitignoreHides `.gitignore` là giấu, không phải dọn

- File nháp ghi ra thư mục nháp ngoài repo.
- Buộc phải ghi trong repo (công cụ ép đường dẫn · script cần cwd) ⇒ đặt tên `_scratch_*` và xoá trong cùng lượt; lệnh xoá đi qua chốt `Rule_Gate_10_ConfirmDelete`.
- Thêm pattern vào `.gitignore` không tính là đã dọn: file vẫn nằm trên đĩa và vẫn lớn lên.
- Phép kiểm: cổng `hook:precommit-guard`.
