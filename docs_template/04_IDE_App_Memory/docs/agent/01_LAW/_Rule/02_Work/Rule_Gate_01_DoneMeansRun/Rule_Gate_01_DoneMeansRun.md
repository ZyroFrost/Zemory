---
id: Rule_1
aka: 02-1
name: done-means-run
version: 9
kind: action
code: 02_Work
from: _Store/01_LAW/_Rule/02_Work/Rule_Gate_01_DoneMeansRun @v9 #c9f7494a79ff
---
# Rule_Gate_01_DoneMeansRun "Xong" là đã chạy thật

- Chỉ báo "xong" khi đủ ba điều:
  1. Sửa mã ⇒ sau lần sửa cuối đã chạy phép kiểm của repo (gate · test · type check · lint · lệnh kiểm khai trong marker).
  2. Phép kiểm mới viết (test · script · công thức đối chiếu · bảng so số) ⇒ đã phá đúng thứ nó canh và thấy nó báo đỏ; không đỏ ⇒ sửa phép kiểm. Hai lỗ hay gặp: phép kiểm không chạy tới nhánh nguy hiểm; bản sao logic ở chỗ khác gánh thay.
  3. Thứ vừa dựng được dùng ở máy khác (lớp lưu · chỉ mục · bí mật · tài sản giao đi) ⇒ đã khai đường sang máy đó và đo ở đầu nhận.
- Thiếu một điều ⇒ việc còn dở, kể cả khi cổng xanh. Xanh không phải bằng chứng.
- Cách phá mã: `.claude/skills/harness-audit/SKILL.md`. Đường sang máy thứ hai: `.claude/skills/harness-sync-path/SKILL.md`.
- Lối đúng: chạy lệnh kiểm của repo sau lần sửa cuối · phá thứ phép kiểm canh rồi chạy lại · đo ở máy nhận, rồi mới báo xong.
- Phép kiểm: hook kết thúc lượt chặn lượt có sửa mã mà không chạy lệnh kiểm nào; hook nhắc một lần mỗi phiên khi ghi file test mới và khi mã tạo bảng lưu mới.

## Ví dụ

- Tình huống: agent viết công thức đối chiếu để canh tổng doanh thu báo cáo khớp với kho.
- ✗ Sai: chạy thấy khớp thì báo xong; thực ra công thức đang so tổng với chính nó, đổi số ở kho cũng vẫn báo khớp.
- ✓ Đúng: cố ý sửa sai một con số ở nguồn rồi chạy lại; phép đối chiếu phải báo lệch, không báo thì sửa phép đối chiếu rồi mới báo xong.
