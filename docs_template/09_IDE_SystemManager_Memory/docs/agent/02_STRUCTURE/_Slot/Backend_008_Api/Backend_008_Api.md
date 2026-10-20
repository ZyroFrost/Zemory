---
id: Slot_8
aka: 03-8
name: api
version: 4
path: backend/src/api/
from: _Store/02_STRUCTURE/_Slot/Backend_008_Api @v4 #e7d4f65e6d2f
---
# Backend_008_Api api — endpoint app mở ra (biên vào)

- Vai trò:
  - Endpoint app MÌNH mở — REST/route phục vụ FE/client, kể cả health-check endpoint.
  - BIÊN VÀO. Ba loại kết nối: `api/` = mình MỞ · `integrations/` = SERVICE ngoài · `store/` = DATABASE.
  - Surface mỏng cho HTTP: chỉ wire vào domain, không chứa nghiệp vụ. Daemon nền phục vụ UI cục bộ mở endpoint ở đây.
- Được chứa / không chứa: Không chứa: client gọi về backend từ FE (→ `frontend/client/`) — một tên không gánh hai chiều.
