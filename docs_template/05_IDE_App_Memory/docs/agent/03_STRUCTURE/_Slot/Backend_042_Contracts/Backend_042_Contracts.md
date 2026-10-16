---
id: Slot_42
aka: 03-42
name: contracts
version: 4
path: backend/src/contracts/
from: _Store/03_STRUCTURE/_Slot/Backend_042_Contracts @v4 #764b23c4f26b
---
# Backend_042_Contracts contracts — file spec hợp đồng API

- Vai trò:
  - FILE spec hợp đồng API: OpenAPI / proto / GraphQL-SDL / AsyncAPI (contract-first).
  - Sinh code → `generated/` (gitignore).
  - Khác `shared/` (code TS chạy được). Đa client/SDK → dùng `contracts/` ở gốc thay chỗ này.
- Được chứa / không chứa: Không chứa: code sinh ra (→ `generated/`).
