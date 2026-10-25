---
version: 2
lang: vi
---
# Struc_Repo_LogCenter

Chuẩn cấu trúc của repo nhật ký chung: mọi slot của `Struc_Repo_NonApp` (khai `extends`). Slot riêng đo khi ráp repo đầu tiên.

## Vai

- Cung cấp: `log` cho mọi repo của cụm; trong mảng log (khuôn, nơi ghi) repo này quyết.
- Không quản và không thuộc quyền repo nào.
