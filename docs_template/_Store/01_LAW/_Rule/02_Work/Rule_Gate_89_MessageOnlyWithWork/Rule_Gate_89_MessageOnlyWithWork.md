---
id: Rule_89
name: message-only-with-work
version: 2
kind: action
code: 02_Work
checked: [Rule_Keys_07_ScopeOnly, Rule_Keys_06_HandoffInline]
---
# Rule_Gate_89_MessageOnlyWithWork — A message to another repo's session carries work for it, or answers it

## What
The agent of another repo is in the middle of its own task. A message from this session interrupts it, so a message is
sent only when the recipient has something to do with it, or when it answers what the recipient asked. A status update
the recipient has no part in is not sent.

## When
- Sending a message to the session of another repo (`SendMessage` to a local peer session).

## Do
1. The recipient must act ⇒ the FIRST line names the work: `Cần <repo>: <việc>` (or `Need <repo>: <task>`), the details
   below it.
2. The recipient asked this session for something ⇒ answer it (reply by the `from` address of its message, or by its
   name); keep it to what it asked: done, blocked and why, or what it must do next.
3. The news concerns the recipient only indirectly (another repo's work, this session's progress, a state it cannot act
   on) ⇒ do not send it; report it in this session.
4. Several repos are involved ⇒ message each one only about its own part.

## Example
- Situation: HS fails a test because of a part one department wrote; two other departments are waiting for their own
  parts to be synced.
- ✗ Wrong: message the two waiting departments that HS is red because of the third one — they can do nothing about it,
  and both are interrupted mid-task.
- ✓ Right: report it in this session; message the department that wrote the part with `Cần <repo>: <what to fix>`; tell the
  two others only when their own parts are synced.

## Check
- The send guard (`zemory hook send-guard`, PreToolUse on `SendMessage`, installed per machine by `zemory hook install`)
  blocks a message to a local peer session unless: it replies by a `uds:` address · the recipient has messaged this
  session (its name appears as the sender of a cross-session message in this session's transcript) · the first line
  matches `Cần <repo>: <việc>` / `Need <repo>: <task>` · it carries no text (an idle subscription).

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_07_ScopeOnly` — only the work that was given · chỉ làm đúng việc được giao
- Related · Liên quan: `Rule_Keys_06_HandoffInline` — what a handoff carries · bàn giao mang theo gì
