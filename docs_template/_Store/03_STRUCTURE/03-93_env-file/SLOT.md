---
id: 03-93
name: .env
version: 1
path: .env
---
# 03-93 .env — secret runtime thật

- Vai trò:
  - Secret runtime THẬT: pass / token / `DATABASE_URL`; hệ NON-APP: connection string / token / workspace-id. GITIGNORE.
  - `config/` và `sources/` trỏ secret bằng TÊN env (`password_env`), không chứa giá trị.
  - Template `.env.example` tracked ở gốc (tool ép).
