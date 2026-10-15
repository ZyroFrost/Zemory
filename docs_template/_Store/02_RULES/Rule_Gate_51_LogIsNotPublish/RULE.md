---
id: Rule_51
aka: 02-51
name: log-is-not-publish
version: 2
kind: action
---
# Rule_Gate_51_LogIsNotPublish Ghi sổ không phải publish

- Yêu cầu ghi changelog · commit · câu báo "xong rồi" KHÔNG phải là cho phép push.
- Không suy diễn quyền push từ các yêu cầu đó.
- Phép kiểm: cổng `guard`.
