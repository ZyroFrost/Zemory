---
id: Rule_38
aka: 02-38
name: todo-door
version: 9
kind: action
from: _Store/01_LAW/_Rule/Rule_Gate_38_TodoDoor @v9 #5510fa5ac7ac
---
# Rule_Gate_38_TodoDoor Sổ việc `04_TODO`: cửa vào và cửa ra

- Luật duy nhất cho cửa vào và cửa ra của `04_TODO`; file khác dẫn chiếu, không đặt luật sổ riêng.
- Cửa vào: `04_TODO` chỉ chứa việc chưa làm liền được. Việc trong tầm tay ⇒ làm ngay, ghi `05_CHANGES`. Không tự thêm mục; thấy cần ⇒ hỏi một câu kèm đề xuất, chỉ ghi khi được chấp thuận. Đề xuất không đậu vào sổ để chờ duyệt.
- Cửa ra: một mục xong ⇒ đóng ngay trong cùng lượt: đo lại theo `Rule_Keys_11_VerifyClaims` · ghi `05_CHANGES` · xoá khỏi `04_TODO` (hoặc `zemory archive`). Dấu máy dời được: `- [x]` · `- ✅` · `N. [x]` · tiêu đề `## [x]` (dời cả khối khi khối không còn `[ ]`/`[~]`). Viết "xong" kiểu khác thì máy không thấy. `archive` lúc chốt phiên là lưới vét cuối, không phải chỗ để dồn.
- Lối đúng (cửa ra): đóng mục bằng dấu máy đọc được rồi `zemory archive`. Cửa vào không có lối vòng: hỏi, được đồng ý mới tạo cờ `.allow-todo`.
- Phép kiểm: guard chặn mục mở mới khi chưa có cờ `.allow-todo`.

## Ví dụ

- Tình huống: quản lý vừa chốt một quy định mới; đưa vào file luật chỉ mất vài phút.
- ✗ Sai: ghi vào sổ việc "chờ đưa vào luật" rồi báo xong; sổ dài thêm, quy định chưa có hiệu lực.
- ✓ Đúng: làm ngay (sửa harness được duyệt theo `Rule_Gate_79_HarnessEdit`), ghi changelog; sổ chỉ giữ việc thật sự chưa làm kịp.
