---
version: 11
lang: vi
---
# Rule_Gate_21_WhatEntersGit — What never enters git

## Luật là gì
Ba thứ không bao giờ vào git: bí mật thật, dữ liệu thật, và nhị phân nặng không qua LFS. File git theo dõi chỉ ghi tên biến môi
trường; bí mật nằm một chỗ trong repo, `data/secrets/`, có `.gitignore` chặn.

## Khi nào áp
- Sắp stage hay commit một file.
- Viết cấu hình cần mật khẩu, khoá hay chuỗi kết nối.
- Thêm dữ liệu hay file nhị phân nặng vào repo.

## Phải làm gì
1. Bí mật thật (mật khẩu · khoá · chuỗi kết nối · két · `.env`) không lên git, kể cả khi đã mã hoá.
2. File git theo dõi (`config/` · `*.example.*` · `.env.example`) chỉ ghi tên biến môi trường (ví dụ `password_env`), không ghi
   giá trị.
3. Bí mật nằm một chỗ trong cây repo: `data/secrets/` (két mã hoá ở `data/secrets/vault/`), có `.gitignore` chặn. Ngoại lệ duy
   nhất là `.env` ở gốc, vì công cụ đọc ở đó. Không tạo thư mục bí mật ngoài cây repo: an toàn đến từ `.gitignore` và phạm vi đồng
   bộ, không phải vị trí. Ngoại lệ buộc nằm ngoài cây (ví dụ con trỏ chỉ nơi đặt dữ liệu) ghi ở hiến pháp của repo và không chứa
   bí mật.
4. Sang máy khác: bí mật đi qua kênh đồng bộ, không qua git.
5. Dữ liệu thật (nguồn · extract · dữ liệu khách) không lên git. Repo chỉ giữ mẫu nhỏ, giả, đủ để mở sản phẩm. Chỗ đặt: slot dữ
   liệu và slot mẫu của `02_STRUCTURE`.
6. Nhị phân nặng (`.pbix` · `.twb` · `.fig` · `.psd` · model) không commit thẳng; đi theo khai LFS trong `.gitattributes`.

## Ví dụ
- Tình huống: một job cần mật khẩu để kết nối cơ sở dữ liệu nguồn.
- ✗ Sai: ghi thẳng chuỗi kết nối có mật khẩu vào file config được commit; hoặc tạo một thư mục "két" ở ổ khác cho chắc.
- ✓ Đúng: config chỉ ghi `password_env: DB_SOURCE_PASSWORD`; giá trị thật nằm ở `data/secrets/`, `.gitignore` chặn; sang máy khác
  đi qua kênh đồng bộ.

## Máy kiểm
- Pre-commit chặn file mang tên bí mật (`secretNames`) lọt vào staging, kể cả commit do người làm.
- Hook chặn lần ghi đưa GIÁ TRỊ bí mật vào file mã hoặc cấu hình git theo dõi (mật khẩu dạng chữ · chuỗi kết nối kèm mật khẩu ·
  khoá riêng · khoá truy cập đám mây); pre-commit soi cùng các mẫu đó trong phần diff đã stage. Cho qua: giá trị đọc từ biến môi
  trường · chỗ điền mẫu (`<password>` · `changeme`) · `.env` · `data/secrets/` · văn bản `.md`. File test: nhắc một lần mỗi phiên
  (mật khẩu giả là bình thường). Nhóm bí mật không có cờ vượt.
