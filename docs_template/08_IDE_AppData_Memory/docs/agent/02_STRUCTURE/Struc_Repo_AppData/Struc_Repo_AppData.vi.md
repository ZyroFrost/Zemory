---
version: 4
lang: vi
---
# Struc_Repo_AppData

Chuẩn cấu trúc của repo dữ liệu app: mọi slot của `Struc_Repo_NonApp` (khai `extends`). Slot riêng đo khi ráp repo đầu tiên.
Mặc định một cơ sở dữ liệu chung cho cả hệ app ⇒ `models/` phẳng (`Models_112_Models`); `Models_142_Database` là slot tuỳ chọn,
chỉ khi repo quản từ hai cơ sở dữ liệu trở lên.

## Vai

- Thuộc quyền: repo theo `Struc_Repo_SystemManager` (`owner` bắt buộc).
- Cung cấp: `app-data` cho các app của hệ.
