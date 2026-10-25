---
id: Struc_Repo_AppData
name: repo-app-data
version: 4
profile: non-app
label: APP-DATA
intro: : repo giữ cơ sở dữ liệu dùng chung của các app trong một hệ — mô hình, script đổi cấu trúc; không chứa app
ask: ; repo chỉ giữ cơ sở dữ liệu cho các app khác dùng là APP-DATA
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_NonApp]
---
# Struc_Repo_AppData

The structure standard of an app-data repo: every slot of `Struc_Repo_NonApp` (declares `extends`). Its own slots are measured when the first repo is assembled.
By default one database is shared by the whole app system ⇒ a flat `models/` (`Models_112_Models`); `Models_142_Database` is an optional slot,
only when the repo manages two databases or more.

## Role

- Belongs to: a repo following `Struc_Repo_SystemManager` (`owner` required).
- Provides: `app-data` for the apps of the system.
