---
id: Slot_143
name: workspace
version: 1
path: Workspace/
scope: layout
---
# Workspace_143_Workspace workspace — mọi repo của người dùng

- Vai trò:
  - Thư mục DUY NHẤT trên ổ chứa repo (git hoặc thư mục ráp HS). Repo nằm chỗ khác trên ổ là lệch chuẩn.
  - Cấp con theo khung `Struc_Region_Workspace`: `Company/` · `Personal/` · `External/`.
- Được chứa / không chứa:
  - Chứa: ba vùng trên, không gì khác ở cấp này.
  - Không chứa: bản cài phần mềm (`Software/`) · cấu hình công cụ (`AppConfig/`) · tài liệu cá nhân (`Documents/`) ·
    file lẻ.
- Khuôn tên: `Workspace`, cố định.
- Đồng bộ: mỗi repo tự đi đường của nó (git · Syncthing · kênh zemory); thư mục `Workspace/` không đồng bộ nguyên khối.
