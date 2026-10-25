---
id: Slot_22
aka: 03-22
name: ai
version: 5
path: backend/src/ai/
from: _Store/02_STRUCTURE/_Slot/Backend_022_Ai @v5 #742f72ed7e6a
---
# Backend_022_Ai ai — the AI layer: providers + adapters

- Role:
  - The AI layer: provider interface + adapters (local model / OpenAI / Anthropic). This is where the LLM client lives.
  - An AI model = `ai/` + weights in `data/models/` + prompts in `backend/resources/prompts/`.
- May hold / may not hold: Not here: the agent loop (→ `agents/`) · prompts (→ `resources/prompts/`) · weights (→ `data/models/`).
