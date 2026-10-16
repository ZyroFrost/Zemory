---
id: Slot_24
aka: 03-24
name: tools
version: 3
path: backend/src/tools/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_024_Tools @v3 #9759aeccb58e
---
# Slot_Backend_024_Tools tools — định nghĩa tool cho LLM gọi

- Vai trò:
  - ĐỊNH NGHĨA tool cho LLM/agent GỌI (tool-calling / MCP): schema + binding + shape kết quả. CHỈ khai báo + nối.
  - THỰC THI delegate cho slot sẵn có: `search/` · `integrations/` · `store/`.
  - `tools/` ≠ `scripts/` (dev/build/ops) ≠ `util/` (helper thuần) ≠ `plugins/` (bên thứ 3).
- Được chứa / không chứa: Không chứa: logic thực thi.
