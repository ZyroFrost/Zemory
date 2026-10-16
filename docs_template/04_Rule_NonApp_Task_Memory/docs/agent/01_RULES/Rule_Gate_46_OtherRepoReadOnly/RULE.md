---
id: Rule_46
aka: 02-46
name: other-repo-read-only
version: 2
kind: action
from: _Store/01_RULES/Rule_Gate_46_OtherRepoReadOnly @v2 #3f6499d80d20
---
# Rule_Gate_46_OtherRepoReadOnly Dự án khác: đọc được, ghi cấm mặc định

- Đọc tham khảo (read-only) dự án khác để trả lời câu hỏi ⇒ được.
- Mọi thao tác GHI vào dự án khác ⇒ cấm mặc định.
- Phép kiểm: cổng `guard`.
