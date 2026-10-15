---
id: Slot_123
aka: 03-123
name: pipelines
version: 3
path: pipelines/
---
# Slot_Pipelines_123_Pipelines pipelines — pipeline gom theo nguồn

- Vai trò:
  - Pipeline gom theo NGUỒN, ETL / transform nhiều bước (dbt / python) — CHỈ cho repo KHÔNG tổ chức theo case. Đây là hình dạng thứ hai hợp lệ; repo loại này có thể không có `tasks/`, đừng ép nó thành case.
  - Repo theo case: pipeline nằm trong case (`tasks/<tên>/pipeline/`), không ở đây.
  - Con của `pipelines/` là tự do theo chuẩn — không bị coi là lệch chuẩn.
- Được chứa / không chứa: Không chứa: code ngoài clone về (→ `external/`).
