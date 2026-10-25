---
id: Struc_Repo_SystemManager
name: repo-system-manager
version: 2
profile: app
label: SYSTEM-MANAGER
intro: : repo quản một hệ nhiều app — quyết khung và chuẩn của các app và repo dữ liệu app nó quản
ask: ; repo điều phối nhiều app cùng một hệ là SYSTEM-MANAGER
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_App]
---
# Struc_Repo_SystemManager

The structure standard of a repo that manages an app system: every slot of `Struc_Repo_App` (declares `extends`). The role's own slots are measured when
the first repo is assembled from this template.

## Role

- Manages: repos following `Struc_Repo_App` and `Struc_Repo_AppData`.
- Belongs to no repo.
