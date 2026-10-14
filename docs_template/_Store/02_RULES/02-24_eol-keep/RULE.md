---
id: 02-24
name: eol-keep
version: 1
kind: content
---
# 02-24 EOL: khoá bằng máy trước, chưa khoá thì đọc sao ghi vậy

- Repo phải có `.gitattributes` với `* text=auto eol=lf`, đặt TRƯỚC các dòng LFS (dòng sau đè dòng trước).
- Chưa khoá ⇒ sửa file có sẵn giữ nguyên kiểu xuống dòng của nó (đọc dạng byte, CRLF ghi lại CRLF) và sửa theo từng đoạn.
- Không đọc-cả-file-rồi-ghi-lại: cách đó đổi cả file sang LF (mọi dòng thành diff, mất blame) và làm rơi phần phiên khác vừa chèn.
- File máy ghép từ file khác (archive ← `05_TODO` / `06_CHANGES`) lấy EOL của file nguồn. Khi đang lệch, lượt ghi đầu tiên đảo cả file một lần — đó là giá trả một lần, không phải lỗi tool: chuyển dứt điểm trong một commit riêng có nhãn, chứng minh bằng `git diff --ignore-cr-at-eol` rỗng.
- Không nắn ngược, không dựng cổng "EOL không được đổi" — mặt ghép archive đã có test của lệnh `archive` canh.
- Phép kiểm: cổng `guard`.
