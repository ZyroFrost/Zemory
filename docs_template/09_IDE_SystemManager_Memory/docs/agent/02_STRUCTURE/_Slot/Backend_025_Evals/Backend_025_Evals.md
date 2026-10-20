---
id: Slot_25
aka: 03-25
name: evals
version: 4
path: backend/src/evals/
from: _Store/02_STRUCTURE/_Slot/Backend_025_Evals @v4 #5ff1610df2c6
---
# Backend_025_Evals evals — đo chất lượng model/agent/RAG

- Vai trò:
  - ĐO CHẤT LƯỢNG model/agent/RAG trên corpus CÓ NHÃN (recall@k · LLM-judge · golden set) + gate (vd recall@k ≥ baseline keyword).
  - Khác `backend/test/`: evals đo xác suất, test là pass/fail tất định.
- Được chứa / không chứa: Không chứa: test tất định (→ `backend/test/`).
