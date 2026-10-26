---
version: 8
lang: vi
---
# Rule_Gate_82_MailGate — The agent never sends mail on its own

## Luật là gì
Agent không gửi mail vì bất kỳ lý do gì của chính nó. Mail chỉ đi khi người dùng nói rõ, trong phiên này, gửi mail này cho người
này.

## Khi nào áp
- Agent sắp chạy thứ có thể gửi mail.
- Agent cần thông tin từ một người.

## Phải làm gì
1. Không tự gửi mail: không để hỏi ai một câu, không để "kiểm tra", không gửi thử tới đồng nghiệp.
2. Cần thông tin từ một người ⇒ hỏi phiên của repo sở hữu việc đó, hoặc nói với người dùng một dòng.
3. Chỉ gửi khi người dùng nói rõ trong phiên này: gửi mail này cho người này. Khi đó tạo cờ `.allow-mail`; cờ dùng cho đúng một
   lệnh.
4. Tác vụ định kỳ chạy trên máy chủ theo lịch không đi qua đây; luật này gác lệnh của agent.

## Ví dụ
- Tình huống: agent cần biết một con số từ phòng khác để làm tiếp báo cáo.
- ✗ Sai: viết nhanh một script gửi mail hỏi người phụ trách phòng đó.
- ✓ Đúng: hỏi phiên của repo phòng đó, hoặc báo người dùng một dòng rằng đang thiếu con số nào.

## Máy kiểm
- Guard chặn lệnh có thể gửi mail: gọi thẳng API mail (`smtplib` · `send_message(` · `sendmail(` · `/sendMail` ·
  `Send-MailMessage` · `Send-MgUserMail`) · chạy script tên chứa mail / send / alert · chạy launcher `bin\*` với đối số gửi thật
  (`live` · `send` · `--send` · `--send-real` · `--resend`) · chạy một script mà chính nội dung có lời gọi gửi mail · chạy
  launcher `bin\*` — trực tiếp hoặc sau `scripts/task_run.py ... --` — mà pipeline của nó có script gửi mail (lượt thử cũng gửi
  tới người vận hành) · `git send-email`.
- Chữ không phải lệnh gửi: thân heredoc và lệnh git (commit message có chữ "mail") không bị soát.
- Đọc không phải lệnh gửi: một đoạn của lệnh mở đầu bằng lệnh đọc (`cat` · `type` · `head` · `tail` · `grep` · `rg` · `findstr` ·
  `Select-String` · `Get-Content` · `Get-FileHash` · `ls` · `dir` · `wc` · `echo` …), kể cả khi chạy qua `ssh <máy> "…"`, không bị
  soát; mọi lệnh khác vẫn bị soát.
