---
id: Rule_84
name: pbip-open-check
version: 3
kind: action
code: 05_Domain
---
# Rule_Gate_84_PbipOpenCheck — Open a .pbip only when nothing in it breaks the file

## What
Before a `.pbip` file is opened, its open check runs. Errors that break the file (Desktop refuses to open it, or opens it with
"issues") block the opening until they are fixed.

## When
- A command opens a `.pbip` file (`Start-Process` · `Invoke-Item` · `start` · `& "…"`).

## Do
1. Run `python scripts/pbi_gate.py <report> --open-check` before opening.
2. Errors that break the file ⇒ do not open; fix them all, then open again.
3. Design errors and DW errors do not block the opening: they are printed as to-check, and the full gate runs again once the file
   is open.
4. `config/pbi-gate.json` › `strict_page` chooses the page checked strictly, per report.

## Example
- Situation: the model of a report was just edited and the agent wants to open Desktop to look.
- ✗ Wrong: open the file straight away while the model still declares one measure twice — Desktop refuses, one opening wasted.
- ✓ Right: the open command is blocked with the list of errors; fix the duplicate measure, run again, then open.

## Check
- The guard runs `--open-check` for every command that opens a `.pbip` and blocks when the gate exits 1.
- The gate cannot run, takes over 40 seconds, or finds no file-breaking error (exit 0 · 2 · 3) ⇒ pass. The 40-second cap keeps the
  guard under the host's time limit: a guard that is cut off loses every other check of that command too.

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

## Links · Liên kết
- Implements · Thi hành: `Skill_PBI_Pbip` — the report gate and how to fix what it finds · cổng báo cáo và cách sửa lỗi nó tìm ra
