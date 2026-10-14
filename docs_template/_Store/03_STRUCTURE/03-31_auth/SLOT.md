---
id: 03-31
name: auth
version: 1
path: backend/src/auth/
applies: [App]
---
# 03-31 auth — authentication + authorization

- Vai trò:
  - Authentication (LÀ AI: login / jwt / oauth / session) + authorization (ĐƯỢC GÌ: role / permission / policy).
  - Phân quyền là concern riêng: định nghĩa role/permission ở `auth/` · ENFORCE (guard) ở `middleware/` · role-data (người dùng→role) ở `store/` · policy file operator sửa ở `config/`.
  - App đa người dùng / đa role → PHẢI có; một người dùng/local → ghi rõ là không phân quyền.
- Được chứa / không chứa: Không chứa: guard enforce (→ `middleware/`).
