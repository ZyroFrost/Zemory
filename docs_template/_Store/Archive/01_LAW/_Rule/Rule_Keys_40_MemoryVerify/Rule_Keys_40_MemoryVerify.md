---
id: Rule_40
aka: 02-40
name: memory-verify
version: 5
kind: judgment
---
# Rule_Keys_40_MemoryVerify Global Memory là nguồn của phiên

- Khi đổi phiên · ghi docs · audit · báo cáo ⇒ dò Global Memory (`zemory memory search` · `digest <session>`).
- Đối chiếu từng mục với thứ thật để xác minh trước khi ghi hay khẳng định.
- Không ghi theo bản tóm tắt hay kết quả subagent chưa kiểm.
- Chi tiết: `.claude/skills/harness-session-close/SKILL.md` Bước 0.

## Ví dụ

- Tình huống: phiên sắp hết ngữ cảnh, cần ghi sổ để phiên sau làm tiếp.
- ✗ Sai: viết changelog theo bản tóm tắt còn nhớ và theo báo cáo của subagent — sót hai việc, một việc ghi "xong" nhưng thật ra chưa chạy.
- ✓ Đúng: dò Global Memory của phiên, đối chiếu từng mục với mã, số đo và trạng thái thật, rồi mới ghi.
