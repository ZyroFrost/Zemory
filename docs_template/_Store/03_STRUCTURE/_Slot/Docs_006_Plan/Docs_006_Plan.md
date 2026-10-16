---
id: Slot_6
aka: 03-6
name: plan
version: 3
path: docs/plan/
---
# Docs_006_Plan plan — spec / plan theo section

- Vai trò:
  - ★ Spec/plan theo section — PHẲNG; MỌI `.md` đều được index.
  - `00_overview.md` = OVERVIEW mặc định mọi app (mục đích · tính năng · ý tưởng · phi-mục-tiêu). Spec chi tiết từ `01_*` trở đi, đánh số tăng dần.
  - Bất biến kiến trúc riêng → `01_CONSTITUTION`, không nằm trong plan.
  - Sơ đồ / flow / kiến trúc mô tả được bằng chữ → khối `mermaid` TRONG `docs/plan/NN_*.md`: đi cùng spec, `plan search` index được.
  - Hệ NON-APP: defect/spec dài của một case → `docs/plan` (một trong 3 ngoại lệ được nằm ngoài `tasks/<case>/`).
- Được chứa / không chứa: Chứa: file `NN_tên.md` phẳng, không thư mục con.
- Khuôn tên: `NN_tên.md` — `NN` hai chữ số, `00` = overview; tên nhiều từ nối bằng `_`.
