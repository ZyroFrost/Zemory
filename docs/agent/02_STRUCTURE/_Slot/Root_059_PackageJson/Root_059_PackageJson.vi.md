---
version: 6
lang: vi
---
# Root_059_PackageJson package.json — manifest

- Vai trò:
  - ★ Manifest — file khai phụ thuộc theo chuẩn của công cụ: `package.json` (Node) · `pyproject.toml` · `requirements.txt` (Python).
    Một loại file một slot: tên khác của cùng vai thêm vào `path:` của slot này, không đẻ slot mới.
  - Đặt ở gốc HOẶC `backend/` — không cần cả hai. Node-CLI đặt ở gốc, khai `bin` ở đây.
  - Có thể là entry thay `run.*` qua `bin`/`main`.
