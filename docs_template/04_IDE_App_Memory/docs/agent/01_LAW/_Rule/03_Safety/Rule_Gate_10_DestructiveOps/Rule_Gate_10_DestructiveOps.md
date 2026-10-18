---
id: Rule_10
aka: 02-10
name: destructive-ops
version: 7
kind: action
code: 03_Safety
from: _Store/01_LAW/_Rule/03_Safety/Rule_Gate_10_DestructiveOps @v7 #3026ae86ba04
---
# Rule_Gate_10_DestructiveOps — Destroying anything needs approval; original inputs are read-only

## What
Deleting or overwriting is treated as something that cannot be undone: the agent names the target and the reason, and waits for
approval before doing it. Original inputs received from outside are only read, never changed.

## When
- About to delete a file · code · a function · a command · a feature · a delivered product (deliverable · measure) · a script ·
  docs content · a folder.
- About to overwrite something that exists.
- Working with an original input (a file someone sent · a pull from a source).
- Retiring a law.

## Do
1. Overwriting is deleting too: adding a feature ⇒ extend the old one, do not replace it; replace only when the request says so.
2. Before deleting or overwriting ⇒ name the target and the reason, wait for approval, then do it; never do it and report after.
3. Something unused or redundant ⇒ propose it; never delete it on your own. Adding · extending needs no approval; deleting ·
   narrowing always does.
4. An original input ⇒ read-only: no editing, overwriting or deleting; clean a copy instead. A lost input is gone for good and has
   to be asked for again. Where originals and intermediate copies live: the slots of `02_STRUCTURE`.
5. Retiring a law ⇒ keep its number and mark it *retired*.

## Example
- Situation: the sales team sends the month's sales Excel with a few badly formatted columns; the folder also holds three old
  files that look unused.
- ✗ Wrong: fix the original file and save over it, delete the three old files and write "cleaned up spare files"; one of them is
  a copy another department opens every week.
- ✓ Right: copy the original to the working place to clean it, keep the original as is; list the three old files with reasons and
  wait for approval of each before deleting.

## Check
- The guard blocks a delete command in the repo (`rm` · `del` · `Remove-Item` · `git rm` · a delete inside a script) and an edit
  that removes a law number, until the flag `.allow-delete` exists; temporary folders are exempt.
- Original inputs: the marker key `protected` (globs, for example `data/*/01_raw`).

## Luật là gì
Xoá hay ghi đè đều coi là không đảo được: agent nêu đối tượng và lý do, chờ chấp thuận rồi mới làm. Đầu vào gốc nhận từ bên ngoài
chỉ được đọc, không bao giờ bị sửa.

## Khi nào áp
- Sắp xoá file · code · hàm · lệnh · chức năng · sản phẩm giao đi (deliverable · measure) · script · nội dung docs · thư mục.
- Sắp ghi đè một thứ đang có.
- Làm việc với đầu vào gốc (file được gửi tới · bản kéo từ nguồn).
- Bãi bỏ một luật.

## Phải làm gì
1. Ghi đè cũng là xoá: thêm chức năng ⇒ mở rộng cái cũ, không thay cái cũ; chỉ thay khi yêu cầu nói rõ.
2. Trước khi xoá hoặc ghi đè ⇒ nêu đối tượng và lý do, chờ chấp thuận rồi mới làm; không làm rồi báo sau.
3. Thứ dư thừa hoặc không còn dùng ⇒ đề xuất; không tự xoá. Bổ sung · mở rộng không cần xác nhận; xoá · thu hẹp luôn cần.
4. Đầu vào gốc ⇒ chỉ đọc: không sửa, không ghi đè, không xoá; làm sạch trên bản chép. Mất đầu vào là mất hẳn, phải xin lại bên
   gửi. Chỗ đặt đầu vào gốc và bản trung gian: các slot của `02_STRUCTURE`.
5. Bãi bỏ một luật ⇒ giữ số, ghi *bãi bỏ*.

## Ví dụ
- Tình huống: bên kinh doanh gửi file Excel doanh số tháng có vài cột sai định dạng; trong thư mục còn ba file cũ có vẻ không ai
  dùng.
- ✗ Sai: sửa thẳng file gốc rồi lưu đè, xoá luôn ba file cũ và ghi "đã dọn file thừa"; một file là bản phòng khác vẫn mở hằng tuần.
- ✓ Đúng: chép file gốc sang chỗ xử lý để làm sạch, giữ nguyên bản gốc; liệt kê ba file cũ kèm lý do, chờ đồng ý từng file rồi mới
  xoá.

## Máy kiểm
- Guard chặn lệnh xoá file trong repo (`rm` · `del` · `Remove-Item` · `git rm` · xoá trong script) và lần sửa làm mất số luật, khi
  chưa có cờ `.allow-delete`; thư mục tạm được miễn.
- Đầu vào gốc: khoá `protected` của marker (glob, ví dụ `data/*/01_raw`).

## Links · Liên kết
- Repo declares · Repo khai: `Cons_Gate_10_ReadOnlySources` — the repo declares its read-only sources · repo khai nguồn chỉ đọc
- Related · Liên quan: `Rule_Keys_61_HookSafetyNet` — a flag lets one approved action through · cờ cho qua đúng một việc đã duyệt
