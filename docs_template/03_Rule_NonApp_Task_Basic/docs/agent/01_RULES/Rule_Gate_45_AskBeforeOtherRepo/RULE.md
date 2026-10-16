---
id: Rule_45
aka: 02-45
name: ask-before-other-repo
version: 2
kind: action
from: _Store/01_RULES/Rule_Gate_45_AskBeforeOtherRepo @v2 #0a6138fa8c86
---
# Rule_Gate_45_AskBeforeOtherRepo Cần đụng dự án khác thì dừng và hỏi trước

- Thấy cần đụng dự án hoặc thư mục khác ⇒ dừng, hỏi trước. Câu hỏi nêu rõ định làm gì, ở đâu, vì sao.
- Chỉ làm khi được chấp thuận trong phiên.
- Lý do: nơi khác có thể đang có agent hoặc phiên khác làm việc; đụng chéo gây xung đột dữ liệu.
- Phép kiểm: cổng `guard`.
