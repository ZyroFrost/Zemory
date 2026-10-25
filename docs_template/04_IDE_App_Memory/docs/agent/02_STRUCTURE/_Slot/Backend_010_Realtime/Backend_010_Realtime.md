---
id: Slot_10
aka: 03-10
name: realtime
version: 5
path: backend/src/realtime/
from: _Store/02_STRUCTURE/_Slot/Backend_010_Realtime @v5 #3f157efbf27d
---
# Backend_010_Realtime realtime — WebSocket / SSE

- Role: WebSocket / SSE — realtime push. Part of the INBOUND EDGE; a thin surface for WS that only wires into the domain.
- May hold / may not hold: Not here: business logic (→ `services/` or the domain).
