---
id: Rule_82
name: mail-gate
version: 1
kind: action
---
# Rule_Gate_82_MailGate Agent không tự gửi mail

- Agent không gửi mail vì bất kỳ lý do gì của chính nó: không để hỏi ai một câu, không để "kiểm tra", không gửi thử tới đồng nghiệp.
- Cần thông tin từ một người ⇒ hỏi phiên của repo sở hữu việc đó, hoặc nói với người dùng một dòng.
- Chỉ gửi khi người dùng nói rõ trong phiên này: gửi mail này cho người này. Khi đó tạo cờ `.allow-mail`; cờ dùng cho đúng một lệnh.
- Tác vụ định kỳ chạy trên máy chủ theo lịch không đi qua đây; luật này gác lệnh của agent.
- Phép kiểm: guard chặn lệnh có thể gửi mail — lệnh gọi thẳng API mail (`smtplib` · `send_message(` · `sendmail(` · `/sendMail` ·
  `Send-MailMessage` · `Send-MgUserMail`) · chạy script tên chứa mail / send / alert · chạy launcher `bin\*` với đối số gửi thật
  (`live` · `send` · `--send` · `--send-real` · `--resend`) · chạy một script mà chính nội dung có lời gọi gửi mail.

## Ví dụ

- Tình huống: agent cần biết một con số từ phòng khác để làm tiếp báo cáo.
- ✗ Sai: viết nhanh một script gửi mail hỏi người phụ trách phòng đó.
- ✓ Đúng: hỏi phiên của repo phòng đó, hoặc báo người dùng một dòng rằng đang thiếu con số nào.
