---
id: 03-5
name: agent
version: 1
path: docs/agent/
---
# 03-5 agent — bộ tài liệu lõi cho agent

- Vai trò:
  - ★ `01_CONSTITUTION` · `02_RULES` · `03_STRUCTURE` · `04_SKILLS` · `05_TODO` · `06_CHANGES`.
  - `01_CONSTITUTION` giữ bất biến kiến trúc riêng của app — không đặt trong plan.
  - `02_RULES §Luật khi VIẾT` giữ luật nổ lúc viết code (`conform` không kiểm được).
  - `04_SKILLS` là KHO SKILL — chỉ chứa skill/playbook thao tác (grill · chốt phiên · reconcile; non-app thêm pull/fill/upload); `02_RULES`/`03_STRUCTURE` chỉ nêu norm + trigger rồi dẫn chiếu tới đây. Index skill vendored ở `external/skills/` cũng ở đây.
  - Hệ NON-APP: từ điển dữ liệu (metric · cột · thuật ngữ) nằm trong `03_STRUCTURE` (part `03-138` data-dictionary); mọi động tác tự động ghi lại được vào `06_CHANGES`/`05_TODO`; đổi định nghĩa metric ghi `06_CHANGES` (supersede nếu đảo định nghĩa cũ).
  - `docs/agent/` ≠ `backend/src/agents/`: đây là harness docs cho coding-agent đọc; `agents/` là code agent của app.
- Được chứa / không chứa: Không chứa: code agent của app (→ `backend/src/agents/`) · spec chi tiết (→ `docs/plan/`).
- Khuôn tên: Đánh số `01_`…`06_` cố định như trên.
