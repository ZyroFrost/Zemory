---
id: Rule_24
aka: 02-24
name: eol-keep
version: 9
kind: content
code: 04_Writing
from: _Store/01_LAW/_Rule/04_Writing/Rule_Gate_24_EolKeep @v9 #62e8ef3406cf
---
# Rule_Gate_24_EolKeep Giữ kiểu xuống dòng khi sửa file

- Kiểu xuống dòng của repo khoá ở `.gitattributes` (slot gốc của `02_STRUCTURE`).
- Chưa khoá ⇒ sửa file có sẵn giữ nguyên kiểu xuống dòng của nó (CRLF ghi lại CRLF) và sửa theo từng đoạn.
- Không đọc cả file rồi ghi lại cả file: cách đó đổi cả file (mọi dòng thành diff, mất blame) và làm rơi phần phiên khác vừa chèn.
- File máy ghép từ file khác lấy EOL của file nguồn. Đang lệch ⇒ chuyển dứt điểm trong một commit riêng có nhãn, chứng minh bằng `git diff --ignore-cr-at-eol` rỗng; không nắn ngược.
- Lối đúng: sửa bằng Edit theo từng đoạn; không ghi lại cả file.
- Phép kiểm: guard chặn lần ghi đổi CRLF sang LF.

## Ví dụ

- Tình huống: hai phiên cùng sửa một file chuẩn dùng xuống dòng kiểu Windows.
- ✗ Sai: phiên thứ hai đọc cả file từ bản cũ rồi ghi đè; diff báo cả file đổi, ba dòng phiên kia vừa thêm biến mất.
- ✓ Đúng: sửa đúng đoạn cần sửa, giữ kiểu xuống dòng sẵn có.
