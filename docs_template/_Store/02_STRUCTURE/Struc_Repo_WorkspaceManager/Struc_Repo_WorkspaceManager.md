---
id: Struc_Repo_WorkspaceManager
name: repo-workspace-manager
version: 6
profile: non-app
label: WORKSPACE-MANAGER
intro: : repo tổng quản của một cụm — giữ dữ liệu dùng chung (DW, kho dữ liệu), giá trị của cụm, bộ mail chung; quyết khung và chuẩn của các repo phòng ban nó quản
ask: ; repo giữ kho dữ liệu và chuẩn chung mà các repo phòng ban đọc là WORKSPACE-MANAGER
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_NonApp]
installs: [scripts/region_values.py]
---
# Struc_Repo_WorkspaceManager

The structure standard of the repo that manages a group: every slot of `Struc_Repo_NonApp` (declares `extends`) plus the slots of the services it
provides to the whole group. This template differs from one owner's group to another; the shared part is the role and the services below.

## Role

- Manages: repos following the template `Struc_Repo_Dept` (the frame, the report standard, the department set).
- Provides to the whole group: `data` (the DW, the data warehouse) · `workspace-values` (the group's values, slot `Data_140_WorkspaceValues`) · `mail`
  (the shared mail set, slot `Config_139_Mail`).
- Belongs to no repo (the top level of the group).
- **Changing the shared standard is this repo's work.** A rule that applies to every repo of the group (slot · law · skill · machine-written block) ⇒ this repo
  changes it in HS, then runs `zemory sync`; each repo's `conform` catches what is still off. Never message each repo to fix it by hand, never let a repo
  change ahead of the standard. Sync writing into a repo with the `dept` role is the one exception to the measure-only, never-write rule; every other change in
  that repo stays the work of that repo's session.
- **One `zemory sync` in this repo covers every repo it manages.** The machine assembles this repo first, then each repo whose role is in
  `role.manages` of this template (`dept`):
  - a repo whose marker declares `owner` as this repo's name;
  - a repo that has not declared `owner` while this is the only repo in the group managing that role: `owner` is certain, sync writes it into the marker and assembles that repo.
    Two repos managing one role ⇒ the machine does not guess: the undeclared repo is not assembled, and its `conform` asks for `owner`.
  - Each repo is assembled by the set written in its own marker (`kit`), not by this repo's set ⇒ it keeps its own structure; what
    the machine cannot fix by itself goes into that repo's `04_TODO`.
  - `zemory sync --self` assembles only this repo. A repo with an agent session mid-work ⇒ wait for that session to commit before syncing.
- Installs `scripts/region_values.py` like the department template (a byte-for-byte copy of the one in `Struc_Repo_Dept`, a test keeps the two copies
  equal): the tools of the PBI skills and the VM tasks read the group's values through it; run inside this repo, it takes this repo as the manager.

## How other repos use the services

- A department repo declares `owner` = this repo's name, and `uses` by area (`data` · `mail` …).
- Adding or changing something in a shared service (a mail recipient, a value of the group) ⇒ message this repo's session; another repo never writes it directly
  (`Rule_Gate_44_RepoScope`).
