---
id: Rule_17
aka: 02-17
name: structure-index-sync
version: 2
kind: content
from: _Store/01_RULES/Rule_Gate_17_StructureIndexSync @v2 #ee6fdf34d401
---
# Rule_Gate_17_StructureIndexSync `03_STRUCTURE` là index phải khớp repo

- Mọi thay đổi cấu trúc (thêm · đổi · dời slot, thêm routing) ⇒ cập nhật `03_STRUCTURE` trong cùng thay đổi đó.
- Index lệch thực tế (repo, code) ⇒ tra sai.
- Nội dung chuẩn (vai trò bắt buộc: 3 với NonApp, 4 với App · một tên cho một concern · tracked hay gitignore · adhoc khác task · …) nằm ở `03_STRUCTURE`, không lặp ở đây.
- Phép kiểm: cổng `conform`.
