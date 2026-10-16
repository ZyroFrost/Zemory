---
id: Rule_53
aka: 02-53
name: no-history-rewrite
version: 3
kind: action
from: _Store/01_RULES/Rule_Gate_53_NoHistoryRewrite @v3 #4131fbda9acf
---
# Rule_Gate_53_NoHistoryRewrite Không phá lịch sử và việc chưa commit

- Chưa hỏi trước ⇒ không `--force`, không viết lại lịch sử đã push, không `reset --hard` hay `clean` lên việc chưa commit.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: thư mục làm việc có nhiều thay đổi lạ, agent muốn đưa về trạng thái sạch cho dễ làm.
- ✗ Sai: chạy reset cứng hoặc clean cả cây, xoá luôn phần việc chưa commit của người khác.
- ✓ Đúng: hỏi trước; xem thay đổi đó của ai, chỉ đụng đúng file của mình, khôi phục bằng cách ghi lại nội dung thay vì huỷ qua git.
