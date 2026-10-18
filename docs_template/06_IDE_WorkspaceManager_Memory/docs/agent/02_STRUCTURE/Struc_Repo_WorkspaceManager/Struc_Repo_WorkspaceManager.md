---
id: Struc_Repo_WorkspaceManager
name: repo-workspace-manager
version: 2
profile: non-app
label: WORKSPACE-MANAGER
intro: : repo tổng quản của một cụm — giữ dữ liệu dùng chung (DW, kho dữ liệu), giá trị của cụm, bộ mail chung; quyết khung và chuẩn của các repo phòng ban nó quản
ask: ; repo giữ kho dữ liệu và chuẩn chung mà các repo phòng ban đọc là WORKSPACE-MANAGER
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_NonApp]
from: _Store/02_STRUCTURE/Struc_Repo_WorkspaceManager @v2 #8519baa028d9
---
# Struc_Repo_WorkspaceManager

Chuẩn cấu trúc của repo tổng quản một cụm: mọi slot của `Struc_Repo_NonApp` (khai `extends`) cộng các slot của dịch vụ nó
cung cấp cho cả cụm. Template này khác nhau theo từng cụm của người dùng; phần chung là vai và các dịch vụ dưới đây.

## Vai

- Quản: repo theo template `Struc_Repo_Dept` (khung, chuẩn báo cáo, bộ mẫu của phòng ban).
- Cung cấp cho cả cụm: `data` (DW, kho dữ liệu) · `workspace-values` (giá trị của cụm, slot `Data_140_WorkspaceValues`) · `mail`
  (bộ mail chung, slot `Config_139_Mail`).
- Không thuộc quyền repo nào (cấp cao nhất của cụm).

## Repo khác dùng dịch vụ thế nào

- Repo phòng ban khai `owner` = tên repo này, và `uses` theo mảng (`data` · `mail` …).
- Thêm hoặc sửa thứ trong dịch vụ chung (người nhận mail, một giá trị của cụm) ⇒ nhắn phiên của repo này; repo khác không ghi thẳng
  (`Rule_Gate_44_RepoScope`).
