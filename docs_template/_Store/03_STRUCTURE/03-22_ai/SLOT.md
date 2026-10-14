---
id: 03-22
name: ai
version: 1
path: backend/src/ai/
applies: [App]
---
# 03-22 ai — lớp AI: provider + adapter

- Vai trò:
  - Lớp AI: provider interface + adapter (local model / OpenAI / Anthropic). Đây là chỗ của LLM client.
  - Model AI = `ai/` + weights ở `data/models/` + prompt ở `backend/resources/prompts/`.
- Được chứa / không chứa: Không chứa: vòng lặp agent (→ `agents/`) · prompt (→ `resources/prompts/`) · weights (→ `data/models/`).
