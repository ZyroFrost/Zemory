---
version: 12
lang: vi
---
# Rule_Gate_21_WhatEntersGit — What never enters git

## Luật là gì
Ba thứ không bao giờ vào git: bí mật thật, dữ liệu thật, và nhị phân nặng không qua LFS. File git theo dõi chỉ ghi chỗ đọc bí mật
(một biến môi trường hay một mục trong két), không bao giờ ghi giá trị. Mỗi bí mật có đúng một nhà, chọn theo chủ của nó: thông tin
đăng nhập vào một hệ thống nằm ở `_ConfigVault` của máy; bí mật riêng của sản phẩm một repo nằm ở `data/secrets/` của repo đó.

## Khi nào áp
- Sắp stage hay commit một file.
- Viết cấu hình cần mật khẩu, khoá hay chuỗi kết nối.
- Thêm dữ liệu hay file nhị phân nặng vào repo.

## Phải làm gì
1. Bí mật thật (mật khẩu · khoá · chuỗi kết nối · két · `.env`) không lên git, kể cả khi đã mã hoá.
2. File git theo dõi (`config/` · `*.example.*` · `.env.example`) chỉ ghi chỗ đọc giá trị (biến môi trường như `password_env`, hay
   dòng của một login trong két như `logcentral.ro` trong `_ConfigVault/sql/credentials/<máy>.env`), không ghi giá trị.
3. Mỗi bí mật một nhà, theo chủ của nó:
   a. Thông tin đăng nhập vào một hệ thống mà chương trình hay agent dùng — login cơ sở dữ liệu, khoá ssh, tài khoản API, hồ sơ VPN —
      nằm ở `_ConfigVault/<tool>/credentials/` (`ConfigVault_151_ConfigVault`), một bản cho cả máy, mọi repo dùng login đó dùng
      chung. Script đọc lúc chạy, không in ra, không chép vào repo.
   b. Bí mật chỉ thuộc sản phẩm riêng của một repo (khoá mã hoá của nó, két riêng của app) nằm ở `data/secrets/` của repo đó (két mã
      hoá ở `data/secrets/vault/`), có `.gitignore` chặn. `.env` ở gốc được phép vì công cụ đọc ở đó.
   c. Không có chỗ thứ ba: không chép login của két vào repo, không thư mục bí mật ở nơi nào khác.
4. Sang máy khác: `data/secrets/` của repo đi qua kênh đồng bộ; `_ConfigVault` không bao giờ đồng bộ, mang bằng tay qua đường an
   toàn. Không bao giờ qua git.
5. Dữ liệu thật (nguồn · extract · dữ liệu khách) không lên git. Repo chỉ giữ mẫu nhỏ, giả, đủ để mở sản phẩm. Chỗ đặt: slot dữ
   liệu và slot mẫu của `02_STRUCTURE`.
6. Nhị phân nặng (`.pbix` · `.twb` · `.fig` · `.psd` · model) không commit thẳng; đi theo khai LFS trong `.gitattributes`.

## Ví dụ
- Tình huống: một job của repo log cần login SQL chỉ đọc mà máy chủ DW cấp; hai repo khác cũng dùng login đó.
- ✗ Sai: ghi thẳng chuỗi kết nối có mật khẩu vào file config được commit; hoặc chép mật khẩu vào `data/secrets/` của cả ba repo,
  đổi mật khẩu là phải đi tìm từng bản.
- ✓ Đúng: mật khẩu nằm một lần, ở dòng `logcentral.ro=` của `_ConfigVault/sql/credentials/sasin-data.env`; config của mỗi repo ghi
  tên login và máy; job đọc lúc chạy.

## Máy kiểm
- Pre-commit chặn file mang tên bí mật (`secretNames`) lọt vào staging, kể cả commit do người làm.
- Hook chặn lần ghi đưa GIÁ TRỊ bí mật vào file mã hoặc cấu hình git theo dõi (mật khẩu dạng chữ · chuỗi kết nối kèm mật khẩu ·
  khoá riêng · khoá truy cập đám mây); pre-commit soi cùng các mẫu đó trong phần diff đã stage. Cho qua: giá trị đọc từ biến môi
  trường · chỗ điền mẫu (`<password>` · `changeme`) · `.env` · `data/secrets/` · văn bản `.md`. File test: nhắc một lần mỗi phiên
  (mật khẩu giả là bình thường). Nhóm bí mật không có cờ vượt.
- `_ConfigVault` nằm ngoài mọi repo nên git không thấy; ghi vào đó là ghi ra ngoài dự án (`Rule_Gate_44_RepoScope`).
- Bí mật nằm đúng một trong hai nhà hay không là phán đoán.
