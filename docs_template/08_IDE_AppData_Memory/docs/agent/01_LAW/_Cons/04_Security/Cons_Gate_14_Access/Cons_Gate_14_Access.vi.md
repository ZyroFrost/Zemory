---
version: 5
lang: vi
---
# Cons_Gate_14_Access — Access and security

## Luật là gì
Mọi repo khai trong `Cons.md` của khung này: ai được dùng sản phẩm, gác quyền ở lớp nào, mặc định khi chưa khai quyền (chặn hay
cho), bí mật hệ dùng (chỉ TÊN, không giá trị), dữ liệu cá nhân repo giữ và cách bảo vệ, và sản phẩm có mở ra mạng hay chỉ chạy
trên máy. Dữ liệu cá nhân của người dùng (định danh · liên lạc · tài chính) không bao giờ lưu hay truyền dạng rõ.

## Khi nào áp
- Sản phẩm có người dùng, quyền, bí mật hay dữ liệu cá nhân, hoặc mở ra mạng.
- Agent thêm một chức năng ghi, hoặc một trường giữ dữ liệu cá nhân.

## Phải làm gì
1. Điền các mục của `Cons.md`: người dùng · gác ở · bí mật (tên) · dữ liệu cá nhân · phạm vi mạng.
2. Bí mật: mỗi bí mật một dòng: TÊN (`Name`), mẫu tên file chứa nó (`File`, ví dụ `*.sec`), công dụng; giá trị nằm ở
   `data/secrets/` (`Rule_Gate_21_WhatEntersGit`).
3. Dữ liệu cá nhân: trường nào · mã hoá bằng gì · khoá ở đâu. Không giữ ⇒ ghi `không có` kèm lý do.
4. Không có người dùng và bí mật nào ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một app nội bộ có người xem và người sửa điền `Cons.md` của khung này.
- ✗ Sai: chỉ ghi "phân quyền theo vai trò"; agent thêm chức năng ghi mới và ẩn nút với người xem, nhưng máy chủ vẫn nhận lệnh ghi
  từ họ; số điện thoại khách nằm dạng rõ trong bảng.
- ✓ Đúng: "Gác ở máy chủ, mặc định chặn: chức năng ghi mới chặn người xem tới khi được khai cho phép. Ẩn nút không tính là bảo mật.
  Dữ liệu cá nhân: `phone` · `email` mã hoá AES-256-GCM, khoá ở két, xoay 90 ngày."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.
- Guard đọc cột `File` của bảng bí mật làm danh sách tên file bí mật (`secretNames`): file đó không bao giờ vào commit.
