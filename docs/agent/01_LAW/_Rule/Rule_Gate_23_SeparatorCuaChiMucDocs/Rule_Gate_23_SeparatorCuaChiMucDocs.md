---
id: Rule_23
aka: 02-23
name: separator-cua-chi-muc-docs
version: 1
kind: content
---
# Rule_Gate_23_SeparatorCuaChiMucDocs Separator của chỉ mục docs giữ theo OS

- `02-23` **Separator của chỉ mục docs giữ theo OS** (`docs\agent\05_TODO.md`); mọi chỗ tra ghép bằng `join`.
  Không chuẩn hoá sang `/` cho đẹp — hậu quả đã đo: `plan ls` báo chỉ mục rỗng, `reindex` đẻ bản ghi trùng. Muốn đổi
  ⇒ một migration riêng đổi chỉ mục cũ và mọi chỗ tra trong cùng bước. <!-- gate: test:docs-index-separator -->
