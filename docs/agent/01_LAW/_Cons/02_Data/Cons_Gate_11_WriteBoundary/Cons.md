---
frame: Cons_Gate_11_WriteBoundary
status: written
---
# Ranh giới ghi

## Được ghi vào
- `global-memory/global_memory.db` — thêm phiên và tin, dựng lại lớp dẫn xuất; mọi lượt ghi đi qua hàng đợi ghi (`jobs/writeturn.ts`,
  điều 18).
- `data/` của máy — bản sao lưu tự chụp, model cache, nhật ký, trạng thái kênh (điều 14).
- `~/.zemory/location.json` — chỉ con trỏ nói GM nằm đâu (điều 14).
- Thư mục kênh chung trên Drive — nối thêm khối mã hoá (điều 16).

## Đổi cấu trúc chỉ qua
Hàm migration của `backend/src/memory/db.ts`, chạy lúc mở GM; không sửa bảng bằng tay.

## Chỉ chạy khi có lệnh
`zemory memory forget` · `zemory memory redact` · `zemory memory sync --compact` · `zemory memory sync --prune-host --apply` ·
`zemory init` và `zemory sync --standard --apply` trên một repo · mọi lệnh xoá có cờ `.allow-delete`.
