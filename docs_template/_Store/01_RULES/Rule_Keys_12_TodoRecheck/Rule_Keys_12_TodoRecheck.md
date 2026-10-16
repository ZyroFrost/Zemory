---
id: Rule_12
aka: 02-12
name: todo-recheck
version: 5
kind: judgment
---
# Rule_Keys_12_TodoRecheck Soát sổ là đo lại từng mục

- Áp mọi lúc, không chờ chốt phiên: khi được hỏi còn gì chưa làm · soát sổ · plan/changelog tới đâu, và khi tự mở sổ.
- Mỗi mục `05_TODO` là một khẳng định trạng thái; file là nguồn của nội dung, không phải của sự thật hệ thống.
- Trước khi liệt kê · báo cáo · hỏi về một mục ⇒ chạy đủ BA nguồn, không chọn nguồn theo loại mục:
  - ① **nguồn / mã**: mở đúng file · grep · đếm đúng dòng/cột · chạy lại truy vấn; không suy từ mô tả.
  - ② **lịch sử quyết định**: có CLI `zemory` ⇒ `zemory memory search --all` (Global Memory), lọc các lượt giao việc và phê duyệt, vì quyết định có thể nằm ở phiên hoặc repo khác; không có CLI ⇒ đọc `docs/agent/archive/`.
  - ③ **chạy thật**: gọi endpoint · lệnh · UI thật · mở app nhìn tận mắt · đọc log tiến trình đang chạy · mở chính bản giao · làm mới dữ liệu rồi đối chiếu số.
- Ba nguồn khớp mới kết luận.
- Lệch ⇒ cái mới hơn thắng, ghi rõ cái cũ bị thay.
- Không chạm được một nguồn ⇒ ghi "chưa xác minh được" kèm nguồn đã thử; không mặc định "chưa làm", không lấy hai nguồn còn lại làm đủ.
- Mục quá 7 ngày không ai đụng ⇒ coi là nghi ngờ.
- Hỏi lại một việc đã chốt là lỗi.
- Máy đo (khi có CLI): `zemory todo verify` kiểm ký hiệu mục nêu có thật không · phép đo mục tự nêu còn đúng không · nguồn có đổi sau khi dòng sổ được viết không; exit ≠ 0 khi lệch, nối được vào cổng.

## Ví dụ

- Tình huống: Người giao việc hỏi "danh sách việc còn gì chưa làm?".
- ✗ Sai: Agent chép lại các dòng còn đánh dấu chưa xong trong sổ; hai việc thực ra đã chạy từ tuần trước, một việc đã bị huỷ ở phiên khác.
- ✓ Đúng: Với từng mục, kiểm mã hoặc file thật, tra lịch sử quyết định, và chạy thử thật; ba nguồn khớp mới báo, nguồn nào không chạm được thì ghi rõ là chưa xác minh.
