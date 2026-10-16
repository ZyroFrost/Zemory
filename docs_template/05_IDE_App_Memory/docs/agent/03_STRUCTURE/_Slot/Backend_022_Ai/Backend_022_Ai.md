---
id: Slot_22
aka: 03-22
name: ai
version: 4
path: backend/src/ai/
from: _Store/03_STRUCTURE/_Slot/Backend_022_Ai @v4 #fe5cbe690969
---
# Backend_022_Ai ai — lớp AI: provider + adapter

- Vai trò:
  - Lớp AI: provider interface + adapter (local model / OpenAI / Anthropic). Đây là chỗ của LLM client.
  - Model AI = `ai/` + weights ở `data/models/` + prompt ở `backend/resources/prompts/`.
- Được chứa / không chứa: Không chứa: vòng lặp agent (→ `agents/`) · prompt (→ `resources/prompts/`) · weights (→ `data/models/`).
