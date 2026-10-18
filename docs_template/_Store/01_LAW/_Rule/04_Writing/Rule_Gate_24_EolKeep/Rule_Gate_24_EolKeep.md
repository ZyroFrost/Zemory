---
id: Rule_24
aka: 02-24
name: eol-keep
version: 10
kind: content
code: 04_Writing
---
# Rule_Gate_24_EolKeep — Keep the line endings when editing a file

## What
An edited file keeps its line endings (CRLF stays CRLF). Edits are made piece by piece, never by reading the whole file and
writing it all back.

## When
- Editing a file that exists.
- A machine builds a file from other files.
- A file's line endings are found mixed or off.

## Do
1. The repo's line endings are fixed in `.gitattributes` (the root slot of `02_STRUCTURE`).
2. Not fixed there ⇒ an edited file keeps its own line endings, and the edit is made piece by piece.
3. Never read the whole file and write it all back: that changes the whole file (every line in the diff, blame lost) and drops what
   another session just inserted.
4. A file built from another takes the line endings of its source.
5. Endings already off ⇒ convert once, in a separate labelled commit, proved by an empty `git diff --ignore-cr-at-eol`; never
   convert back.

## Example
- Situation: two sessions edit the same standard file that uses Windows line endings.
- ✗ Wrong: the second session reads the whole file from an old copy and writes over it; the diff shows the whole file changed and
  three lines the other session just added are gone.
- ✓ Right: edit only the piece that needs it, keeping the existing line endings.

## Check
- The guard blocks a write that turns CRLF into LF.

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

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — overwriting is destroying · ghi đè là phá dữ liệu
