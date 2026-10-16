---
id: Rule_53
aka: 02-53
name: no-history-rewrite
version: 2
kind: action
from: _Store/01_RULES/Rule_Gate_53_NoHistoryRewrite @v2 #f48200fd1339
---
# Rule_Gate_53_NoHistoryRewrite Không phá lịch sử và việc chưa commit

- Chưa hỏi trước ⇒ không `--force`, không viết lại lịch sử đã push, không `reset --hard` hay `clean` lên việc chưa commit.
- Phép kiểm: cổng `guard`.
