---
id: Slot_77
aka: 03-77
name: external
version: 2
path: external/
---
# Slot_External_077_External external — code ngoài clone tham chiếu

- Vai trò:
  - Repo / CODE NGOÀI clone về THAM CHIẾU — code của họ (non-app: ETL hệ cũ · script phòng khác · model của người khác): chỉ đọc / gọi / extend.
  - Một trong 6 loại non-code (external = code ngoài). Khác `integrations/` (client gọi service ngoài).
  - Thứ không có nhà thì sẽ chui vào nhà người khác: code ngoài phải có nhà ở đây, kể cả khi nó trông giống pipeline.
- Được chứa / không chứa: Không dán vào `backend`, không nhét vào `pipelines/` hay `scripts/`, không sửa thành của mình.
- Khuôn tên: Tên file/folder không phải của mình (code vendor) để yên — không áp luật tên tiếng Anh ASCII.
