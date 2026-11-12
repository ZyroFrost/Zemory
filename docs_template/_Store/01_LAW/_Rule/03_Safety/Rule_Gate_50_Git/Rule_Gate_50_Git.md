---
id: Rule_50
aka: 02-50
name: git
version: 12
kind: action
code: 03_Safety
---
# Rule_Gate_50_Git — Commit freely, push on command, never break history

## What
A local commit can be undone, so the agent commits without asking. A push cannot be undone, so it happens only on the requester's
command. History is never rewritten or destroyed without asking first.

## When
- Work is finished and ready to commit.
- About to push, force-push, rewrite history, delete a remote tag or branch, or discard uncommitted work.

## Do
1. Commit locally in the repo's commit style; no need to ask, and never leave finished work waiting for a question: only
   deleting asks. At the end of every turn the hook commits the session's own uncommitted files locally, however small (only
   the files the session wrote, plus the set copies of a store part it wrote, through the pre-commit check, never pushed).
2. Push only when the request contains a push command. Work done ⇒ run the check, report, stop. One push command covers the whole
   batch in progress: later fixes of the same batch are pushed without asking again.
3. Writing the changelog · committing · "it's done" is not a push command. Pushing is not how a fix takes effect on the running
   machine: a rebuild is enough.
4. Without asking first ⇒ no force-push · no rewriting pushed history · no deleting remote tags or branches · no `reset --hard` or
   `clean` over uncommitted work.
5. In another repo, commit only the paths this session wrote (`git commit --only <paths>`); what that repo's own session is
   editing stays for it.
6. One batch of work = one version number, pushed once when the batch is checked; a fix in the middle of a batch is not a
   release of its own.

## Example
- Situation: the agent fixed a total in a report, the tests are green, the requester says write the ledger and commit.
- ✗ Wrong: commit, then push to the remote because "done means push".
- ✓ Right: write the ledger, commit locally, report, stop; push only on a push command.

## Check
- The guard blocks `git push` without a command and the history-breaking commands (flag `discard`).
- A Basic set (no guard): the host's own permissions from `gate.json › native` — `git push` asks, a force-push is denied.
- The end-of-turn hook commits the session's own files locally whenever they differ from HEAD, and says so in one line. A part of
  the HS store the session wrote brings its copies in every set (`docs/agent/…` · `.claude/skills/<name>` · its `installs`):
  assembling writes them through a shell, so the transcript never names them (11/11: a part committed without set 09's copy).

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — discarding work is destroying · bỏ việc chưa commit là phá dữ liệu
- Related · Liên quan: `Skill_App_Release` — version numbers and release · số phiên bản và phát hành
