---
id: Struc_Repo_Reference
name: repo-reference
version: 2
profile: non-app
label: REFERENCE
intro: : repo tham chiếu dùng chung — bảng thuật ngữ, hồ sơ hệ cũ, khuôn báo cáo gốc; chỉ để tra, không chạy việc
ask: ; repo chỉ để các repo khác tra cứu là REFERENCE
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_NonApp]
---
# Struc_Repo_Reference

The structure standard of a reference repo: every slot of `Struc_Repo_NonApp` (declares `extends`).

## Role

- Provides, depending on the repo: `glossary` (the terms table) · `legacy` (old-system records) · `template` (the original report templates).
- Manages no repo and belongs to none.
