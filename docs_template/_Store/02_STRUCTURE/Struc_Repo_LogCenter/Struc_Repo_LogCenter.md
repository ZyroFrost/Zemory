---
id: Struc_Repo_LogCenter
name: repo-log-center
version: 2
profile: non-app
label: LOG-CENTER
intro: : repo giữ nhật ký chạy dùng chung của cả cụm — khuôn log, nơi ghi, cách tra
ask: ; repo mà mọi task và app của cụm ghi nhật ký vào là LOG-CENTER
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_NonApp]
---
# Struc_Repo_LogCenter

The structure standard of the shared log repo: every slot of `Struc_Repo_NonApp` (declares `extends`). Its own slots are measured when the first repo is assembled.

## Role

- Provides: `log` for every repo of the group; within logging (format, where to write) this repo decides.
- Manages no repo and belongs to none.
