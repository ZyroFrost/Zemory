---
id: Rule_13
aka: 02-13
name: test-red
version: 4
kind: action
---
# Rule_Gate_13_TestRed Test và phép kiểm mới phải đỏ được

- Viết xong một test hoặc phép kiểm (test · script · công thức đối chiếu · bảng so số) ⇒ phá đúng đoạn mã hoặc thứ nó canh rồi chạy lại.
- Không đỏ ⇒ sửa test hoặc phép kiểm.
- Hai lỗ hay gặp: phép kiểm không chạy tới nhánh nguy hiểm; bản sao logic ở chỗ khác gánh thay.
- Xanh không phải bằng chứng (`.claude/skills/audit/SKILL.md` luật 1).
- Phép kiểm: cổng `guard`.
