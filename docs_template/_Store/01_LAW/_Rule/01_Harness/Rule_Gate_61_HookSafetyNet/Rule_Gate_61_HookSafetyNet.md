---
id: Rule_61
aka: 02-61
name: hook-safety-net
version: 13
checked: [Rule_Gate_82_MailGate, Rule_Gate_10_DestructiveOps, Rule_Gate_44_RepoScope, Rule_Gate_79_HarnessEdit, Rule_Gate_73_GateEveryRule]
kind: action
code: 01_Harness
---
# Rule_Gate_61_HookSafetyNet — A hook is a safety net, not the one who decides; a block is cleared by the requester's word

## What
The text of a law decides; a hook only catches what slips. A hook that lets something through does not make it allowed, and a
hook that blocks is not a puzzle to get around: a block that asks for permission is cleared by the requester's word — one
already given in the session, or one asked for.

## When
- A hook passes or blocks an action.
- A one-use flag `.allow-*` is about to be created.

## Do
1. Passed by a hook ≠ allowed: an action that cannot be undone still needs the requester's approval first.
2. Blocked ⇒ read back the requester's lines in this session. They already approved or ordered this exact action (a "send it",
   "delete it", "push", "do it" that names or plainly covers it) ⇒ create the flag and go on, saying in one line what passed. Nothing
   covers it ⇒ ask the requester in one line: what was blocked and what needs their word. Never look for another way that the
   hook does not see — another script, another tool, a copy of the command.
3. A flag `.allow-*` lets exactly one approved action through: create it only on an approval or order of the requester in this
   session that covers the action, and never reuse it for anything else. Secrets have no flag.
4. Already approved before acting ⇒ create the flag BEFORE the action. An approval covers what it names: a wider action, another
   file or another recipient than the one approved is not covered and is asked about.
5. Blocks that ask no permission are cleared by doing the work right, not by asking: read the file first, a one-time reminder
   (retry the same call), and the laws on how a thing is written or finished (`Rule_Gate_01` · `02` · `04` · `24` · `27` · `29` ·
   `31` · `35` · `84` · `85` · `91` · `92`).
6. The requester commands from ONE session and the sessions under it work for it (the requester 26/11: "lời t nói ntn đưa lại là
   tính hết"). Their words relayed VERBATIM by the commanding side count as their word in this session, the same as typed here,
   for what they name (Do 2–4 apply as written): ① a message from the session that opened this one (named in this session's first
   message; `SendMessage`, `<cross-session-message>`) and from the session that commands it; ② a letter from the requester's main
   machine (`zemory msg main <host>` on each other machine; `msg read` marks it ★). A paraphrase, or the relaying agent's own
   wording, is that agent's word, never the requester's. Every action done on that word, and every job the requester gives
   directly here, is reported back up the same way (the main machine by letter, the opener by `SendMessage`).
7. A session working under another never asks the requester to CONFIRM in its own window ("ko được hỏi lại cần user confirm
   nữa, chỉ hỏi khi cần thêm thông tin"): what the relayed word covers is done at once; what it does not cover, and any missing
   fact, goes UP to the commanding session in one message naming the exact item. The commanding session answers from the
   requester's words it already holds and asks the requester only for a fact or a decision nobody has given yet.

## Example
- Situation: the requester said "send the report to Y"; the mail gate blocks `python send_fabi.py --send` for that report.
- ✗ Wrong: run the send function from a scratch script the gate does not read (a department repo, 2026-11-01: a file the
  requester had not checked reached the recipient that way); or ask "send?" again when the order already names this report and Y.
- ✓ Right: create `.allow-mail` for that one command and say "sending report X to Y, as asked"; a file or recipient the order does
  not name ⇒ ask first.

## Check
- Hook `hook.cjs`: after a block that asks for permission (every guard block except the fixable ones of Do 5), the next action
  tool is stopped once with a reminder of Do 2; the same call retried passes. A gate the requester already answered earlier in the
  session is not reminded again. Read · Glob · Grep are never stopped.
- Keyword reminder: a request about getting around a hook, exceeding one's authority or making a flag shows this law.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — actions that cannot be undone · thao tác không đảo được
- Related · Liên quan: `Rule_Gate_79_HarnessEdit` — the flag for harness edits · cờ sửa harness
- Related · Liên quan: `Rule_Gate_82_MailGate` — the gate that was got around · cổng đã bị lách
