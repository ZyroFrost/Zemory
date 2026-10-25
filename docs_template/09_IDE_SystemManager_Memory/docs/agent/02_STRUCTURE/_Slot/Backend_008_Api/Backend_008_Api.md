---
id: Slot_8
aka: 03-8
name: api
version: 5
path: backend/src/api/
from: _Store/02_STRUCTURE/_Slot/Backend_008_Api @v5 #de1ed59013e8
---
# Backend_008_Api api — the endpoints the app opens (inbound edge)

- Role:
  - The endpoints OUR app opens — REST/routes serving the FE/clients, health-check endpoints included.
  - INBOUND EDGE. Three kinds of connection: `api/` = what we OPEN · `integrations/` = OUTSIDE SERVICES · `store/` = the DATABASE.
  - A thin surface for HTTP: only wires into the domain, holds no business logic. A background daemon serving a local UI opens its endpoints here.
- May hold / may not hold: Not here: the FE client calling back to the backend (→ `frontend/client/`) — one name never carries both directions.
