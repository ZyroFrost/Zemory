---
id: Struc_Repo_LogCenter
name: repo-log-center
version: 1
profile: non-app
label: LOG-CENTER
intro: : repo giữ nhật ký chạy dùng chung của cả cụm — khuôn log, nơi ghi, cách tra
ask: ; repo mà mọi task và app của cụm ghi nhật ký vào là LOG-CENTER
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_NonApp]
---
# Struc_Repo_LogCenter

Chuẩn cấu trúc của repo nhật ký chung: mọi slot của `Struc_Repo_NonApp` (khai `extends`). Slot riêng đo khi ráp repo đầu tiên.

## Vai

- Cung cấp: `log` cho mọi repo của cụm; trong mảng log (khuôn, nơi ghi) repo này quyết.
- Không quản và không thuộc quyền repo nào.
