---
id: 03-25
name: evals
version: 1
path: backend/src/evals/
applies: [App]
---
# 03-25 evals — đo chất lượng model/agent/RAG

- Vai trò:
  - ĐO CHẤT LƯỢNG model/agent/RAG trên corpus CÓ NHÃN (recall@k · LLM-judge · golden set) + gate (vd recall@k ≥ baseline keyword).
  - Khác `backend/test/`: evals đo xác suất, test là pass/fail tất định.
- Được chứa / không chứa: Không chứa: test tất định (→ `backend/test/`).
