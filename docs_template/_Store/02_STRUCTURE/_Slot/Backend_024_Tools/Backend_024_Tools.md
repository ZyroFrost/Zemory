---
id: Slot_24
aka: 03-24
name: tools
version: 5
path: backend/src/tools/
---
# Backend_024_Tools tools — tool definitions for an LLM to call

- Role:
  - DEFINES the tools an LLM/agent CALLS (tool calling / MCP): schema + binding + result shape. ONLY declaring + wiring.
  - EXECUTION is delegated to existing slots: `search/` · `integrations/` · `store/`.
  - `tools/` ≠ `scripts/` (dev/build/ops) ≠ `util/` (pure helpers) ≠ `plugins/` (third parties).
- May hold / may not hold: Not here: the execution logic.
