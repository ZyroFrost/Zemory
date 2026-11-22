---
id: Slot_67
aka: 03-67
name: client
version: 5
path: frontend/client/
from: _Store/02_STRUCTURE/_Slot/Frontend_067_Client @v5 #9ba29033cfed
---
# Frontend_067_Client client — the client that calls our own backend (outbound edge)

- Role: The client that calls OUR OWN BACKEND (FE → BE). This is the OUTBOUND EDGE towards our own BE; `integrations/` is the outbound edge to the outside.
- Naming: Never named `api/`: `api/` is the INBOUND edge (what we open) — one name never carries both directions.
