---
id: Slot_102
aka: 03-102
name: secrets
version: 5
path: data/secrets/
from: _Store/02_STRUCTURE/_Slot/Data_102_Secrets @v5 #5a4bb56e0232
---
# Data_102_Secrets secrets — mọi bí mật của repo: khoá · token · két mã hoá

- Vai trò: chỗ DUY NHẤT cho bí mật của repo (`Rule_Gate_21_WhatEntersGit`):
  - `data/secrets/<khoá · token · salt · bundle>`;
  - `data/secrets/vault/` — két mã hoá (`*.sec` · `*.dpapi`), công cụ két đọc và ghi ở đây;
  - ngoại lệ duy nhất: `.env` ở gốc repo, vì công cụ chỉ đọc ở đó.
- Mỗi tên file bí mật khai ở cột `File` của bảng bí mật trong khung HP `Cons_Gate_14_Access`; guard chặn file đó vào commit.
- Được chứa / không chứa: không chứa mã (mã mã hoá của app ở `backend/src/vault/`) · không tạo thư mục bí mật thứ hai, kể cả
  ngoài cây repo (`.vault/` ở gốc là dạng cũ, dời vào `data/secrets/vault/`).
- `.gitignore` chặn `/data/`; sang máy khác bí mật đi qua kênh đồng bộ, không qua git.
