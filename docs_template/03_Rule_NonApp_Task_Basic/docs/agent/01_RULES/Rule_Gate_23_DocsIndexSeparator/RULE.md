---
id: Rule_23
aka: 02-23
name: docs-index-separator
version: 2
kind: content
from: _Store/01_RULES/Rule_Gate_23_DocsIndexSeparator @v2 #120a021b8e0d
---
# Rule_Gate_23_DocsIndexSeparator Separator của chỉ mục docs giữ theo OS

- Đường dẫn trong chỉ mục docs giữ separator của OS (`docs\agent\05_TODO.md` trên Windows); mọi chỗ tra ghép đường dẫn bằng `join`.
- Không chuẩn hoá sang `/` cho đẹp. Hậu quả đã đo: `plan ls` báo chỉ mục rỗng, `reindex` đẻ bản ghi trùng.
- Muốn đổi separator ⇒ một migration riêng đổi chỉ mục cũ và mọi chỗ tra trong cùng bước.
- Phép kiểm: cổng `test:docs-index-separator`.
