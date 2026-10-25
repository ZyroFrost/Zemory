---
version: 5
lang: vi
---
# Backend_016_Store store — data-access: driver + schema DB

- Vai trò:
  - DATA-ACCESS: driver + schema cho DATABASE (remote / nội bộ / cloud).
  - Nối DB = `store/` + profile ở `config/` + secret ở `.env`/`vault/`.
  - Mã hoá at-rest DB (SQLCipher) apply ở đây; key + encrypt/decrypt ở `vault/`, key/salt/bundle ở `data/secrets/`. App có data nhạy cảm (chat/PII/log) NÊN mã hoá at-rest; không làm thì ghi rõ là chấp nhận plaintext để audit thấy.
  - Lưu bền cho các concern khác: metadata của upload · role-data (người dùng→role) · bảng audit · bộ nhớ agent · một nơi THỰC THI cho tool LLM gọi.
- Được chứa / không chứa:
  - Chứa: driver, schema, `queries.*`.
  - Không chứa: lớp cache (→ `cache/`) · file cache runtime (→ `data/cache/`) · bytes upload (→ `data/uploads/`).
- Khuôn tên: Tên `store/` — không dùng `db` hay `models`, trừ khi framework ép (Django `models/`, Rails `app/models`).
