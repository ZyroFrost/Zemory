---
id: Skill_Harness_RepoMove
name: harness-repo-move
version: 2
type: process
checked: [Skill_Harness_Reshape, Skill_Harness_Reconcile, Skill_Harness_Adopt, Skill_Harness_SessionClose, Rule_Gate_44_RepoScope]
description: Rename or move a whole repo folder together with everything bound to its path - Claude Code sessions, memory entries, session titles and the places that point at it - then prove nothing still points at the old path. Use whenever a repo folder is renamed, or moved to another drive or parent folder. Restructuring the inside of a repo is Skill_Harness_Reshape or Skill_Harness_Reconcile, not this. Vietnamese triggers - "đổi tên repo", "dời repo", "chuyển thư mục repo", "move repo", "rename repo".
---

# harness-repo-move — renaming or moving a repo

> This skill changes only the PLACE and NAME of a whole repo, keeping its inside as it is. Drawn from the `_DB_AppCore` → `_DB_ERP` rename (22/10).

**Why it is not merged into an existing part:**
- `Skill_Harness_Reshape` brings a repo's CONTENT onto a set of HS (laws · skills · slots); the repo's path does not change.
- `Skill_Harness_Reconcile` moves FILES in the wrong place inside a repo; it does not touch the root folder, sessions or memory.
- `Skill_Harness_Adopt` takes a repo with its own structure into the harness; it moves nothing.
- `Skill_Harness_SessionClose` writes the ledgers at the end of a session; it does not edit session files.
- `Rule_Gate_44_RepoScope` only blocks writes outside the repo and asks for the requester's word; it does not say how to move, how to point old sessions back,
  how to accept the result. This skill carries out that law for one kind of work.

## 0. Before touching the repo

- The new name is decided by the requester, said in the working session itself. Words in another session do not count: moving a repo writes outside
  the repo of the working session (`Rule_Gate_44_RepoScope`).
- No agent session or editor still has the repo open — Windows locks a folder in use. A session standing INSIDE the repo cannot move
  itself ⇒ a session in ANOTHER repo does it.
- The repo's `git status` is clean; write down the last commit to compare after the move.
- List the places pointing at the old path: other repos' `docs/.harness.json` · config outside the repo (SSH · scheduled tasks · deploy ·
  copies on a VM) · documents of other repos. Only list and report; documents INSIDE the moved repo are the work of its own next session.

## 1. Move

1. A dry run, writing nothing: `zemory project move "<old path>" "<new path>"`. Read the preview table: folder · Claude session
   folder · memory (sessions · documents · changelog) · registry.
2. The table is right ⇒ the same command with `--apply`.
- A WSL path (`\\wsl.localhost\<distro>\…`) is typed in PowerShell, not in Git Bash: Git Bash rewrites the backslashes before the
  command sees them (measured on the second machine 25/10). Another drive or a WSL distro: the move copies, checks files and bytes, keeps the source.

## 2. Point the old sessions back

The move only renames the session folder; the lines inside the session files still carry the old path and name.

- Back up the `~/.claude/projects/<new session folder>/*.jsonl` files before editing (packed into one archive — the scratch file cap,
  `Rule_Gate_04_ScratchFiles`).
- Count first: how many values of each structural field carry the old name.
- Edit only STRUCTURAL fields, value by JSON value, never a blind string replace over a whole line:
  - `cwd` · `trackingPath`: every earlier path of the repo (including paths before earlier moves, a different drive-letter case) → the new path,
    keeping the tail after the repo name.
  - `customTitle` · `agentName`: the session name by the pattern `<repo>_<Model>_<d-m-yyyy>`, keeping the old date.
- Leave alone: the conversation content (real history) · `cwd` lines pointing at ANOTHER repo (when the session stood in another repo) · sessions with no name.
- Do not use the proposal of `zemory peers --fix` when it glues the new repo name onto an old session name (met 22/10:
  `_DB_ERP_Claude_DB_AppCore_Claude_21-10-2026`). An unchanged line is written back byte for byte.

## 3. Acceptance — the whole table; one row missing means not done

| Measurement | Passes when |
|---|---|
| Folder | the new one exists, the old one is gone |
| Git | `git log -1` is the commit written down in step 0 · `git status` clean |
| Standard | `zemory conform --gate` run FROM the new folder ⇒ exit 0 |
| Session files | the number of fields edited = the count made first · 0 structural fields still carry the old name · 0 broken JSON lines |
| Session titles | `zemory peers --all --check` no longer reports a pattern mismatch for the new repo |
| A real run | the requester reopens an old session and it works ⇒ delete the backup |

## 4. Report

- The acceptance table in numbers · the list of places still pointing at the old path (step 0) and who fixes them.
- A tool hole caught during the move ⇒ written into Zemory's ledger.

## Out of scope

- Renaming a DB or a service that goes with the repo — its own work, at the switch-over time the requester decides.
- Editing documents inside the moved repo · reshaping the structure inside the repo (`Skill_Harness_Reshape` · `Skill_Harness_Reconcile`).

## Forbidden

- Moving while the repo still has a session or editor open.
- Replacing the old name across whole lines of session files (it touches the conversation history).
- Deleting the session-file backup before the requester can reopen an old session.

## Implements · Thi hành luật
- `Rule_Gate_44_RepoScope` — moving a repo writes outside the working repo · dời repo là ghi ngoài repo đang làm
- `Rule_Gate_01_DoneMeansRun` — done only with the acceptance table measured · xong khi đã đo đủ bảng nghiệm thu
