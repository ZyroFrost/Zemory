---
id: Cons_11
name: write-boundary
version: 2
kind: content
code: 02_Data
frame: true
---
# Cons_Gate_11_WriteBoundary Ranh giới ghi

- Repo phải khai trong `Cons.md` của khung này: sản phẩm được ghi vào đâu ngoài chính repo · thay đổi cấu trúc (bảng · cột · quyền · cấu hình hệ) đi qua đường nào · thao tác ghi nào chỉ chạy khi người dùng ra lệnh trong phiên.
- Không ghi ra ngoài repo ⇒ `status: n/a` kèm lý do.
- Lối đúng: viết `Cons.md` theo mẫu, hoặc ghi `status: n/a` kèm lý do.
- Phép kiểm: `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.

## Ví dụ

- Tình huống: một repo quản cơ sở dữ liệu dùng chung cho nhiều app viết `Cons.md` cho khung này.
- ✗ Sai: không khai đường đổi cấu trúc; mỗi app tự tạo bảng riêng trên cơ sở dữ liệu chung, vài tháng sau không ai biết bảng nào của ai.
- ✓ Đúng: "Được ghi vào: chỉ cơ sở dữ liệu của repo này. Đổi cấu trúc chỉ qua thư mục mô hình, chạy bằng script sau khi kiểm cú pháp sạch; app không tự tạo hay sửa bảng. Chỉ chạy khi có lệnh: mọi câu đổi cấu trúc, đổi quyền, sửa dữ liệu."
