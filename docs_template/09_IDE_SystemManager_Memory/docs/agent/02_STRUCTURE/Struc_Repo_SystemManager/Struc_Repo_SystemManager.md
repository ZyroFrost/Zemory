---
id: Struc_Repo_SystemManager
name: repo-system-manager
version: 3
profile: app
label: SYSTEM-MANAGER
intro: : repo quản một hệ nhiều app — quyết khung và chuẩn của các app và repo dữ liệu app nó quản
ask: ; repo điều phối nhiều app cùng một hệ là SYSTEM-MANAGER
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_App, Struc_Repo_WorkspaceManager]
from: _Store/02_STRUCTURE/Struc_Repo_SystemManager @v3 #0d9318cd6b51
---
# Struc_Repo_SystemManager

The structure standard of a repo that manages an app system: every slot of `Struc_Repo_App` (declares `extends`). The role's own slots are measured when
the first repo is assembled from this template.

## Role

- Manages: repos following `Struc_Repo_App` and `Struc_Repo_AppData`.
- Belongs to no repo (the top of its app system).
- It is itself an app: it serves only what the system shares (`Rule_Keys_90_AppFamilyContract` Do 4–5) — never an app's pages or business API.
- Provides to the whole system:
  - `gateway` — the one address of the system: the reverse proxy that routes one path per app to that app's own port, and the table of
    apps it routes from (id · path · port · app code · health path). The table is a config file of this repo; the proxy configuration is generated from it,
    never edited by hand on the machine.
  - `sign-in` — the one sign-in page and the one session of the system, the admin screen for accounts, roles per app, sessions and the
    operation log of every app.
- **The system's real values are written once here** (`_Store/README.md` §8.3): the session cookie's name, the app codes, the sign-in path, the session expiry
  hours, the port range — in this repo's constitution (an article from 101) and its table of apps. Each app's `Cons_Gate_14_Access` points here and adds only
  what is its own.
- **Changing the shared standard is this repo's work.** A rule that applies to every app of the system (law · skill · slot) ⇒ this repo changes it in HS, then
  runs `zemory sync`; each app's `conform` catches what is still off. Never message each app to fix it by hand, never let an app change ahead of the standard.
- **One `zemory sync` in this repo covers every repo it manages** — the same machine as for `Struc_Repo_WorkspaceManager`: this repo first, then each
  repo whose role is in `role.manages` and whose marker declares `owner` as this repo's name. Each is assembled by its own `kit`. A repo with an agent session
  mid-work ⇒ wait for that session to commit before syncing.

## How the apps use the services

- An app declares `owner` = this repo's name in its marker, and `uses` `gateway` and `sign-in` = this repo.
- A path or a port behind the gateway, a role set that differs from the default, a new app ⇒ message this repo's session; an app never edits the table of
  apps or the proxy configuration (`Rule_Gate_44_RepoScope`).
- How an app reads the shared session and answers a person without one: `Skill_Dev_AppDesign` › "An app of a family".
