---
id: Slot_154
name: dept
version: 2
path: Dept_<Mã>/
match: ^Dept_[A-Z]{2,4}$
scope: layout
---
# Dept_154_Dept dept — repo của một phòng ban

- Vai trò: việc của một phòng ban (báo cáo · số liệu · tác vụ định kỳ); ráp bộ `Struc_Repo_Dept`.
- Được chứa / không chứa:
  - Tổng quản là repo quản cụm của tổ chức (`owner` bắt buộc); đọc dữ liệu qua `_DB_<Hệ>` (`uses.data`).
  - Không chứa: bản sao dữ liệu của hệ nguồn · khuôn báo cáo chung (`_<Công cụ>_Template`).
- Khuôn tên: `Dept_<Mã>`, mã phòng viết HOA 2–4 chữ (`Dept_FIN` · `Dept_LOG`).
