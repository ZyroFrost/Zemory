---
id: Rule_40
aka: 02-40
name: memory-verify
version: 4
kind: judgment
from: _Store/01_RULES/Rule_Keys_40_MemoryVerify @v4 #0494b8652945
---
# Rule_Keys_40_MemoryVerify Global Memory là nguồn của phiên

- Khi đổi phiên · ghi docs · audit · báo cáo ⇒ dò Global Memory (`zemory memory search` · `digest <session>`).
- Đối chiếu từng mục với thứ thật để xác minh trước khi ghi hay khẳng định.
- Không ghi theo bản tóm tắt hay kết quả subagent chưa kiểm.
- Chi tiết: `.claude/skills/harness-session-close/SKILL.md` Bước 0.
