---
version: 4
lang: vi
---
# Rule_Gate_84_PbipOpenCheck — Open a .pbip only when nothing in it breaks the file

## Luật là gì
Trước khi mở một file `.pbip`, cổng kiểm mở của nó phải chạy. Lỗi làm hỏng file (Desktop từ chối mở, hoặc mở kèm "issues") chặn
việc mở tới khi sửa xong.

## Khi nào áp
- Một lệnh mở file `.pbip` (`Start-Process` · `Invoke-Item` · `start` · `& "…"`).

## Phải làm gì
1. Chạy `python scripts/pbi_gate.py <report> --open-check` trước khi mở.
2. Có lỗi làm hỏng file ⇒ không mở; sửa hết rồi mở lại.
3. Lỗi thiết kế và lỗi DW không chặn việc mở: chúng được in là cần kiểm, và cổng đầy đủ chạy lại khi file đã mở.
4. `config/pbi-gate.json` › `strict_page` chọn trang kiểm nghiêm theo từng report.

## Ví dụ
- Tình huống: vừa sửa model của một report, agent muốn mở Desktop để xem.
- ✗ Sai: mở thẳng file khi model còn một measure khai hai lần — Desktop từ chối, mất một lượt mở.
- ✓ Đúng: lệnh mở bị chặn kèm danh sách lỗi; sửa measure trùng, chạy lại, rồi mở.

## Máy kiểm
- Guard chạy `--open-check` cho mọi lệnh mở `.pbip` và chặn khi cổng thoát 1.
- Cổng không chạy được, quá 40 giây, hoặc không thấy lỗi làm hỏng file (thoát 0 · 2 · 3) ⇒ cho qua. Trần 40 giây giữ guard dưới
  thời hạn của host: guard bị cắt thì mọi chốt khác của lệnh đó cũng mất.
