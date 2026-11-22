---
id: Rule_12
aka: 02-12
name: soat-so-do-lai-tung
version: 1
kind: judgment
---
# Rule_Core_12_SoatSoDoLaiTung Soát sổ = đo lại từng mục.

- `02-12` **Soát sổ = đo lại từng mục.** Áp mọi lúc, không chờ chốt phiên: khi được hỏi còn gì chưa làm · soát
  sổ · plan/changelog tới đâu, và khi tự mở sổ. Mỗi mục `05_TODO` là một khẳng định trạng thái; file là nguồn của
  nội dung, không phải của sự thật hệ thống. Trước khi liệt kê · báo cáo · hỏi về một mục, chạy đủ BA nguồn —
  không chọn nguồn theo loại mục: ① **mã** (grep · đếm · đọc đúng dòng; không suy từ mô tả) · ② **Global Memory**
  (`zemory memory search --all`, lọc lời người giao việc — quyết định có thể nằm ở phiên hoặc repo khác) · ③ **chạy
  thật** (gọi endpoint · lệnh · UI thật · mở app nhìn tận mắt · log tiến trình đang chạy). Ba nguồn khớp mới kết
  luận; lệch ⇒ cái mới hơn thắng và ghi rõ cái cũ bị thay; không chạm được một nguồn ⇒ ghi "chưa xác minh được" kèm
  nguồn đã thử — không mặc định "chưa làm", không lấy hai nguồn còn lại làm đủ. Mục quá 7 ngày không ai đụng = nghi
  ngờ. Hỏi lại một việc đã chốt là lỗi. Máy đo: `zemory todo verify` (ký hiệu có thật · phép đo tự nêu còn đúng ·
  nguồn đổi sau khi ghi sổ; lệch ⇒ exit ≠ 0, nối được vào cổng).
