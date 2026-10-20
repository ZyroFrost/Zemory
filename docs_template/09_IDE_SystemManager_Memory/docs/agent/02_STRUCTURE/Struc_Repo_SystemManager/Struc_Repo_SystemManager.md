---
id: Struc_Repo_SystemManager
name: repo-system-manager
version: 1
profile: app
label: SYSTEM-MANAGER
intro: : repo quản một hệ nhiều app — quyết khung và chuẩn của các app và repo dữ liệu app nó quản
ask: ; repo điều phối nhiều app cùng một hệ là SYSTEM-MANAGER
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_App]
from: _Store/02_STRUCTURE/Struc_Repo_SystemManager @v1 #54bc23eadc1b
---
# Struc_Repo_SystemManager

Chuẩn cấu trúc của repo quản một hệ app: mọi slot của `Struc_Repo_App` (khai `extends`). Slot riêng của vai đo khi ráp repo
đầu tiên theo template này.

## Vai

- Quản: repo theo `Struc_Repo_App` và `Struc_Repo_AppData`.
- Không thuộc quyền repo nào.
