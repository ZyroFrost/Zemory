---
id: Rule_33
aka: 02-33
name: docs-md-source
version: 4
kind: judgment
---
# Rule_Keys_33_DocsMdSource Docs: file .md là nguồn, chỉ sửa bằng tay

- File `.md` trong `docs/` là nguồn; sửa trực tiếp bằng tay, đúng file, đúng vai trò.
- Changelog đúng khuôn `## [YYYY-MM-DD] — tiêu đề`.
- Không cần chạy gì thêm sau khi sửa.
- Muốn `plan search` · `changelog search` tươi ⇒ `zemory reindex` (dựng lại chỉ mục tìm kiếm, không ghi ngược file).

## Ví dụ

- Tình huống: cần sửa một đoạn trong spec thiết kế.
- ✗ Sai: sửa qua một lệnh ghi vào cơ sở dữ liệu rồi xuất ngược ra file — lần đồng bộ sau đè mất phần người khác vừa sửa tay.
- ✓ Đúng: mở đúng file `.md`, sửa trực tiếp; cần tìm kiếm tươi thì chạy `zemory reindex` (chỉ dựng lại chỉ mục, không ghi ngược file).
