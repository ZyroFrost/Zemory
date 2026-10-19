---
id: Rule_82
name: mail-gate
version: 4
kind: action
code: 03_Safety
---
# Rule_Gate_82_MailGate — The agent never sends mail on its own

## What
The agent does not send mail for any reason of its own. Mail goes out only when the requester says clearly, in this session, to send
this mail to this person.

## When
- The agent is about to run something that can send mail.
- The agent needs information from a person.

## Do
1. Never send mail on your own: not to ask someone a question, not to "check", not as a test to a colleague.
2. Need information from a person ⇒ ask the session of the repo that owns the work, or tell the requester in one line.
3. Send only when the requester says clearly in this session: send this mail to this person. Then create the flag `.allow-mail`; the
   flag serves exactly one command.
4. Scheduled jobs that run on a server by timetable do not go through here; this law guards the agent's commands.

## Example
- Situation: the agent needs a number from another department to continue a report.
- ✗ Wrong: write a quick script that mails the person in charge of that department.
- ✓ Right: ask the session of that department's repo, or tell the requester in one line which number is missing.

## Check
- The guard blocks commands that can send mail: a direct call to a mail API (`smtplib` · `send_message(` · `sendmail(` ·
  `/sendMail` · `Send-MailMessage` · `Send-MgUserMail`) · running a script whose name contains mail / send / alert · running a
  launcher `bin\*` with a real-send argument (`live` · `send` · `--send` · `--send-real` · `--resend`) · running a script whose
  content calls a mail send · running a launcher `bin\*` — directly or behind `scripts/task_run.py ... --` — whose pipeline has
  a script that sends (a test run mails the operator too) · `git send-email`.
- Text is not a send: a heredoc body and a git command (a commit message that says "mail") are not judged.

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

## Links · Liên kết
- Related · Liên quan: `Skill_Doc_WriteStyle` — how a mail is written when it is sent · cách viết mail khi được gửi
- Related · Liên quan: `Rule_Keys_61_HookSafetyNet` — one flag, one approved action · một cờ, một việc đã duyệt
