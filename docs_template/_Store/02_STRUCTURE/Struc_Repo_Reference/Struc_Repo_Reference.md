---
id: Struc_Repo_Reference
name: repo-reference
version: 1
profile: non-app
label: REFERENCE
intro: : repo tham chiếu dùng chung — bảng thuật ngữ, hồ sơ hệ cũ, khuôn báo cáo gốc; chỉ để tra, không chạy việc
ask: ; repo chỉ để các repo khác tra cứu là REFERENCE
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_NonApp]
---
# Struc_Repo_Reference

Chuẩn cấu trúc của repo tham chiếu: mọi slot của `Struc_Repo_NonApp` (khai `extends`).

## Vai

- Cung cấp, tuỳ repo: `glossary` (bảng thuật ngữ) · `legacy` (hồ sơ hệ cũ) · `template` (khuôn báo cáo gốc).
- Không quản và không thuộc quyền repo nào.
