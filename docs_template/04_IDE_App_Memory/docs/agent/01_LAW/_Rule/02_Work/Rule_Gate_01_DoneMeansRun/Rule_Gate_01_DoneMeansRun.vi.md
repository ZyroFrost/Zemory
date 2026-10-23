---
version: 11
lang: vi
---
# Rule_Gate_01_DoneMeansRun — "Done" means it really ran

## Luật là gì
Agent chỉ báo "xong" khi việc đã chạy thật và đã đo. Riêng cổng xanh không phải bằng chứng.

## Khi nào áp
- Sắp báo một việc là xong.

## Phải làm gì
Chỉ báo "xong" khi đủ ba điều:
1. Có sửa mã ⇒ sau lần sửa cuối đã chạy phép kiểm của repo (gate · test · type check · lint · lệnh kiểm khai trong marker).
2. Có viết phép kiểm mới (test · script · công thức đối chiếu · bảng so số) ⇒ đã phá đúng thứ nó canh và thấy nó báo đỏ; vẫn
   xanh ⇒ sửa phép kiểm. Hai lỗ hay gặp: phép kiểm không chạy tới nhánh nguy hiểm; một bản sao logic ở chỗ khác gánh thay.
3. Thứ vừa dựng được dùng ở máy khác (lớp lưu · chỉ mục · bí mật · tài sản giao đi) ⇒ đã khai đường sang máy đó và đo ở đầu nhận.

Thiếu một điều ⇒ việc còn dở, kể cả khi cổng xanh. Cách phá mã: `.claude/skills/harness-audit/SKILL.md`. Đường sang máy thứ hai:
`.claude/skills/harness-sync-path/SKILL.md`.

## Ví dụ
- Tình huống: agent viết công thức đối chiếu để canh tổng doanh thu báo cáo khớp với DW.
- ✗ Sai: chạy lần đầu thấy khớp thì báo xong; thực ra công thức đang so tổng với chính nó, đổi số ở DW vẫn báo khớp.
- ✓ Đúng: cố ý sửa sai một con số ở nguồn rồi chạy lại; phép đối chiếu phải báo lệch, không báo thì sửa công thức rồi mới báo xong.

## Máy kiểm
- Hook kết thúc lượt chặn lượt có sửa mã mà không chạy lệnh kiểm nào.
- Hook nhắc một lần mỗi phiên khi ghi file test mới và khi mã tạo bảng lưu mới.
