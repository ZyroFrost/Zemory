---
version: 1
lang: vi
---
# Rule_Gate_71_LogNeverDeleted — A log is never deleted; old log is only compressed

## Luật là gì
Mọi log đều được giữ: file log của app, bảng log trong cơ sở dữ liệu, log hệ thống của máy chủ, lịch sử lượt chạy, nhật ký thao
tác, các dòng log một trang đang hiện từ bộ nhớ. Không ai xoá, làm rỗng, cắt bớt hay xoay vòng bỏ một log, kể cả admin, có duyệt
cũng không. Log cũ chiếm chỗ thì nén, không bao giờ vứt.

## Khi nào áp
- Sắp xoá, dời đi hay làm rỗng một file log hoặc thư mục log.
- Sắp viết SQL xoá, cắt bớt hay bỏ dòng hoặc bảng của một log.
- Sắp đặt xoay vòng log hay giới hạn thời hạn giữ (logrotate, journald, file log riêng của app).
- Sắp làm nút, lệnh hay route API xoá một log.
- Người dùng nhờ xoá hay dọn một log.

## Phải làm gì
1. Không nút, lệnh hay route API nào xoá log; trang log chỉ đọc.
2. Bảng log chỉ ghi thêm: không UPDATE, DELETE, TRUNCATE hay DROP, và login của app bị từ chối các quyền đó; dòng sai thì ghi
   một dòng mới đính chính.
3. Log cần chỗ ⇒ nén: gzip file đã đóng, nén trang hoặc partition nén của bảng, journald `Compress=yes` và không vacuum. Xoay
   vòng thì giữ mọi file (logrotate `rotate -1` cùng `compress`); không giới hạn dung lượng hay tuổi nào làm rơi dòng.
4. Log chỉ nằm trong bộ nhớ, hoặc ở nơi tự bỏ dòng cũ ⇒ ghi thêm vào một nơi giữ được.
5. Người dùng nhờ xoá log ⇒ nêu luật này và đề xuất nén.
6. File không phải log (output nháp, báo cáo test) không đặt tên `*.log`, để dọn được (`Rule_Gate_04_ScratchFiles`).

## Ví dụ
- Tình huống: trang Nhật ký của một app có nút "Xoá log", và journal của máy chủ tự bỏ dòng cũ khi đầy.
- ✗ Sai: giữ nút cho admin và đặt `SystemMaxUse=500M` để đĩa không bao giờ đầy.
- ✓ Đúng: bỏ nút cùng route DELETE của nó; ghi dòng log của app vào một bảng log chỉ ghi thêm; nén file journal cũ thay vì đặt
  trần cho journal.

## Máy kiểm
- Hook guard, không cờ nào cho qua: lệnh shell xoá hay làm rỗng một log (`rm` · `del` · `Remove-Item` · `unlink` · `git rm` ·
  `truncate` · `Clear-Content` trên file `*.log`, thư mục `logs/` hay `/var/log/`), `journalctl --vacuum-*`, hoặc SQL `DELETE` ·
  `TRUNCATE` · `DROP TABLE` trên bảng log (`Log_*`, `*_log`) bị chặn.
- Cùng hook chặn một lần sửa file thêm SQL như vậy, một route DELETE trên đường log, một giới hạn journald (`SystemMaxUse` ·
  `SystemMaxFiles` · `MaxRetentionSec` · `RuntimeMaxUse` · `RuntimeMaxFiles`) hay số file / tuổi của logrotate (`rotate N` với
  N ≥ 0 · `maxage`). File test không bị xét: test được phép chứng minh cơ sở dữ liệu từ chối lệnh xoá.
- Cho qua: nén (`gzip`, `DATA_COMPRESSION`), đọc, ghi thêm, `DENY DELETE ON` một bảng log, trigger từ chối lệnh xoá, xoá file
  không phải log.
- Ví dụ cổng trong `gate.json` chạy lại từng loại bị chặn và từng loại cho qua.
