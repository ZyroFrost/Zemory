---
version: 4
lang: vi
---
# Cons_Gate_11_WriteBoundary — The write boundary

## Luật là gì
Mọi repo khai trong `Cons.md` của khung này: sản phẩm được ghi vào đâu ngoài repo, đường duy nhất cho thay đổi cấu trúc (bảng ·
cột · quyền · cấu hình hệ), và thao tác ghi nào chỉ chạy khi người dùng ra lệnh trong phiên.

## Khi nào áp
- Sản phẩm bắt đầu ghi vào một chỗ mới ngoài repo.
- Agent sắp đổi một cấu trúc hay chạy lệnh ghi lên hệ dùng chung.

## Phải làm gì
1. Điền ba mục của `Cons.md`: được ghi vào · đổi cấu trúc chỉ qua · chỉ chạy khi có lệnh.
2. Không ghi gì ra ngoài repo ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một repo quản cơ sở dữ liệu dùng chung cho nhiều app điền `Cons.md` của khung này.
- ✗ Sai: không khai đường đổi cấu trúc; mỗi app tự tạo bảng riêng trên cơ sở dữ liệu chung, vài tháng sau không ai biết bảng nào
  của ai.
- ✓ Đúng: "Được ghi vào: chỉ cơ sở dữ liệu của repo này. Đổi cấu trúc chỉ qua thư mục mô hình, chạy bằng script sau khi kiểm cú
  pháp sạch; app không tự tạo hay sửa bảng. Chỉ chạy khi có lệnh: mọi câu đổi cấu trúc, đổi quyền, sửa dữ liệu."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.
