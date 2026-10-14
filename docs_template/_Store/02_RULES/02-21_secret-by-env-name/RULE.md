---
id: 02-21
name: secret-by-env-name
version: 1
kind: action
---
# 02-21 Secret và connection: chỉ trỏ TÊN biến môi trường

- File tracked (`config/` · `config/*.example.*` · `.env.example`) chỉ trỏ TÊN biến môi trường (vd. `password_env`), không chứa giá trị.
- Giá trị THẬT (mật khẩu · connection thật) ⇒ `.env` / `*.local.*` (gitignore), hoặc vault ⇒ `data/secrets/`.
- KHÔNG commit secret.
- Phép kiểm: cổng `guard`.
