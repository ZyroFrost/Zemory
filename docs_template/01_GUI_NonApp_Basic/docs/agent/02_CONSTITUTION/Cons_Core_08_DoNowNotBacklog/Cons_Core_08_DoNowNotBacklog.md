---
id: Cons_8
aka: 01-8
name: do-now-not-backlog
version: 5
kind: judgment
applies: [App, NonApp]
from: _Store/02_CONSTITUTION/Cons_Core_08_DoNowNotBacklog @v5 #93874aa73d21
---
# Cons_Core_08_DoNowNotBacklog Làm liền được thì làm, không đẩy vào backlog

- `05_TODO` chỉ dành cho việc chưa làm liền được; việc trong tầm tay thì làm rồi ghi `06_CHANGES`.
- Lý do: sổ việc phình vì thói "đề xuất rồi chờ" sẽ chôn mất thứ thật sự đang chặn.

> Điều GỢI Ý: đưa ra một lần lúc dựng repo. Giữ thì nó là điều của hiến pháp repo; không cần thì xoá folder này — `sync` không thêm lại và không sửa điều hiến pháp.

## Ví dụ

- Tình huống: Quản lý vừa chốt một quy định mới cho dự án. Việc đưa nó vào file luật chỉ mất vài phút.
- ✗ Sai: Agent ghi vào danh sách việc cần làm "chờ đưa vào luật", rồi báo xong. Danh sách việc dài thêm một dòng không cần thiết, còn quy định thì chưa có hiệu lực.
- ✓ Đúng: Làm ngay: ghi quy định vào file luật, rồi ghi vào nhật ký thay đổi. Danh sách việc cần làm chỉ giữ những việc thật sự chưa làm kịp.
