---
id: Slot_23
aka: 03-23
name: agents
version: 5
path: backend/src/agents/
---
# Backend_023_Agents agents — the app's agent loop

- Role:
  - The AGENT LOOP: planning / reasoning / a state machine orchestrating the LLM (guardrails · grade→rewrite · loop caps). Model-driven — not `pipelines/` (deterministic).
  - An agent (LLM) uses 4 places: loop/planning → `agents/` · LLM provider → `ai/` · tools the LLM calls → `tools/` · prompts → `resources/prompts/`. Never one messy agent folder (reasoning + state + memory + tools + LLM client crammed together is a common mistake).
  - Agent memory (conversation / scratchpad / checkpoint) has no slot of its own: the remember-forget-summarise-trim policy → `agents/` · durable storage → `store/` · runtime blobs → `data/state/` — the same pattern as notifications/storage/authz.
  - `agents/` ≠ `docs/agent/`: this is the APP's agent code.
- May hold / may not hold: Not here: the LLM client (→ `ai/`) · prompts (→ `resources/prompts/`) · tool definitions (→ `tools/`).
