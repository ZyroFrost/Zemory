---
id: Struc_Region_Company
name: region-company
version: 2
scope: region
---
# Struc_Region_Company

## Vai trò

Khung của MỘT tổ chức, áp cho thư mục `Workspace\Company\<Tổ chức>\`. Mọi repo của tổ chức nằm ở cấp này, xếp theo vai.
Quan hệ giữa các repo (tổng quản `owner` · dịch vụ `uses`) và bảng vai của từng template theo `Struc_Region_Workspace`.

## Cây

```
<Tổ chức>\
├── Dept_<Mã>\                 repo của một phòng ban (Dept_154) — ráp Struc_Repo_Dept
├── _DB_<Hệ>\                  repo của một hệ dữ liệu (Db_155):
│                                kho dữ liệu → Struc_Repo_WorkspaceManager · hệ dữ liệu của ứng dụng → Struc_Repo_AppData
│                                · trung tâm log → Struc_Repo_LogCenter
├── _Glossary\                 thuật ngữ chung, thư mục đồng bộ (Glossary_156) — ráp Struc_Repo_Reference
├── _<Công cụ>_Template\       khuôn báo cáo chung, thư mục đồng bộ (Template_157) — ráp Struc_Repo_Reference
├── _Legacy\<Nguồn>\           lưu trữ việc cũ, chỉ đọc (Legacy_158) — ráp Struc_Repo_Reference
└── _Project\<Nhóm>\<repo>\    ứng dụng nội bộ (ERP\) · ứng dụng của bên cung cấp (Vendor\) (Project_159)
```

Ví dụ một tổ chức đầy đủ:

```
Workspace\Company\Acme\
├── Dept_FIN\  Dept_LOG\  Dept_SAL\
├── _DB_Warehouse\  _DB_Erp\  _DB_Log\
├── _Glossary\  _PBI_Template\  _Legacy\OldServer\
└── _Project\ERP\_Hub\  _Project\ERP\AcmeFlow\  _Project\Vendor\CameraAI\
```

## Luật

- Tên bắt đầu bằng `_` là thứ DÙNG CHUNG của cả tổ chức; tên bắt đầu bằng `Dept_` là của MỘT phòng ban.
- Mỗi vai dịch vụ (`data` · `log` · `glossary` · `template`) có ĐÚNG MỘT nơi cung cấp trong tổ chức: một kho dữ liệu, một
  trung tâm log, một `_Glossary\`, một thư mục khuôn cho mỗi công cụ báo cáo.
- Không có thư mục nào khác ở cấp tổ chức ngoài các vai trên, không có file lẻ, không có repo đặt lệch vai (repo của một phòng
  nằm trong `_Project\`, ứng dụng nằm thẳng ở cấp tổ chức…).

## Phép kiểm

- `zemory conform --layout <ổ>\Workspace\Company\<Tổ chức>` báo đỏ thư mục không khớp vai nào (`unknown-folder`), gồm cả
  thư mục phòng ban sai khuôn tên (`Dept_finance`).
- `zemory conform` chạy TRONG từng repo kiểm quan hệ của repo đó (`owner` · `uses`, xem `Struc_Region_Workspace`).
- Luật "mỗi vai dịch vụ đúng một nơi cung cấp" CHƯA có phép kiểm máy: người dựng tổ chức tự soát.
