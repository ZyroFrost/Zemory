---
id: 03-76
name: contracts
version: 1
path: contracts/
applies: [App]
---
# 03-76 contracts — spec API ở gốc (escape-hatch)

- Vai trò:
  - Escape-hatch: spec API ở GỐC khi ĐA CLIENT/SDK dùng chung — thay cho `backend/src/contracts`.
  - Đi cùng `packages/contracts` trong monorepo để cắt coupling.
