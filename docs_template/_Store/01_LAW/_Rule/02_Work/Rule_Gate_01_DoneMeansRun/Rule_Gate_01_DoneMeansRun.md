---
id: Rule_1
aka: 02-1
name: done-means-run
version: 14
kind: action
code: 02_Work
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
4. A gate's exit code is read from its own log file (`> gate.log 2>&1; echo EXIT=$?`), never through a pipe, which returns the
   exit code of the last command in it.
5. Three kinds of defect no gate catches: a race between recorded state and a network call in flight · a lane that fails
   without a word · a lifecycle that never recovers. Work that touches the network or runs in the background is done only
   after the real app has run and its log has been read.

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
- Implements · Thi hành: `Skill_Harness_RepoMove` — a moved repo is done only with its acceptance table measured · repo đã dời chỉ xong khi đo đủ bảng nghiệm thu
- Related · Liên quan: `Rule_Keys_11_VerifyClaims` — every claim is measured · mọi khẳng định phải đo
