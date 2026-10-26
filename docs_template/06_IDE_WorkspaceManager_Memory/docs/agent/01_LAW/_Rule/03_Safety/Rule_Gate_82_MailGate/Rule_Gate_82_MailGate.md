---
id: Rule_82
name: mail-gate
version: 8
kind: action
code: 03_Safety
from: _Store/01_LAW/_Rule/03_Safety/Rule_Gate_82_MailGate @v8 #b2688e619bfd
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
- Reading is not a send: a part of the command led by a reader (`cat` · `type` · `head` · `tail` · `grep` · `rg` · `findstr` ·
  `Select-String` · `Get-Content` · `Get-FileHash` · `ls` · `dir` · `wc` · `echo` …), also when run over `ssh <host> "…"`, is not
  judged; any other command still is.

## Links · Liên kết
- Related · Liên quan: `Skill_Doc_WriteStyle` — how a mail is written when it is sent · cách viết mail khi được gửi
- Related · Liên quan: `Rule_Keys_61_HookSafetyNet` — one flag, one approved action · một cờ, một việc đã duyệt
