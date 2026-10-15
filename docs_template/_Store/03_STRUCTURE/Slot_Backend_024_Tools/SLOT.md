---
id: Slot_24
aka: 03-24
name: tools
version: 2
path: backend/src/tools/
applies: [App]
---
# Slot_Backend_024_Tools tools — định nghĩa tool cho LLM gọi

- Vai trò:
  - ĐỊNH NGHĨA tool cho LLM/agent GỌI (tool-calling / MCP): schema + binding + shape kết quả. CHỈ khai báo + nối.
  - THỰC THI delegate cho slot sẵn có: `search/` · `integrations/` · `store/`.
  - `tools/` ≠ `scripts/` (dev/build/ops) ≠ `util/` (helper thuần) ≠ `plugins/` (bên thứ 3).
- Được chứa / không chứa: Không chứa: logic thực thi.
