---
id: Struc_Repo_Dept
name: repo-dept
version: 11
profile: non-app
label: DEPT
intro: : repo của một phòng ban trong một vùng có tổng quản — việc theo case (kéo · xử lý · giao báo cáo), báo cáo BI, tác vụ chạy định kỳ trên máy chủ; không phát triển app
ask: ; repo phòng ban nhận dữ liệu từ DW của tổng quản và giao báo cáo cho người nhận là DEPT
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
installs: [scripts/region_values.py]
---
# Struc_Repo_Dept

The structure standard of a department repo: every slot of `Struc_Repo_NonApp` (declares `extends`, never copied) plus the department's own
slots. A department differs from a plain NON-APP repo in its naming and in belonging to a region: case names and file names follow the region's
pattern, and the real values (servers · shared libraries · mailboxes · department codes) live in the region's manager repo, not in the
department repo. The slots live in `_Slot/` and belong to no kind.

## Belongs to a group

- Role `dept` (the `role` block in `structure.json`): belongs to a repo following `Struc_Repo_WorkspaceManager`; declaring `owner` is
  required. The relations and boundaries between the repos of a group: `Struc_Region_Workspace`.
- The group's real values (servers · shared libraries · mailboxes · department codes) live in the manager (slot `Data_140_WorkspaceValues`).
  `scripts/region_values.py` (installed into the repo by this template) finds the manager through `owner` in the marker; tools and skills name only the KEY.
- Mail: recipients, senders and sending keys live in the manager's shared mail set (slot `Config_139_Mail`); a department repo keeps no contact list.
- Git is a BACKUP ON THE MACHINE (`role.git: local`): commit often, no remote, no push. Other machines get the repo through
  zemory's backup and Syncthing, never through git. Never report "no remote yet / not pushed". Machine check: the guard blocks `git push` ·
  `git remote add` · `git remote set-url` (no flag); `conform` › `git-remote-on-backup-repo` reds when the repo has a remote.

## Opening a new department repo

1. The name `Dept_<CODE>`: the code belongs to the group's closed set (key `dept_codes`); a new code is decided by the owner in the manager's session. The folder name
   is the repo's identity in the shared memory ⇒ settled once; changing it later means moving `project_root`, done in the manager's session.
2. Assemble the harness from the department set: `zemory init --kit <set no>`; declare the marker's `owner` = the manager repo and `uses` by the areas needed
   (`data` · `workspace-values` · `mail`); `zemory conform` green.
3. Fill in the constitution frames (`Cons.md`) for the department's own product — never copy another department's articles; the group's shared invariants live in
   the manager's constitution.
4. Git is required, local only: `.gitignore` blocks `data/` · `exports/` · secrets FIRST → `git init -b main` · `core.autocrlf false`
   · LFS for heavy binaries (`*.pbix` · `*.xlsx`) · the harness pre-commit hook → read the staging list, 0 secrets → the first commit. No
   remote, no push until the owner decides the target (`Rule_Gate_50_Git`).
5. No empty slots: a folder exists only when it holds a real file — at every level, `data/<case>/` stages included (`Struc_Disk_Data` §Rules).
