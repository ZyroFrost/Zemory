---
id: Rule_7
aka: 02-7
name: scope-only
version: 4
kind: judgment
from: _Store/01_RULES/Rule_Keys_07_ScopeOnly @v4 #01e3ceebea1f
---
# Rule_Keys_07_ScopeOnly Chỉ làm đúng việc được giao

- Đụng thứ ngoài yêu cầu ⇒ hỏi trước khi làm.
- Không sửa rồi báo sau.

## Ví dụ

- Tình huống: Người dùng nhờ sửa chính tả một tiêu đề cột trong báo cáo.
- ✗ Sai: Agent sửa tiêu đề, tiện tay "dọn" luôn câu truy vấn phía sau cho gọn; con số chênh lệch của cột đó đổi mà không ai được báo.
- ✓ Đúng: Chỉ sửa tiêu đề; thấy câu truy vấn có vấn đề thì nêu ra và hỏi có muốn sửa không, chưa được đồng ý thì không đụng.
