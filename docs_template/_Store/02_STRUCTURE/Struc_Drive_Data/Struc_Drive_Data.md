---
id: Struc_Drive_Data
name: drive-data
version: 1
scope: drive
---
# Struc_Drive_Data

Khung của một ổ dữ liệu: gốc ổ (`D:\`) trên Windows, hoặc một thư mục dữ liệu (`~/data`) trên Linux. Mỗi thư mục cấp 1 một
vai; máy mới ráp khung này trước, rồi tới `Struc_Region_Workspace` trong `Workspace/`, rồi `Struc_Region_Company` cho từng tổ
chức, cuối cùng từng repo theo bộ của vai nó.

## Cây

```
<ổ dữ liệu>/
├── Workspace/                     mọi repo (Workspace_143) → Struc_Region_Workspace
├── Software/                      bản cài (Software_147)
│   └── <Nhóm>/                    AI · Dev · Drivers · Network · Office · System · Utility (Software_148)
│       └── [<Hãng>/]<Ứng dụng>/   App/ · Data/ · Setup/ (Software_149)
│   └── Drivers/<Thiết bị>/        gói driver (Software_150)
├── AppConfig/<công cụ>/           cấu hình + khoá: configs/ · credentials/ · cache/ (AppConfig_151)
├── Documents/<mảng>/              tài liệu cá nhân (Documents_152)
└── Recovery/                      bản khôi phục máy (Recovery_153)
```

## Luật

- Gốc ổ không có file lẻ; mọi thứ nằm trong một trong năm thư mục trên.
- Repo chỉ nằm trong `Workspace/`. Bản cài chỉ nằm trong `Software/`. Bí mật của công cụ chỉ nằm trong `AppConfig/`.
- Ổ ảo và dữ liệu lớn của phần mềm nằm ở `Software/<Nhóm>/<Ứng dụng>/Data/`, có trần dung lượng; đo chỗ trống của ổ trước
  mỗi việc ghi lớn.
- Phép kiểm: `zemory conform --layout <gốc ổ>` — thư mục lạ ở cấp 1 · repo ngoài `Workspace/` · nhóm `Software` lạ · file lẻ ở gốc.
