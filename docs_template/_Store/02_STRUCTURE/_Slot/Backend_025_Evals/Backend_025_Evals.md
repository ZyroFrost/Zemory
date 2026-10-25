---
id: Slot_25
aka: 03-25
name: evals
version: 5
path: backend/src/evals/
---
# Backend_025_Evals evals — measuring model/agent/RAG quality

- Role:
  - MEASURES the QUALITY of a model/agent/RAG on a LABELLED corpus (recall@k · LLM judge · golden set) + a gate (e.g. recall@k ≥ the keyword baseline).
  - Not `backend/test/`: evals measure probabilities, tests are deterministic pass/fail.
- May hold / may not hold: Not here: deterministic tests (→ `backend/test/`).
