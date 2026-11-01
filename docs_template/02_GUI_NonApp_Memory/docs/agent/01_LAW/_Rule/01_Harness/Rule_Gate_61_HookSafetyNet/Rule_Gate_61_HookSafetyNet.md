---
id: Rule_61
aka: 02-61
name: hook-safety-net
version: 9
checked: [Rule_Gate_82_MailGate, Rule_Gate_10_DestructiveOps, Rule_Gate_44_RepoScope, Rule_Gate_79_HarnessEdit, Rule_Gate_73_GateEveryRule]
kind: action
code: 01_Harness
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_61_HookSafetyNet @v9 #7b3016696168
---
# Rule_Gate_61_HookSafetyNet — A hook is a safety net, not the one who decides; a block is answered by the requester

## What
The text of a law decides; a hook only catches what slips. A hook that lets something through does not make it allowed, and a
hook that blocks is not a puzzle to get around: a block that asks for permission stops the agent until the requester answers.

## When
- A hook passes or blocks an action.
- A one-use flag `.allow-*` is about to be created.

## Do
1. Passed by a hook ≠ allowed: an action that cannot be undone still needs the requester's approval first.
2. Blocked ⇒ stop and ask the requester in one line: what was blocked and what needs their word. Never look for another way that
   the hook does not see — another script, another tool, a copy of the command — and never make the flag on your own.
3. A flag `.allow-*` lets exactly one approved action through: create it only after the requester clearly approved in this session,
   and never reuse it for anything else. Secrets have no flag.
4. Already approved before acting ⇒ create the flag BEFORE the action. A block met first is a block: it is answered by the
   requester, even when an approval was given earlier.
5. Blocks that ask no permission are cleared by doing the work right, not by asking: read the file first, a one-time reminder
   (retry the same call), and the laws on how a thing is written or finished (`Rule_Gate_01` · `02` · `04` · `24` · `27` · `29` ·
   `31` · `35` · `84` · `85` · `91` · `92`).

## Example
- Situation: the mail gate blocks `python send_fabi.py --send`; the agent sees that calling the send function from a scratch
  script is not read by the gate.
- ✗ Wrong: run the scratch script, or create `.allow-mail` because the requester said "send" an hour ago (a department repo, 2026-11-01: a
  file the requester had not checked reached the recipient that way).
- ✓ Right: stop, tell the requester "the mail gate blocked sending file X to Y — send?"; once they answer, create the flag for
  that one command.

## Check
- Hook `hook.cjs`: after a block that asks for permission (every guard block except the fixable ones of Do 5), every action tool
  is blocked until the requester writes again; Read · Glob · Grep stay open. It reads the session transcript from its end back to
  the requester's last line.
- Keyword reminder: a request about getting around a hook, exceeding one's authority or making a flag shows this law.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — actions that cannot be undone · thao tác không đảo được
- Related · Liên quan: `Rule_Gate_79_HarnessEdit` — the flag for harness edits · cờ sửa harness
- Related · Liên quan: `Rule_Gate_82_MailGate` — the gate that was got around · cổng đã bị lách
