---
id: Rule_59
aka: 02-59
name: read-first
version: 9
kind: action
code: 01_Harness
generated: [guard.cjs, policy.json, precommit-guard.cjs, 02-59_read-first.cjs]
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_59_ReadFirst @v9 #680640681da7
---
# Rule_Gate_59_ReadFirst Đọc trước khi ghi

- Trước lần ghi đầu tiên của phiên ⇒ đọc trọn phần bắt đọc: luật `Core` trong `01_LAW/_Rule` · mọi `Cons.md` đã viết và điều riêng trong `01_LAW/_Cons` · cả `04_TODO`.
- Đọc thêm theo việc: ghi vào `tasks/<case>/` ⇒ spec và mẫu mail của case đó · tạo thư mục mới ⇒ `02_STRUCTURE` · việc trúng trigger skill ⇒ skill đó (`Rule_Gate_63_SkillTrigger`).
- `grep` · `head` · đọc lướt không tính là đã đọc.
- Lối đúng: Read trọn các file câu chặn liệt kê.
- Phép kiểm: chốt read-first chặn lần ghi tới khi đủ; không có cờ vượt. Cơ chế (so theo dòng · nén context · khai thêm `readFirst` · fail-open): tài liệu guard ở `02_STRUCTURE/_Host/IDE`.

## Ví dụ

- Tình huống: phiên mới mở repo báo cáo, được giao sửa mẫu email gửi hằng tuần.
- ✗ Sai: mở file mẫu rồi sửa ngay, chưa đọc luật lõi, hiến pháp, sổ việc và đặc tả của case.
- ✓ Đúng: đọc đủ phần bắt đọc và đặc tả case rồi mới ghi; chưa đọc thì lần ghi bị chặn và câu chặn chỉ rõ còn thiếu gì.
