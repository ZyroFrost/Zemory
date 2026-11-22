---
id: Slot_76
aka: 03-76
name: contracts
version: 5
path: contracts/
from: _Store/02_STRUCTURE/_Slot/Contracts_076_Contracts @v5 #265c340496b1
---
# Contracts_076_Contracts contracts — the API spec at the root (escape hatch)

- Role:
  - Escape hatch: the API spec at the ROOT when SEVERAL CLIENTS/SDKs share it — instead of `backend/src/contracts`.
  - Goes with `packages/contracts` in a monorepo to cut the coupling.
