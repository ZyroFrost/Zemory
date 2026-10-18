---
id: Cons_13
name: architecture
version: 2
kind: content
code: 03_System
frame: true
from: _Store/01_LAW/_Cons/03_System/Cons_Gate_13_Architecture @v2 #e628e8696aa3
---
# Cons_Gate_13_Architecture Kiến trúc

- Repo phải khai trong `Cons.md` của khung này: các lớp của sản phẩm · đường gọi được phép giữa các lớp · ranh giới không được vượt.
- Sản phẩm không có mã chạy ⇒ `status: n/a` kèm lý do.
- Lối đúng: viết `Cons.md` theo mẫu, hoặc ghi `status: n/a` kèm lý do.
- Phép kiểm: `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.

## Ví dụ

- Tình huống: một app web có giao diện, máy chủ và cơ sở dữ liệu viết `Cons.md` cho khung này.
- ✗ Sai: không khai ranh giới; một màn mới gửi thẳng câu truy vấn từ giao diện xuống cơ sở dữ liệu "cho nhanh".
- ✓ Đúng: "Các lớp: giao diện → máy chủ → cơ sở dữ liệu. Không được vượt: giao diện không bao giờ gửi câu truy vấn thô; chỉ gửi tên truy vấn và tham số."
