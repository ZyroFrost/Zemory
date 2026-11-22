---
version: 5
lang: vi
---
# Root_093_Env .env — chỗ riêng DUY NHẤT chứa bí mật của repo

- Vai trò:
  - Chỗ DUY NHẤT cho thứ chỉ của riêng repo này (`Rule_Gate_21_WhatEntersGit` bước 3b): bí mật dạng chữ chỉ repo này dùng (mật
    khẩu file của một phòng · khoá chỉ sản phẩm của nó dùng) và cài đặt riêng của nó. GITIGNORE.
  - Không ở đây: login vào hệ thống hay thứ nhiều repo cùng dùng (két máy `ConfigVault_151_ConfigVault`); bí mật dạng FILE (chứng
    chỉ · khoá · file token ⇒ `_ConfigVault/certs/<repo>/`). Không có chỗ riêng thứ hai trong repo: không `data/secrets/`, không két
    mã hoá của repo.
  - Code đọc bí mật riêng theo tên bằng `vault_conn.private(<TÊN>)` (skill `Skill_Task_VmAutomation`), không in ra.
  - `config/` và `sources/` trỏ secret bằng TÊN env (`password_env`), không chứa giá trị.
  - Template `.env.example` tracked ở gốc (tool ép).
