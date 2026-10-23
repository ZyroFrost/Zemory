---
id: Rule_4
aka: 02-4
name: scratch-files
version: 11
kind: judgment
code: 03_Safety
from: _Store/01_LAW/_Rule/03_Safety/Rule_Gate_04_ScratchFiles @v11 #c77fce6c7e06
---
# Rule_Gate_04_ScratchFiles — A scratch file has a way out

## What
Anything made to do the work but not delivered (a probe script · measurement data · intermediate data · a downloaded model · a
screenshot · a draft · a trial copy · a copy kept to compare) lives in the session's scratch folder outside the repo, and is
deleted once used. A session keeps at most 5 scratch files at a time.

## When
- About to create a file that is not part of what the repo delivers.
- Writing code (test · script · tool) that creates a temporary folder.

## Do
1. Put the file in the session's scratch folder, outside the repo.
2. A tool forces it inside the repo (it insists on a path · the script needs that working folder) ⇒ name it `_scratch_*` and delete
   it in the same turn; deleting a `_scratch_*` path needs no flag (`Rule_Gate_10_DestructiveOps`).
3. A tool that breaks on long paths (the Windows path-length limit cuts files silently) ⇒ the copy may sit in a short folder at
   the drive root outside every repo; ask first (`Rule_Gate_44_RepoScope`) and delete it when done.
4. Done with a scratch file ⇒ delete it now. About to pass 5 ⇒ delete an old one before creating a new one. Anything kept must be
   small and say why it is kept.
5. Adding a pattern to `.gitignore` is not cleaning: the file is still on disk and still grows.
6. Code that creates a temporary folder names it `_scratch_<name>-` and deletes it in `finally` / `after`, also on error or cancel. The test runner gathers the
   temporary folders of every child process under one parent folder per run and deletes it at the end.

## Example
- Situation: a session tries out a model: downloads it, takes screenshots, exports a few measurement tables to compare.
- ✗ Wrong: leave everything "in case", or add the folder to `.gitignore` so `git status` looks clean; weeks later the disk is full
  and nobody knows where the files came from.
- ✓ Right: every scratch file sits in the session's scratch folder, each is deleted as soon as it is used, never more than five
  at once.

## Check
- A hook blocks a new file in the session's scratch folder once it already holds 5 files (no flag).
- The pre-commit check blocks `_scratch_*`.
- The number of folders in the system temp folder is the same before and after a test run.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — deleting goes through approval · xoá phải được duyệt
- Related · Liên quan: `Rule_Gate_44_RepoScope` — a folder outside the repo · thư mục ngoài repo
- Related · Liên quan: `Skill_PBI_Pbip` — the long-path case of report files · ca đường dài của file báo cáo
