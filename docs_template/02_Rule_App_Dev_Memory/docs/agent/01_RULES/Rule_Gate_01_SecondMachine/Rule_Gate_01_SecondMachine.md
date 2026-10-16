---
id: Rule_1
aka: 02-1
name: second-machine
version: 6
kind: action
from: _Store/01_RULES/Rule_Gate_01_SecondMachine @v6 #f54d6b8ab357
---
# Rule_Gate_01_SecondMachine Xong là có đường sang máy thứ hai, đã đo

- Thứ vừa dựng (lớp lưu · chỉ mục · bí mật · tài sản giao đi) phải khai được đường sang máy khác, và đường đó phải được đo.
- Chưa khai đường hoặc chưa đo ⇒ việc còn dở, kể cả khi cổng xanh.
- Quy trình: `.claude/skills/harness-sync-path/SKILL.md`.
- Phép kiểm: cổng `guard`.
