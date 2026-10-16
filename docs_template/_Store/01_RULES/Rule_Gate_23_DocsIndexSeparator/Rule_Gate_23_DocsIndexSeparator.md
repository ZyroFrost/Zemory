---
id: Rule_23
aka: 02-23
name: docs-index-separator
version: 3
kind: content
---
# Rule_Gate_23_DocsIndexSeparator Separator của chỉ mục docs giữ theo OS

- Đường dẫn trong chỉ mục docs giữ separator của OS (`docs\agent\05_TODO.md` trên Windows); mọi chỗ tra ghép đường dẫn bằng `join`.
- Không chuẩn hoá sang `/` cho đẹp. Hậu quả đã đo: `plan ls` báo chỉ mục rỗng, `reindex` đẻ bản ghi trùng.
- Muốn đổi separator ⇒ một migration riêng đổi chỉ mục cũ và mọi chỗ tra trong cùng bước.
- Phép kiểm: cổng `test:docs-index-separator`.

## Ví dụ

- Tình huống: một phiên agent thấy chỉ mục tài liệu lưu đường dẫn kiểu `docs\agent\...` và muốn đổi sang `/` cho thống nhất.
- ✗ Sai: đổi cách ghi ở một chỗ — lệnh liệt kê báo chỉ mục rỗng, lần dựng lại sau sinh bản ghi trùng.
- ✓ Đúng: giữ separator của hệ điều hành, mọi chỗ ghép đường dẫn bằng `join`; muốn đổi thì làm một migration riêng đổi cả dữ liệu cũ và mọi chỗ tra trong cùng bước.
