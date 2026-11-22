---
version: 5
lang: vi
---
# Backend_023_Agents agents — vòng lặp agent của app

- Vai trò:
  - VÒNG LẶP AGENT: planning / reasoning / state-machine điều phối LLM (guardrail · grade→rewrite · cap vòng). Model-driven — khác `pipelines/` (tất định).
  - Agent (LLM) dùng 4 chỗ: loop/planning → `agents/` · provider LLM → `ai/` · tool cho LLM gọi → `tools/` · prompt → `resources/prompts/`. Không gộp một folder agent lộn xộn (reasoning + state + memory + tool + LLM-client nhét chung là lỗi phổ biến).
  - Bộ nhớ agent (hội thoại / scratchpad / checkpoint) không có slot riêng: chính sách nhớ-quên-tóm tắt-trim → `agents/` · lưu bền → `store/` · blob runtime → `data/state/` — cùng pattern với notifications/storage/authz.
  - `agents/` ≠ `docs/agent/`: đây là code agent CỦA APP.
- Được chứa / không chứa: Không chứa: LLM client (→ `ai/`) · prompt (→ `resources/prompts/`) · định nghĩa tool (→ `tools/`).
