---
id: Struc_Region_Company
name: region-company
version: 1
scope: region
---
# Struc_Region_Company

Khung của một tổ chức trong `Workspace/Company/<Tổ chức>/`: các repo xếp theo vai, cùng ba thư mục dùng chung. Quan hệ giữa
các repo (tổng quản · dịch vụ) theo `Struc_Region_Workspace`.

## Cây

```
<Tổ chức>/
├── Dept_<Mã>/                 repo phòng ban (Dept_154) — Struc_Repo_Dept
├── _DB_<Hệ>/                  repo dữ liệu: DW · hệ nguồn · log (Db_155) — Struc_Repo_AppData · Struc_Repo_LogCenter
├── _Glossary/                 thuật ngữ chung, đồng bộ (Glossary_156)
├── _<Công cụ>_Template/       khuôn báo cáo chung, đồng bộ (Template_157)
├── _Legacy/<Nguồn>/           lưu trữ việc cũ, chỉ đọc (Legacy_158)
└── _Project/<Nhóm>/<repo>/    ứng dụng nội bộ (ERP/) · của bên cung cấp (Vendor/) (Project_159)
```

## Luật

- Tên bắt đầu `_` = thứ dùng chung của cả tổ chức; tên `Dept_` = của một phòng.
- Mỗi vai dịch vụ (`data` · `log` · `glossary` · `template`) có đúng một nơi cung cấp trong tổ chức.
- Phép kiểm: `zemory conform --layout <thư mục tổ chức>` — thư mục không khớp slot nào · repo phòng ban sai khuôn tên · vai
  dịch vụ thiếu nơi cung cấp hoặc có hai nơi.
