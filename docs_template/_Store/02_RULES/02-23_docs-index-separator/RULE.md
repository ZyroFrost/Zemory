---
id: 02-23
name: docs-index-separator
version: 1
kind: content
---
# 02-23 Separator của chỉ mục docs giữ theo OS

- Đường dẫn trong chỉ mục docs giữ separator của OS (`docs\agent\05_TODO.md` trên Windows); mọi chỗ tra ghép đường dẫn bằng `join`.
- Không chuẩn hoá sang `/` cho đẹp. Hậu quả đã đo: `plan ls` báo chỉ mục rỗng, `reindex` đẻ bản ghi trùng.
- Muốn đổi separator ⇒ một migration riêng đổi chỉ mục cũ và mọi chỗ tra trong cùng bước.
- Phép kiểm: cổng `test:docs-index-separator`.
