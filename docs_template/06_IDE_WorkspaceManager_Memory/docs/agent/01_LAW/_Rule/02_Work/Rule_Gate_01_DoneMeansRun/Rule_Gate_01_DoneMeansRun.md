---
id: Rule_1
aka: 02-1
name: done-means-run
version: 11
kind: action
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Gate_01_DoneMeansRun @v11 #46dc039a92cd
---
# Rule_Gate_01_DoneMeansRun — "Done" means it really ran

## What
The agent says "done" only when the work has really run and been measured. A green gate alone is not proof.

## When
- About to report a task as done.

## Do
Say "done" only when all three hold:
1. Code changed ⇒ after the last change, the repo's check has run (gate · test · type check · lint · the check command the
   marker declares).
2. A new check was written (test · script · reconciliation formula · comparison table) ⇒ break exactly what it guards and see it
   go red; it stays green ⇒ fix the check. Two common holes: the check never reaches the dangerous branch; a copy of the logic
   elsewhere carries the load instead.
3. What was built is used on another machine (a storage layer · an index · a secret · a delivered asset) ⇒ the path to that
   machine is declared and measured at the receiving end.

One missing ⇒ the work is unfinished, even with a green gate. How to break code: `.claude/skills/harness-audit/SKILL.md`. The
path to a second machine: `.claude/skills/harness-sync-path/SKILL.md`.

## Example
- Situation: the agent writes a reconciliation formula to check that the report's revenue total matches the DW.
- ✗ Wrong: it matches on the first run, so report done; in fact the formula compares the total with itself, and a changed number
  in the DW would still match.
- ✓ Right: change one number at the source on purpose and run again; the reconciliation must show a gap; if it does not, fix the
  formula, then report done.

## Check
- The end-of-turn hook blocks a turn that changed code without running any check command.
- A hook reminds once per session when a new test file is written and when code creates a new stored table.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_Audit` — how to break code to test a check · cách phá mã để thử phép kiểm
- Implements · Thi hành: `Skill_Harness_SyncPath` — the path to a second machine · đường sang máy thứ hai
- Related · Liên quan: `Rule_Keys_11_VerifyClaims` — every claim is measured · mọi khẳng định phải đo
