---
id: Rule_13
aka: 02-13
name: test-red
version: 7
kind: action
---
# Rule_Gate_13_TestRed Test và phép kiểm mới phải đỏ được

- Viết xong một test hoặc phép kiểm (test · script · công thức đối chiếu · bảng so số) ⇒ phá đúng đoạn mã hoặc thứ nó canh rồi chạy lại.
- Không đỏ ⇒ sửa test hoặc phép kiểm.
- Hai lỗ hay gặp: phép kiểm không chạy tới nhánh nguy hiểm; bản sao logic ở chỗ khác gánh thay.
- Xanh không phải bằng chứng (`.claude/skills/harness-audit/SKILL.md` luật 1).
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: Agent viết công thức đối chiếu để canh tổng doanh thu báo cáo khớp với kho.
- ✗ Sai: Chạy thấy khớp thì coi là xong; thực ra công thức đang so tổng với chính nó, đổi số ở kho cũng vẫn báo khớp.
- ✓ Đúng: Cố ý sửa sai một con số ở nguồn rồi chạy lại; phép đối chiếu phải báo lệch, không báo thì sửa phép đối chiếu.
