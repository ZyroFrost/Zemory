---
id: Rule_19
aka: 02-19
name: heavy-binary-lfs
version: 3
kind: judgment
applies: [NonApp]
---
# Rule_Core_19_HeavyBinaryLfs Nhị phân nặng đi qua Git LFS

- Nhị phân nặng (`.pbix` · `.twb` · `.fig` · `.psd`) đi qua Git LFS, như `share/*.enc`.

## Ví dụ

- Tình huống: Agent đưa file báo cáo BI 200 MB mới sửa vào repo của phòng.
- ✗ Sai: Commit thẳng file nhị phân vào git; vài lần sửa sau, repo nặng vài GB, máy khác kéo về mất cả giờ.
- ✓ Đúng: Khai loại file đó cho Git LFS trước khi commit, rồi kiểm trong git chỉ còn con trỏ nhỏ.
