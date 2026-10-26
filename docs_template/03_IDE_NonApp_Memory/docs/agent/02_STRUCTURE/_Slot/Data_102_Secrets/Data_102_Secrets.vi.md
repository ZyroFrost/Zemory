---
version: 7
lang: vi
---
# Data_102_Secrets secrets — bí mật của sản phẩm riêng của repo: khoá · token · két mã hoá

- Vai trò: chỗ DUY NHẤT cho bí mật thuộc sản phẩm riêng của repo này (`Rule_Gate_21_WhatEntersGit` bước 3b):
  - `data/secrets/<khoá · token · salt · bundle>`;
  - `data/secrets/vault/` — két mã hoá (`*.sec` · `*.dpapi`), công cụ két đọc và ghi ở đây;
  - ngoại lệ duy nhất: `.env` ở gốc repo, vì công cụ chỉ đọc ở đó.
- Không ở đây: thông tin đăng nhập vào một hệ thống mà chương trình hay agent dùng (login cơ sở dữ liệu, khoá ssh, tài khoản API) —
  nằm một lần ở `_ConfigVault/<tool>/credentials/` của máy (`ConfigVault_151_ConfigVault`), mọi repo dùng nó dùng chung; repo ghi tên
  mục trong két, không chép vào đây.
- Mỗi tên file bí mật khai ở cột `File` của bảng bí mật trong khung HP `Cons_Gate_14_Access`; guard chặn file đó vào commit.
- Được chứa / không chứa: không chứa mã (mã mã hoá của app ở `backend/src/vault/`) · không tạo thư mục bí mật thứ hai trong repo
  (`.vault/` ở gốc là dạng cũ, dời vào `data/secrets/vault/`).
- `.gitignore` chặn `/data/`; sang máy khác bí mật đi qua kênh đồng bộ, không qua git.
