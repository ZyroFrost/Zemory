---
version: 4
lang: vi
---
# Cons_Gate_13_Architecture — Architecture

## Luật là gì
Mọi repo khai trong `Cons.md` của khung này: các lớp của sản phẩm, đường gọi được phép giữa các lớp, và ranh giới không lời gọi nào
được vượt.

## Khi nào áp
- Sản phẩm có mã chạy, và sắp thêm một lớp hay viết một đường gọi mới giữa các lớp.

## Phải làm gì
1. Điền hai mục của `Cons.md`: các lớp · không được vượt.
2. Sản phẩm không có mã chạy ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một app web có giao diện, máy chủ và cơ sở dữ liệu điền `Cons.md` của khung này.
- ✗ Sai: không khai ranh giới; một màn mới gửi thẳng câu truy vấn từ giao diện xuống cơ sở dữ liệu "cho nhanh".
- ✓ Đúng: "Các lớp: giao diện → máy chủ → cơ sở dữ liệu. Không được vượt: giao diện không bao giờ gửi câu truy vấn thô; chỉ gửi
  tên truy vấn và tham số."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.
