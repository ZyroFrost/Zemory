# Bộ mail chung của cụm

Danh bạ và hộp thư gửi dùng chung của mọi repo trong cụm. Agent đọc là chính; người dùng chỉ gõ mật khẩu hộp thư gửi một lần.

| Thứ | Ở đâu | Ai ghi | Vào git? |
|---|---|---|---|
| Khoá hộp thư gửi (`SMTP_HOST` · `SMTP_PORT` · `SMTP_USER` · `SMTP_PASSWORD`) | `data/secrets/mail.env` (khuôn `mail.env.example`) | người dùng, một lần | không |
| Danh bạ | `config/mail/mail_vault.json` (khuôn `mail_vault.example.json`) | agent của tổng quản | không |

## Khuôn `mail_vault.json`

- `senders[]` — `address` · `purpose` · `env_file` · `env_keys {host, port, user, password}` (TÊN khoá, không giá trị).
- `groups[]` — `name` (snake_case, tiếng Anh) · `owner` (mã phòng) · `purpose` · `to[]` · `cc[]` · `source`.
- `stores[]` (tuỳ cụm) — `id` · `email` · `active` · `cc[]` · `source`.

## Luật

- Phòng cần gửi mail ⇒ đọc ở đây; thêm hoặc đổi người nhận ⇒ nhắn phiên của tổng quản.
- Máy chạy task nhận danh bạ và khoá qua cơ chế triển khai của tổng quản; không giữ bản riêng.
