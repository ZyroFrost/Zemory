---
id: Rule_44
aka: 02-44
name: repo-scope
version: 9
kind: action
code: 03_Safety
---
# Rule_Gate_44_RepoScope — Write only inside the open project

## What
Writing, editing and commands that write touch only the folder of the project that is open. Other projects can be read; writing
to them is forbidden unless the requester approved it in this session.

## When
- About to write, edit or run a writing command.
- Standing in a repo that is only being read for reference.
- About to do work for another repo.

## Do
1. Stay inside the open project's folder.
2. Another project: reading for reference is fine; every write is forbidden by default. Need to touch it ⇒ stop and ask first,
   saying what · where · why; act only once approved in this session. Another session may be working there.
3. The ban holds even when the intent is to help, to rescue data, or to fix something on the way.
4. In a reference repo ⇒ do not run commands that write to the working folder (`zemory init` · `sync` · `reindex` · `archive` ·
   `memory scan`). Want its standard ⇒ read `docs_template/`, then run the command in your own repo.
5. Work done for another repo (fixing code, running a job), once approved, never touches that repo's harness
   (`Rule_Gate_83_HarnessFromStore`).
6. Leaving the project also covers: writing to an absolute path outside the repo · SQL that makes the server write files or change
   its settings · a command that creates · deletes · changes on another machine. Read-only commands pass.

## Example
- Situation: working in one repo, the agent sees the repo next door has its ledgers off-standard.
- ✗ Wrong: run the standard sync or edit files in the next repo "while at it".
- ✓ Right: act only in the open project; report what was seen in the other repo; without permission, write nothing there.

## Check
- The guard blocks the four kinds above (flag `.allow-outside`) and `zemory` commands that write from another working folder.
- The guard cannot see paths built at run time or hidden in a script ⇒ the text of this law decides. Mechanism and exempt list:
  the guard notes in `02_STRUCTURE/_Host/IDE`.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_RepoMove` — moving a repo writes outside the working repo · dời repo là ghi ngoài repo đang làm
- Related · Liên quan: `Rule_Gate_83_HarnessFromStore` — a repo's harness changes only through HS · harness của repo chỉ đổi qua HS
- Related · Liên quan: `Rule_Keys_61_HookSafetyNet` — what the guard cannot see · thứ guard không thấy
