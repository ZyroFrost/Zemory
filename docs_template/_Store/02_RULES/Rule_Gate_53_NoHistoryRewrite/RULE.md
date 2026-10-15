---
id: Rule_53
aka: 02-53
name: no-history-rewrite
version: 2
kind: action
---
# Rule_Gate_53_NoHistoryRewrite Không phá lịch sử và việc chưa commit

- Chưa hỏi trước ⇒ không `--force`, không viết lại lịch sử đã push, không `reset --hard` hay `clean` lên việc chưa commit.
- Phép kiểm: cổng `guard`.
