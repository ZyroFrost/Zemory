---
id: Rule_38
aka: 02-38
name: todo-door
version: 7
kind: action
from: _Store/01_RULES/Rule_Gate_38_TodoDoor @v7 #baa6105a0355
---
# Rule_Gate_38_TodoDoor Sổ việc `05_TODO`: cửa vào và cửa ra

- Đây là luật duy nhất cho cửa vào và cửa ra của `05_TODO`. File khác dẫn chiếu `Rule_Gate_38_TodoDoor`, không đặt luật sổ riêng.
- **Cửa vào.** Không tự thêm mục `05_TODO` · luật · cổng kiểm · bộ đếm · bộ đo · lớp cảnh báo · mục advisory.
  - Thấy cần ⇒ hỏi một câu kèm đề xuất trong phiên; chỉ ghi khi được chấp thuận, và ghi vào đúng file (`01` · `02` · `05`).
  - Đề xuất không "đậu" vào sổ để chờ duyệt.
  - Ngưỡng: thực sự quan trọng. Trước khi thêm, trả lời đủ ba câu: gỡ bớt được gì · gộp vào cái có sẵn được không · không có nó thì hỏng gì, đo được không. Không trả lời được câu cuối ⇒ không làm.
  - Không áp cho: việc được giao · sửa thứ đang hỏng · nghĩa vụ mà luật sẵn có bắt buộc.
- **Cửa ra.** Một mục xong ⇒ đóng ngay trong cùng lượt, không đợi chốt phiên: đo lại theo `Rule_Keys_12_TodoRecheck` · ghi `06_CHANGES` · xoá khỏi `05_TODO` (hoặc chạy `zemory archive`).
  - Dấu máy dời được: `- [x]` · `- ✅` · `N. [x]` · tiêu đề `## [x]` (dời cả khối khi khối không còn `[ ]`/`[~]`).
  - `✅` trên mục đánh số hoặc trên tiêu đề, hoặc khối còn việc mở ⇒ `archive` chỉ báo, agent tự xử lý.
  - Viết "xong" kiểu khác (gạch ngang · chữ XONG) thì máy không thấy.
  - `archive` lúc chốt phiên là lưới vét cuối, không phải chỗ để dồn.
- Phép kiểm: cổng `guard`.
