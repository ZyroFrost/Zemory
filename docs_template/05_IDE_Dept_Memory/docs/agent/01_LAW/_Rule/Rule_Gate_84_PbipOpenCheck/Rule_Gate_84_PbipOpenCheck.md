---
id: Rule_84
name: pbip-open-check
version: 1
kind: action
from: _Store/01_LAW/_Rule/Rule_Gate_84_PbipOpenCheck @v1 #d77174ec0efc
---
# Rule_Gate_84_PbipOpenCheck Chỉ mở file .pbip khi không có lỗi làm hỏng file

- Lệnh mở một file `.pbip` (`Start-Process` · `Invoke-Item` · `start` · `& "…"`) chạy trước
  `python scripts/pbi_gate.py <report> --open-check`. Có lỗi làm hỏng file (Desktop từ chối mở hoặc mở kèm "issues") ⇒ không mở;
  sửa hết rồi mở lại.
- Lỗi thiết kế và lỗi kho không chặn việc mở: chúng được in là cần kiểm, và cổng đầy đủ chạy lại khi file đã mở.
- `config/pbi-gate.json` › `strict_page` chọn trang kiểm nghiêm theo report.
- Phép kiểm: guard chạy `--open-check` cho mọi lệnh mở `.pbip` và chặn khi cổng thoát 1. Cổng không chạy được, quá 40 giây, hoặc
  không thấy lỗi làm hỏng file (thoát 0 · 2 · 3) ⇒ cho qua. Trần 40 giây giữ guard dưới thời hạn của host: guard bị cắt thì mọi
  chốt khác của lệnh đó cũng mất.

## Ví dụ

- Tình huống: vừa sửa model của một report, muốn mở Desktop để xem.
- ✗ Sai: mở thẳng file khi model còn một measure khai hai lần — Desktop từ chối, mất một lượt mở.
- ✓ Đúng: lệnh mở bị chặn kèm danh sách lỗi; sửa measure trùng, chạy lại, rồi mở.
