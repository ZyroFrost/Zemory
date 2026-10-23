---
version: 11
lang: vi
---
# Rule_Gate_24_EolKeep — Keep the line endings when editing a file

## Luật là gì
File được sửa giữ nguyên kiểu xuống dòng (CRLF vẫn là CRLF). Sửa theo từng đoạn, không đọc cả file rồi ghi lại cả file.

## Khi nào áp
- Sửa một file đã có.
- Máy ghép một file từ các file khác.
- Thấy kiểu xuống dòng của một file bị lẫn hay lệch.

## Phải làm gì
1. Kiểu xuống dòng của repo khoá ở `.gitattributes` (slot gốc của `02_STRUCTURE`).
2. Chưa khoá ⇒ file được sửa giữ kiểu xuống dòng của chính nó, và sửa theo từng đoạn.
3. Không đọc cả file rồi ghi lại cả file: cách đó đổi cả file (mọi dòng thành diff, mất blame) và làm rơi phần phiên khác vừa chèn.
4. File ghép từ file khác lấy kiểu xuống dòng của file nguồn.
5. Đang lệch ⇒ chuyển dứt điểm một lần trong một commit riêng có nhãn, chứng minh bằng `git diff --ignore-cr-at-eol` rỗng; không
   nắn ngược.

## Ví dụ
- Tình huống: hai phiên cùng sửa một file chuẩn dùng xuống dòng kiểu Windows.
- ✗ Sai: phiên thứ hai đọc cả file từ bản cũ rồi ghi đè; diff báo cả file đổi, ba dòng phiên kia vừa thêm biến mất.
- ✓ Đúng: chỉ sửa đúng đoạn cần sửa, giữ kiểu xuống dòng sẵn có.

## Máy kiểm
- Guard chặn lần ghi đổi CRLF sang LF.
