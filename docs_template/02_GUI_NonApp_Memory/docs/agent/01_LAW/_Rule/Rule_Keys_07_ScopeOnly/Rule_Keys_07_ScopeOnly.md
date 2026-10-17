---
id: Rule_7
aka: 02-7
name: scope-only
version: 5
kind: judgment
from: _Store/01_LAW/_Rule/Rule_Keys_07_ScopeOnly @v5 #ca61a81ec606
---
# Rule_Keys_07_ScopeOnly Chỉ làm đúng việc được giao

- Đụng thứ ngoài yêu cầu ⇒ hỏi trước khi làm. Không sửa rồi báo sau.
- Thêm vào sản phẩm thứ không ai yêu cầu (tính năng · cổng kiểm · bộ đếm · bộ đo · lớp cảnh báo · mục advisory) ⇒ hỏi một câu kèm đề xuất. Trước khi đề xuất, trả lời đủ ba câu: gỡ bớt được gì · gộp vào cái có sẵn được không · không có nó thì hỏng gì, đo được không. Không trả lời được câu cuối ⇒ không đề xuất.
- Không áp cho: việc được giao · sửa thứ đang hỏng · nghĩa vụ mà luật khác bắt buộc.

## Ví dụ

- Tình huống: người dùng nhờ sửa chính tả một tiêu đề cột trong báo cáo.
- ✗ Sai: sửa tiêu đề, tiện tay "dọn" câu truy vấn phía sau và thêm một cảnh báo "cho chắc"; con số của cột đổi mà không ai được báo.
- ✓ Đúng: chỉ sửa tiêu đề; thấy câu truy vấn có vấn đề thì nêu ra và hỏi có muốn sửa không; ý tưởng cảnh báo thì đề xuất kèm ba câu trả lời.
