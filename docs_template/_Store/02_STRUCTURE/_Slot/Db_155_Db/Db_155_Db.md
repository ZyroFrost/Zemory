---
id: Slot_155
name: db
version: 1
path: _DB_<Hệ>/
scope: layout
---
# Db_155_Db db — repo dữ liệu của một hệ

- Vai trò:
  - Một hệ dữ liệu của tổ chức: DW (vai cung cấp `data`) · hệ nghiệp vụ nguồn (ERP, POS…) · trung tâm log (vai `log`).
  - Ráp bộ theo vai: DW và hệ nguồn ⇒ `Struc_Repo_AppData`; log ⇒ `Struc_Repo_LogCenter`.
- Được chứa / không chứa: lược đồ · truy vấn có tên · tác vụ nạp dữ liệu · tài liệu nguồn; không chứa báo cáo của phòng ban.
- Khuôn tên: `_DB_<Hệ>`, hệ PascalCase (`_DB_Warehouse` · `_DB_Erp` · `_DB_Log`).
