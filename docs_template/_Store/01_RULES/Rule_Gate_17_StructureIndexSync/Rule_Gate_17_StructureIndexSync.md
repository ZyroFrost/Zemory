---
id: Rule_17
aka: 02-17
name: structure-index-sync
version: 3
kind: content
---
# Rule_Gate_17_StructureIndexSync `03_STRUCTURE` là index phải khớp repo

- Mọi thay đổi cấu trúc (thêm · đổi · dời slot, thêm routing) ⇒ cập nhật `03_STRUCTURE` trong cùng thay đổi đó.
- Index lệch thực tế (repo, code) ⇒ tra sai.
- Nội dung chuẩn (vai trò bắt buộc: 3 với NonApp, 4 với App · một tên cho một concern · tracked hay gitignore · adhoc khác task · …) nằm ở `03_STRUCTURE`, không lặp ở đây.
- Phép kiểm: cổng `conform`.

## Ví dụ

- Tình huống: Agent thêm một thư mục mới chứa các câu truy vấn dùng chung.
- ✗ Sai: Tạo thư mục, chuyển file vào, nhưng không cập nhật bảng tra cấu trúc; phiên sau tra bảng thì vẫn bị chỉ về chỗ cũ và viết thêm một bản trùng.
- ✓ Đúng: Cập nhật bảng tra cấu trúc ngay trong cùng thay đổi tạo thư mục, rồi chạy kiểm bám chuẩn.
