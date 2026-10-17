---
id: Slot_5
aka: 03-5
name: agent
version: 7
path: docs/agent/
---
# Docs_005_Agent agent — bộ tài liệu lõi cho agent

- Vai trò:
  - ★ `01_LAW/` (luật chung `_Rule/` · hiến pháp của repo `_Cons/`) · `02_STRUCTURE/` · `03_SKILLS/` · `04_TODO.md` · `05_CHANGES.md`.
  - Mỗi file một vai; một nội dung sống ở một nhà, nơi khác dẫn chiếu (`Rule_Gate_35_OneHome`):
    - `01_LAW/_Rule` luật chung · `01_LAW/_Cons` bất biến của chính sản phẩm (không đặt trong plan);
    - `02_STRUCTURE` chỗ để file + từ điển tên · `03_SKILLS` quy trình thao tác (luật chỉ nêu điều phải làm và dẫn chiếu tới đây);
    - `04_TODO` việc chưa làm · `05_CHANGES` changelog.
  - Hệ NON-APP: từ điển dữ liệu (metric · cột · thuật ngữ) theo slot `Docs_138_DataDictionary`; đổi định nghĩa metric ghi `05_CHANGES` (supersede nếu đảo định nghĩa cũ).
  - `docs/agent/` ≠ `backend/src/agents/`: đây là harness docs cho coding-agent đọc; `agents/` là code agent của app.
- Khuôn `05_CHANGES` (cổng `validate`):
  - entry mới nhất chèn ngay sau phần đầu, trên mọi entry cũ; tiêu đề `## [YYYY-MM-DD] — tiêu đề`;
  - entry đảo hoặc thay một quyết định cũ mở đầu bằng `> 🔄 **Supersede:** thay [YYYY-MM-DDx] — "[đề mục]" — [lý do].`, nêu đúng khoá ngày của entry bị thay; không sửa, không xoá entry cũ;
  - một entry tối đa khoảng 30 dòng, chỉ gồm đổi gì · vì sao · số đo; chi tiết thiết kế ⇒ plan.
- Được chứa / không chứa: Không chứa: code agent của app (→ `backend/src/agents/`) · spec chi tiết (→ `docs/plan/`).
- Khuôn tên: Đánh số `01_`…`05_` cố định như trên.
