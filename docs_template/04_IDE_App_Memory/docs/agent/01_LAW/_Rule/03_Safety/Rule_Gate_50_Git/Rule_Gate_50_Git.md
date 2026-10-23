---
id: Rule_50
aka: 02-50
name: git
version: 8
kind: action
code: 03_Safety
from: _Store/01_LAW/_Rule/03_Safety/Rule_Gate_50_Git @v8 #0a86fb21f4d5
---
# Rule_Gate_50_Git — Commit freely, push on command, never break history

## What
A local commit can be undone, so the agent commits without asking. A push cannot be undone, so it happens only on the requester's
command. History is never rewritten or destroyed without asking first.

## When
- Work is finished and ready to commit.
- About to push, force-push, rewrite history, delete a remote tag or branch, or discard uncommitted work.

## Do
1. Commit locally in the repo's commit style; no need to ask. A session's own uncommitted work past 300 lines is committed
   locally at the end of the turn by the hook (only the files the session wrote, through the pre-commit check, never pushed).
2. Push only when the request contains a push command. Work done ⇒ run the check, report, stop. One push command covers the whole
   batch in progress: later fixes of the same batch are pushed without asking again.
3. Writing the changelog · committing · "it's done" is not a push command. Pushing is not how a fix takes effect on the running
   machine: a rebuild is enough.
4. Without asking first ⇒ no force-push · no rewriting pushed history · no deleting remote tags or branches · no `reset --hard` or
   `clean` over uncommitted work.

## Example
- Situation: the agent fixed a total in a report, the tests are green, the requester says write the ledger and commit.
- ✗ Wrong: commit, then push to the remote because "done means push".
- ✓ Right: write the ledger, commit locally, report, stop; push only on a push command.

## Check
- The guard blocks `git push` without a command and the history-breaking commands (flag `discard`).
- The end-of-turn hook commits the session's own files locally once their uncommitted lines pass 300, and says so in one line.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — discarding work is destroying · bỏ việc chưa commit là phá dữ liệu
- Related · Liên quan: `Skill_Dev_Release` — version numbers and release · số phiên bản và phát hành
