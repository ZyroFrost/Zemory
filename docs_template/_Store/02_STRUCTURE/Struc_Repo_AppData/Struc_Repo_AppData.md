---
id: Struc_Repo_AppData
name: repo-app-data
version: 2
profile: non-app
label: APP-DATA
intro: : repo giữ cơ sở dữ liệu dùng chung của các app trong một hệ — mô hình, script đổi cấu trúc; không chứa app
ask: ; repo chỉ giữ cơ sở dữ liệu cho các app khác dùng là APP-DATA
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_NonApp]
---
# Struc_Repo_AppData

Chuẩn cấu trúc của repo dữ liệu app: mọi slot của `Struc_Repo_NonApp` (khai `extends`) cộng slot riêng
`Models_142_Database` — `models/<database>/`, mỗi cơ sở dữ liệu repo quản một folder.

## Vai

- Thuộc quyền: repo theo `Struc_Repo_SystemManager` (`owner` bắt buộc).
- Cung cấp: `app-data` cho các app của hệ.
