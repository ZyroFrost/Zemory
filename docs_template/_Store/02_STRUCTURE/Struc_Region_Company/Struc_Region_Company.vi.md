---
version: 4
lang: vi
---
# Struc_Region_Company

## Vai trò

Khung của MỘT tổ chức, áp cho `Workspace\Company\<Tổ chức>\`. Mọi việc chủ máy làm cho tổ chức đó nằm ở đây: repo của nó, mỗi repo
theo vai, và các thư mục công việc không phải repo. Quan hệ giữa các repo (`owner` · `uses`) và bảng vai của từng bộ mẫu theo
`Struc_Region_Workspace`.

## Câu hỏi của cấp này

| sự thật | đặt ở |
|---|---|
| repo của một phòng ban | `Dept_<MÃ>\` (Dept_154) — bộ Struc_Repo_Dept |
| repo của một hệ dữ liệu: DW · dữ liệu của một app · trung tâm log | `_DB_<Hệ>\` (Db_155) — Struc_Repo_WorkspaceManager · AppData · LogCenter |
| bảng thuật ngữ nghiệp vụ dùng chung (thư mục đồng bộ) | `_Glossary\` (Glossary_156) |
| khuôn báo cáo dùng chung của một công cụ (thư mục đồng bộ) | `_<Công cụ>_Template\` (Template_157) |
| việc cũ giữ chỉ đọc | `_Legacy\<Nguồn>\` (Legacy_158) |
| app nội bộ hoặc app của bên cung cấp | `_Project\<Nhóm>\<repo>\` (Project_159) |
| giấy tờ của chủ máy với tổ chức này: hợp đồng, đánh giá, bàn giao, logo, hồ sơ công ty, mật khẩu hệ thống của nó | `_Profile\` (Profile_170) |
| mọi thư mục CÔNG VIỆC khác không phải repo: thiết kế, bản vẽ, file của một dự án cũ | `<Việc>\`, đặt theo tên việc (không `_`, không `Dept_`) |

```
Workspace\Company\Acme\
├── Dept_FIN\  Dept_LOG\
├── _DB_Warehouse\  _DB_Log\
├── _Glossary\  _PBI_Template\  _Legacy\OldServer\
├── _Project\ERP\_Hub\  _Project\ERP\AcmeFlow\
└── Designs\  Drawings\                 thư mục công việc, không phải repo
```

## Luật

- Tên bắt đầu bằng `_` là thứ DÙNG CHUNG của cả tổ chức; `Dept_` là của MỘT phòng ban. Thư mục công việc không mang tiền tố nào.
- Repo luôn mang một vai ở trên; repo đặt tên như thư mục công việc bị báo. Thư mục tên `Dept_` hay `_` phải khớp vai của nó
  (`Dept_` + mã VIẾT HOA).
- Mỗi vai dịch vụ (`data` · `log` · `glossary` · `template`) có đúng một nơi cung cấp trong tổ chức.
- Giấy tờ của chủ máy với tổ chức nằm Ở ĐÂY, trong `_Profile\` (luật khối của `Struc_Disk_Data`); giấy tờ dùng cho mọi tổ chức (CV,
  định danh) ⇒ `Documents\Profile\`.
- Không có file lẻ ở cấp tổ chức.

## Phép kiểm

- `zemory conform --layout <ổ>\Workspace\Company\<Tổ chức>` báo đỏ repo không khớp vai nào và thư mục `Dept_`/`_` lệch vai
  (`unknown-folder`), kể cả mã phòng ban không viết hoa. Thư mục không phải repo, không tiền tố là thư mục công việc và được qua.
- `zemory conform` chạy TRONG từng repo kiểm quan hệ của repo đó (`owner` · `uses`, xem `Struc_Region_Workspace`).
- "Mỗi vai dịch vụ đúng một nơi cung cấp" chưa có phép kiểm máy.
